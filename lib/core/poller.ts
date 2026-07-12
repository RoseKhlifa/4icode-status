/**
 * 后台探测轮询器
 *
 * 4i.codes 版本 (单节点):
 *   - 移除多节点 leader-election (原 check-cx 用 poller-leadership)
 *   - 单进程直接轮询,每 CHECK_POLL_INTERVAL_SECONDS 一次
 *   - 结果写入 SQLite
 */

import { historySnapshotStore } from "../database/history";
import { loadProviderConfigsFromDB } from "../database/config-loader";
import { runProviderChecks } from "../providers";
import { getPollingIntervalMs } from "./polling-config";
import {
  getLastPingStartedAt,
  getPollerTimer,
  setLastPingStartedAt,
  setPollerTimer,
} from "./global-state";
import type { CheckResult, HealthStatus } from "../types";

const POLL_INTERVAL_MS = getPollingIntervalMs();
const FAILURE_STATUSES: ReadonlySet<HealthStatus> = new Set([
  "failed",
  "validation_failed",
  "error",
]);

function isFailureResult(result: CheckResult): boolean {
  return FAILURE_STATUSES.has(result.status);
}

function formatDuration(value: number | null): string {
  return typeof value === "number" ? `${value}ms` : "N/A";
}

function normalizeGroupName(groupName: string | null | undefined): string {
  return groupName?.trim() || "默认渠道";
}

function logFullMessage(message: string): void {
  const normalizedMessage = message.replace(/\r\n/g, "\n");
  const lines = normalizedMessage.split("\n");

  for (const line of lines) {
    console.error(`[status]     message: ${line}`);
  }
}

function logFailedResultsByGroup(results: CheckResult[]): void {
  const failedResults = results.filter(isFailureResult);
  if (failedResults.length === 0) return;

  const groupedResults = new Map<string, CheckResult[]>();
  for (const result of failedResults) {
    const groupName = normalizeGroupName(result.groupName);
    const items = groupedResults.get(groupName);
    if (items) {
      items.push(result);
      continue;
    }
    groupedResults.set(groupName, [result]);
  }

  console.error("[status] ==================================================");
  console.error(
    `[status] 本轮探测失败批次：共 ${failedResults.length} 条，分为 ${groupedResults.size} 组`
  );

  for (const [groupName, items] of [...groupedResults.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    console.error(`[status] [${groupName}] ${items.length} 条`);

    for (const result of items.sort((left, right) => left.name.localeCompare(right.name))) {
      console.error(
        `[status]   - ${result.name}(${result.type}/${result.model}) -> ${result.status} | latency=${formatDuration(
          result.latencyMs
        )} | ping=${formatDuration(result.pingLatencyMs)} | endpoint=${result.endpoint}`
      );

      const fullMessage = result.logMessage || result.message || "无";
      logFullMessage(fullMessage);
    }

    console.error("[status] --------------------------------------------------");
  }

  console.error("[status] ====================== 批次结束 =====================");
}

/**
 * 执行一次轮询检查
 */
async function tick() {
  if (globalThis.__checkCxPollerRunning) {
    const lastStartedAt = getLastPingStartedAt();
    const duration = lastStartedAt ? Date.now() - lastStartedAt : null;
    console.log(
      `[status] 跳过 tick：上一轮仍在执行${duration !== null ? `（已耗时 ${duration}ms）` : ""}`
    );
    return;
  }
  globalThis.__checkCxPollerRunning = true;

  setLastPingStartedAt(Date.now());
  try {
    const allConfigs = await loadProviderConfigsFromDB();
    const configs = allConfigs.filter((cfg) => !cfg.is_maintenance);

    if (configs.length === 0) return;

    const results = await runProviderChecks(configs);
    await historySnapshotStore.append(results);
    logFailedResultsByGroup(results);
  } catch (error) {
    console.error("[status] 轮询检测失败", error);
  } finally {
    globalThis.__checkCxPollerRunning = false;
  }
}

if (!getPollerTimer()) {
  const firstCheckAt = new Date(Date.now() + POLL_INTERVAL_MS).toISOString();
  console.log(
    `[status] 初始化后台轮询器，interval=${POLL_INTERVAL_MS}ms，首次探测预计 ${firstCheckAt}`
  );
  const timer = setInterval(() => {
    tick().catch((error) => console.error("[status] 定时探测失败", error));
  }, POLL_INTERVAL_MS);
  setPollerTimer(timer);
}
