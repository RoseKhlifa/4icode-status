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
 * 触发 config-loader 重读
 * ============================================================ */
async function invalidateConfigCache() {
  try {
    const mod = await import("../database/config-loader");
    // 强制刷新: 下次读取时会重新 parse providers.json
    await mod.loadProviderConfigsFromDB({ forceRefresh: true });
  } catch (err) {
    logError("重新加载 provider 配置失败", err);
  }
}
