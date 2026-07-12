/**
 * providers.json 读写层 (管理端专用)
 *
 * - 读: 直接 parse
 * - 写: 先写入 tmp 文件, 再原子 rename, 避免半写状态
 * - 简单的 in-memory mutex 防止同一进程并发写覆盖
 * - 写入后立即让 config-loader 重新加载
 *
 * apiKey 保护:
 *   - listProviders() 只返回 apiKeyMasked ("sk-****xxxx"), 不含明文
 *   - 内部 helper: 从原始条目里读明文用于 upsert 时保留
 */

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { logError } from "../utils";

interface ProviderEntry {
  id?: string;
  name: string;
  type: string;
  endpoint: string;
  model: string;
  apiKey: string;
  enabled?: boolean;
  is_maintenance?: boolean;
  groupName?: string;
  category?: string;
  vendor?: string;
  service?: string;
  models?: string[];
  priceRatio?: string;
  priceHint?: string;
  iconKey?: string;
  baselineDays?: number;
  disguise?: string;
  requestHeaders?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ProviderSummary {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  model: string;
  models: string[];
  apiKeyMasked: string;
  enabled: boolean;
  is_maintenance: boolean;
  groupName: string | null;
  category: string | null;
  vendor: string | null;
  service: string | null;
  priceRatio: string | null;
  priceHint: string | null;
  iconKey: string | null;
  baselineDays: number | null;
  disguise: string | null;
}

function resolvePath(): string {
  const raw = process.env.STATUS_PROVIDERS_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), "data", "providers.json");
}

let writeMutex: Promise<void> = Promise.resolve();

function readRaw(): ProviderEntry[] {
  const p = resolvePath();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ProviderEntry[];
  } catch (err) {
    logError("providers.json 解析失败", err);
    return [];
  }
}

function writeRaw(entries: ProviderEntry[]): void {
  const p = resolvePath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${p}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(tmp, p);
  // 尽力设置严格权限
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    /* 非 POSIX 平台忽略 */
  }
}

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeMutex;
  let release: () => void;
  writeMutex = new Promise<void>((r) => (release = r));
  try {
    await prev;
    return await fn();
  } finally {
    release!();
  }
}

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}

function toSummary(entry: ProviderEntry): ProviderSummary {
  return {
    id: entry.id || "",
    name: entry.name,
    type: entry.type,
    endpoint: entry.endpoint,
    model: entry.model,
    models: entry.models ?? [entry.model],
    apiKeyMasked: maskKey(entry.apiKey),
    enabled: entry.enabled !== false,
    is_maintenance: Boolean(entry.is_maintenance),
    groupName: entry.groupName ?? null,
    category: entry.category ?? null,
    vendor: entry.vendor ?? null,
    service: entry.service ?? null,
    priceRatio: entry.priceRatio ?? null,
    priceHint: entry.priceHint ?? null,
    iconKey: entry.iconKey ?? null,
    baselineDays: typeof entry.baselineDays === "number" ? entry.baselineDays : null,
    disguise: entry.disguise ?? null,
  };
}

/* ============================================================
 * 公开 API
 * ============================================================ */

export function listProviders(): ProviderSummary[] {
  return readRaw().map(toSummary);
}

/**
 * 用 name+groupName+model 定位一个 provider
 * (id 是运行时派生的, 管理端来源侧不总是有)
 */
function findIdx(entries: ProviderEntry[], key: { name: string; groupName?: string | null; model: string }): number {
  return entries.findIndex(
    (e) =>
      e.name === key.name &&
      (e.groupName ?? null) === (key.groupName ?? null) &&
      e.model === key.model
  );
}

export interface UpsertInput {
  originalKey?: { name: string; groupName?: string | null; model: string };
  entry: Omit<ProviderEntry, "id"> & { apiKey?: string };
}

/**
 * 新增或更新一条 provider
 *
 * - originalKey 为空 = 新增
 * - originalKey 非空 = 更新, 若 entry.apiKey 为空则保留原 key
 */
export async function upsertProvider(input: UpsertInput): Promise<ProviderSummary> {
  return withLock(async () => {
    const entries = readRaw();
    let existing: ProviderEntry | null = null;
    let idx = -1;

    if (input.originalKey) {
      idx = findIdx(entries, input.originalKey);
      if (idx >= 0) existing = entries[idx];
    }

    const apiKey = input.entry.apiKey?.trim();
    const merged: ProviderEntry = {
      ...existing,
      ...input.entry,
      apiKey: apiKey || existing?.apiKey || "",
    };

    if (idx >= 0) {
      entries[idx] = merged;
    } else {
      entries.push(merged);
    }

    writeRaw(entries);
    invalidateConfigCache();
    return toSummary(merged);
  });
}

export async function deleteProvider(key: {
  name: string;
  groupName?: string | null;
  model: string;
}): Promise<boolean> {
  return withLock(async () => {
    const entries = readRaw();
    const idx = findIdx(entries, key);
    if (idx < 0) return false;
    entries.splice(idx, 1);
    writeRaw(entries);
    invalidateConfigCache();
    return true;
  });
}

export async function patchApiKey(
  key: { name: string; groupName?: string | null; model: string },
  newApiKey: string
): Promise<boolean> {
  return withLock(async () => {
    const entries = readRaw();
    const idx = findIdx(entries, key);
    if (idx < 0) return false;
    entries[idx] = { ...entries[idx], apiKey: newApiKey };
    writeRaw(entries);
    invalidateConfigCache();
    return true;
  });
}

/* ============================================================
 * 后台改动 -> 缓存失效 + 立即触发一次探测
 *
 * 前端每 pollIntervalMs 秒会用 forceFresh 拉一次数据. 这里只需要:
 *   1) config-loader 重读, 拿到最新 provider 列表 (含新增/修改)
 *   2) 触发一次探测: 新 provider 立刻有一条历史
 *   3) 清 dashboard 聚合缓存: 下一次前端请求就返回新数据
 *
 * 不清 ping cache — 保留 lastPingAt 阻止前端 forceFresh 触发的即时探测
 * 与我们这里触发的探测撞车 (60s 内只探一次)
 * ============================================================ */
async function invalidateConfigCache() {
  try {
    // 1) 重新解析 providers.json (会刷新 config-loader 内部缓存 + registerProviderMeta)
    const cfgMod = await import("../database/config-loader");
    const configs = await cfgMod.loadProviderConfigsFromDB({ forceRefresh: true });

    // 2) 触发一次探测 + 更新 ping cache 的 lastPingAt (防止立即重复)
    void triggerImmediateProbe(configs);

    // 3) 清 dashboard 聚合缓存, 让前端下一次请求拿到新列表
    const dashMod = await import("../core/dashboard-data");
    dashMod.invalidateDashboardCache();
  } catch (err) {
    logError("刷新缓存 / 触发即时探测失败", err);
  }
}

async function triggerImmediateProbe(
  configs: Array<{ id: string; is_maintenance?: boolean; groupName?: string | null }>
) {
  try {
    const active = configs.filter((c) => !c.is_maintenance);
    if (active.length === 0) return;

    const providersMod = await import("../providers");
    const historyMod = await import("../database/history");
    const stateMod = await import("../core/global-state");

    const results = await providersMod.runProviderChecks(configs as never);
    await historyMod.historySnapshotStore.append(results);
    console.log(`[status] 后台改动触发即时探测, 覆盖 ${results.length} 条`);

    // 更新所有 ping cache entry 的 lastPingAt, 阻止 pollInterval 内被再次触发探测
    const now = Date.now();
    const store = stateMod.getPingCacheStore();
    for (const key of Object.keys(store)) {
      store[key].lastPingAt = now;
    }
  } catch (err) {
    logError("即时探测失败", err);
  }
}
