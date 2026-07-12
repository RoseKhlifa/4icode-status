/**
 * 探测历史记录 (SQLite)
 *
 * - 每个 provider 保留最近 MAX_POINTS_PER_PROVIDER 条历史
 * - 超过 HISTORY_RETENTION_DAYS 天的记录自动清理
 */

import "server-only";
import { getDb } from "./sqlite";
import type { CheckResult, HistorySnapshot } from "../types";
import { logError } from "../utils";

export const MAX_POINTS_PER_PROVIDER = 60;

const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 7;
const MAX_RETENTION_DAYS = 365;

export const HISTORY_RETENTION_DAYS = (() => {
  const raw = Number(process.env.HISTORY_RETENTION_DAYS);
  if (Number.isFinite(raw)) {
    return Math.max(MIN_RETENTION_DAYS, Math.min(MAX_RETENTION_DAYS, raw));
  }
  return DEFAULT_RETENTION_DAYS;
})();

export interface HistoryQueryOptions {
  allowedIds?: Iterable<string> | null;
  limitPerConfig?: number;
}

interface HistoryRow {
  config_id: string;
  status: string;
  latency_ms: number | null;
  ping_latency_ms: number | null;
  checked_at: string;
  message: string | null;
}

interface ProviderMeta {
  id: string;
  name: string;
  type: CheckResult["type"];
  endpoint: string;
  model: string;
  groupName: string | null;
}

let providerMetaLookup: Map<string, ProviderMeta> = new Map();

export function registerProviderMeta(configs: ProviderMeta[]): void {
  providerMetaLookup = new Map(configs.map((c) => [c.id, c]));
}

function rowToResult(row: HistoryRow): CheckResult | null {
  const meta = providerMetaLookup.get(row.config_id);
  if (!meta) return null;
  return {
    id: meta.id,
    name: meta.name,
    type: meta.type,
    endpoint: meta.endpoint,
    model: meta.model,
    status: row.status as CheckResult["status"],
    latencyMs: row.latency_ms,
    pingLatencyMs: row.ping_latency_ms,
    checkedAt: row.checked_at,
    message: row.message ?? "",
    groupName: meta.groupName,
  };
}

class SnapshotStore {
  async fetch(options?: HistoryQueryOptions): Promise<HistorySnapshot> {
    try {
      const allowed = normalizeAllowedIds(options?.allowedIds);
      if (Array.isArray(allowed) && allowed.length === 0) return {};

      const db = getDb();
      const limit = options?.limitPerConfig ?? MAX_POINTS_PER_PROVIDER;

      const ids = allowed ?? [...providerMetaLookup.keys()];
      if (ids.length === 0) return {};

      const history: HistorySnapshot = {};
      const stmt = db.prepare<[string, number], HistoryRow>(
        `SELECT config_id, status, latency_ms, ping_latency_ms, checked_at, message
         FROM check_history
         WHERE config_id = ?
         ORDER BY checked_at DESC
         LIMIT ?`
      );
      for (const id of ids) {
        const rows = stmt.all(id, limit);
        const items = rows
          .map(rowToResult)
          .filter((r): r is CheckResult => r !== null);
        if (items.length > 0) {
          history[id] = items;
        }
      }
      return history;
    } catch (err) {
      logError("SQLite 读取历史失败", err);
      return {};
    }
  }

  async append(results: CheckResult[]): Promise<void> {
    if (results.length === 0) return;
    try {
      const db = getDb();
      const insert = db.prepare(
        `INSERT INTO check_history
           (config_id, status, latency_ms, ping_latency_ms, checked_at, message)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      const txn = db.transaction((rows: CheckResult[]) => {
        for (const r of rows) {
          insert.run(
            r.id,
            r.status,
            r.latencyMs,
            r.pingLatencyMs,
            r.checkedAt,
            r.message ?? ""
          );
        }
      });
      txn(results);
      await this.prune();
    } catch (err) {
      logError("SQLite 写入历史失败", err);
    }
  }

  async prune(retentionDays: number = HISTORY_RETENTION_DAYS): Promise<void> {
    try {
      const db = getDb();
      const cutoff = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      ).toISOString();
      db.prepare(`DELETE FROM check_history WHERE checked_at < ?`).run(cutoff);
    } catch (err) {
      logError("SQLite 清理历史失败", err);
    }
  }
}

export const historySnapshotStore = new SnapshotStore();

export async function loadHistory(
  options?: HistoryQueryOptions
): Promise<HistorySnapshot> {
  return historySnapshotStore.fetch(options);
}

export async function appendHistory(
  results: CheckResult[]
): Promise<HistorySnapshot> {
  await historySnapshotStore.append(results);
  return historySnapshotStore.fetch();
}

function normalizeAllowedIds(
  ids?: Iterable<string> | null
): string[] | null {
  if (!ids) return null;
  const array = Array.from(ids).filter(Boolean);
  return array.length > 0 ? array : [];
}
