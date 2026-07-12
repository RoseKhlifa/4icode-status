/**
 * 健康检查相关类型定义
 */

import type { ProviderType } from "./provider";
import type { OfficialStatusResult } from "./official-status";

/**
 * Provider 健康状态
 */
export type HealthStatus =
  | "operational"
  | "degraded"
  | "failed"
  | "validation_failed"
  | "maintenance"
  | "error";

/**
 * 单次检查结果
 */
export interface CheckResult {
  id: string;
  name: string;
  type: ProviderType;
  endpoint: string;
  model: string;
  status: HealthStatus;
  latencyMs: number | null;
  pingLatencyMs: number | null;
  checkedAt: string;
  message: string;
  logMessage?: string;
  officialStatus?: OfficialStatusResult;
  groupName?: string | null;

  /* 4i.codes 表格视图扩展字段 (最新一条会带上) */
  category?: string | null;
  vendor?: string | null;
  service?: string | null;
  models?: string[] | null;
  priceRatio?: string | null;
  priceHint?: string | null;
  iconKey?: string | null;
}
