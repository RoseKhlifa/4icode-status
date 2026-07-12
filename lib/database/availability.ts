/**
 * 可用性统计 (SQLite 聚合)
 *
 * 对每个 config_id + period (7d/15d/30d):
 *   - totalChecks       : period 窗口内的记录总数
 *   - operationalCount  : status IN ('operational', 'degraded') 的数量
 *   - availabilityPct   : 100 * operational / total, 无数据时为 null
 *
 * 与原实现兼容: degraded 计入可用 (原 Supabase migration 20260325 也做了同样的改动)
 */

import "server-only";
import { getDb } from "./sqlite";
import type { AvailabilityStat, AvailabilityStatsMap, AvailabilityPeriod } from "../types";
import { getPollingIntervalMs } from "../core/polling-config";
import { logError } from "../utils";

interface StatsCache {
  data: AvailabilityStatsMap;
  lastFetchedAt: number;
}

const cache: StatsCache = { data: {}, lastFetchedAt: 0 };

interface StatsCacheMetrics {
  hits: number;
  misses: number;
}

const metrics: StatsCacheMetrics = { hits: 0, misses: 0 };

export function getAvailabilityCacheMetrics(): StatsCacheMetrics {
  return { ...metrics };
}

export function resetAvailabilityCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
}

const PERIOD_DAYS: Record<AvailabilityPeriod, number> = {
  "7d": 7,
  "15d": 15,
  "30d": 30,
};

const OPERATIONAL_STATUSES = ["operational", "degraded"];

function computeStatsForIds(ids: string[]): AvailabilityStatsMap {
  if (ids.length === 0) return {};
  const db = getDb();
  const now = Date.now();
  const result: AvailabilityStatsMap = {};

  const stmt = db.prepare<[string, string], { total: number; ok: number }>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status IN ('operational','degraded') THEN 1 ELSE 0 END) AS ok
     FROM check_history
     WHERE config_id = ? AND checked_at >= ?`
  );
  void OPERATIONAL_STATUSES; // for grep/reference

  for (const id of ids) {
    const periods: AvailabilityStat[] = [];
    for (const period of Object.keys(PERIOD_DAYS) as AvailabilityPeriod[]) {
      const cutoff = new Date(
        now - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000
      ).toISOString();
      const row = stmt.get(id, cutoff) ?? { total: 0, ok: 0 };
      const total = Number(row.total ?? 0);
      const ok = Number(row.ok ?? 0);
      periods.push({
        period,
        totalChecks: total,
        operationalCount: ok,
        availabilityPct: total > 0 ? (ok * 100) / total : null,
      });
    }
    result[id] = periods;
  }

  return result;
}

function filterStats(
  data: AvailabilityStatsMap,
  ids: string[] | null
): AvailabilityStatsMap {
  if (!ids) return data;
  if (ids.length === 0) return {};
  const filtered: AvailabilityStatsMap = {};
  for (const id of ids) if (data[id]) filtered[id] = data[id];
  return filtered;
}

function normalizeIds(ids?: Iterable<string> | null): string[] | null {
  if (!ids) return null;
  const array = Array.from(ids).filter(Boolean);
  return array.length > 0 ? array : [];
}

export async function getAvailabilityStats(
  configIds?: Iterable<string> | null
): Promise<AvailabilityStatsMap> {
  const normalized = normalizeIds(configIds);
  if (Array.isArray(normalized) && normalized.length === 0) return {};

  const ttl = getPollingIntervalMs();
  const now = Date.now();

  if (
    now - cache.lastFetchedAt < ttl &&
    Object.keys(cache.data).length > 0
  ) {
    metrics.hits += 1;
    return filterStats(cache.data, normalized);
  }

  metrics.misses += 1;
  try {
    // 若未指定 ids,聚合所有已注册的 provider —— 由调用方通过 configIds 传入。
    // 当 normalized 为 null 时,我们用 SQL 找 distinct config_id 更省事,但为了保持行为一致,
    // 直接返回空对象; 调用方总是会传 ids。
    const ids = normalized ?? [];
    const data = computeStatsForIds(ids);
    cache.data = data;
    cache.lastFetchedAt = now;
    return filterStats(data, normalized);
  } catch (err) {
    logError("SQLite 计算可用性统计失败", err);
    return {};
  }
}
