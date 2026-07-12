/**
 * Provider 配置加载
 *
 * 来源优先级:
 *   1. 环境变量 PROVIDERS_JSON (整段 JSON 字符串)
 *   2. 文件 STATUS_PROVIDERS_PATH / data/providers.json
 *
 * 支持多组 (groupName) 探测同一个 4i.codes 端点的不同上游渠道。
 *
 * 配置示例:
 * [
 *   {
 *     "name": "GPT-5 (主渠道)", "type": "openai",
 *     "endpoint": "https://api.4i.codes/v1/chat/completions",
 *     "model": "gpt-5-mini", "apiKey": "sk-xxx-A",
 *     "groupName": "主渠道", "enabled": true
 *   },
 *   {
 *     "name": "GPT-5 (备用渠道)", "type": "openai",
 *     "endpoint": "https://api.4i.codes/v1/chat/completions",
 *     "model": "gpt-5-mini", "apiKey": "sk-xxx-B",
 *     "groupName": "备用渠道", "enabled": true
 *   }
 * ]
 */

import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ProviderConfig, ProviderType } from "../types";
import { registerProviderMeta } from "./history";
import { getPollingIntervalMs } from "../core/polling-config";
import { logError } from "../utils";

interface ConfigCache {
  data: ProviderConfig[];
  lastFetchedAt: number;
}

interface ConfigCacheMetrics {
  hits: number;
  misses: number;
}

const cache: ConfigCache = { data: [], lastFetchedAt: 0 };
const metrics: ConfigCacheMetrics = { hits: 0, misses: 0 };

export function getConfigCacheMetrics(): ConfigCacheMetrics {
  return { ...metrics };
}

export function resetConfigCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
}

interface RawProviderEntry {
  id?: string;
  name?: string;
  type?: string;
  endpoint?: string;
  model?: string;
  apiKey?: string;
  api_key?: string;
  is_maintenance?: boolean;
  enabled?: boolean;
  groupName?: string;
  group_name?: string;
  requestHeaders?: Record<string, string> | null;
  request_headers?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;

  // 4i.codes 表格视图扩展字段 (全部可选)
  category?: string;
  vendor?: string;
  service?: string;
  models?: string[];
  priceRatio?: string;
  priceHint?: string;
  iconKey?: string;
  baselineDays?: number;
}

function resolveConfigPath(): string {
  const raw = process.env.STATUS_PROVIDERS_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), "data", "providers.json");
}

function readRawJson(): string | null {
  const inline = process.env.PROVIDERS_JSON?.trim();
  if (inline) return inline;

  const filePath = resolveConfigPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    logError(`读取 provider 配置文件失败: ${filePath}`, err);
    return null;
  }
}

const VALID_TYPES: ReadonlySet<ProviderType> = new Set(["openai", "gemini", "anthropic"]);

/**
 * 为一条配置生成稳定 id (基于关键字段的 SHA-1 前 16 位)
 * 这样同一份配置文件 -> 同一批 id,历史记录不会因为重启就断代
 */
function stableId(entry: {
  type: string;
  endpoint: string;
  model: string;
  groupName?: string | null;
  apiKey?: string;
  name?: string;
}): string {
  const key = [
    entry.type,
    entry.endpoint,
    entry.model,
    entry.groupName ?? "",
    // 用 apiKey 的 hash (而不是明文) 参与,渠道 A/B 密钥不同时才会区分,但配置里不写这个字段
    entry.apiKey ? crypto.createHash("sha1").update(entry.apiKey).digest("hex").slice(0, 8) : "",
    entry.name ?? "",
  ].join("|");
  return crypto.createHash("sha1").update(key).digest("hex").slice(0, 16);
}

function parseEntries(raw: string): ProviderConfig[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logError("provider 配置 JSON 解析失败", err);
    return [];
  }
  if (!Array.isArray(parsed)) {
    console.warn("[status] provider 配置根节点必须是数组");
    return [];
  }

  const result: ProviderConfig[] = [];
  for (const entry of parsed as RawProviderEntry[]) {
    if (entry?.enabled === false) continue;
    const type = entry?.type as ProviderType;
    if (!type || !VALID_TYPES.has(type)) {
      console.warn(`[status] 跳过未知 type: ${type}`);
      continue;
    }
    const endpoint = String(entry.endpoint ?? "").trim();
    const model = String(entry.model ?? "").trim();
    const name = String(entry.name ?? "").trim();
    const apiKey = String(entry.apiKey ?? entry.api_key ?? "").trim();
    if (!endpoint || !model || !name) {
      console.warn(`[status] 跳过缺少必填字段的配置: ${JSON.stringify({ name, endpoint, model })}`);
      continue;
    }

    const groupName = (entry.groupName ?? entry.group_name ?? null) || null;
    const id = entry.id?.trim() || stableId({ type, endpoint, model, groupName, apiKey, name });

    result.push({
      id,
      name,
      type,
      endpoint,
      model,
      apiKey,
      is_maintenance: Boolean(entry.is_maintenance),
      requestHeaders: entry.requestHeaders ?? entry.request_headers ?? null,
      metadata: entry.metadata ?? null,
      groupName,

      // 表格视图扩展 (未提供时用 null, 前端会用 fallback)
      category: entry.category?.trim() || null,
      vendor: entry.vendor?.trim() || null,
      service: entry.service?.trim() || name,
      models: Array.isArray(entry.models) && entry.models.length > 0
        ? entry.models.map((m) => String(m).trim()).filter(Boolean)
        : [model],
      priceRatio: entry.priceRatio?.trim() || null,
      priceHint: entry.priceHint?.trim() || null,
      iconKey: entry.iconKey?.trim() || null,
      baselineDays: typeof entry.baselineDays === "number" ? entry.baselineDays : null,
    });
  }
  return result;
}

/**
 * 从 JSON 加载 provider 配置 (带内存缓存)
 */
export async function loadProviderConfigsFromDB(options?: {
  forceRefresh?: boolean;
}): Promise<ProviderConfig[]> {
  const now = Date.now();
  const ttl = getPollingIntervalMs();

  if (!options?.forceRefresh && cache.data.length > 0 && now - cache.lastFetchedAt < ttl) {
    metrics.hits += 1;
    return cache.data;
  }
  metrics.misses += 1;

  const raw = readRawJson();
  if (!raw) {
    console.warn(
      "[status] 未找到 provider 配置 — 请设置 PROVIDERS_JSON 或写 data/providers.json"
    );
    cache.data = [];
    cache.lastFetchedAt = now;
    registerProviderMeta([]);
    return [];
  }

  const configs = parseEntries(raw);
  cache.data = configs;
  cache.lastFetchedAt = now;

  // 供 history.ts 反查 provider 元信息
  registerProviderMeta(
    configs.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      endpoint: c.endpoint,
      model: c.model,
      groupName: c.groupName ?? null,
      category: c.category ?? null,
      vendor: c.vendor ?? null,
      service: c.service ?? null,
      models: c.models ?? null,
      priceRatio: c.priceRatio ?? null,
      priceHint: c.priceHint ?? null,
      iconKey: c.iconKey ?? null,
      baselineDays: c.baselineDays ?? null,
    }))
  );

  return configs;
}
