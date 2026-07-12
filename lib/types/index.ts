/**
 * 统一类型导出入口
 */

// 数据库类型
export type { CheckHistoryRow, AvailabilityStats } from "./database";

// Provider 类型
export type { ProviderType, ProviderConfig } from "./provider";
export { DEFAULT_ENDPOINTS } from "./provider";

// 检查结果类型
export type { HealthStatus, CheckResult } from "./check";

// 官方状态类型 (4i.codes 版本中该字段永远为 undefined,但类型保留以便 UI 组件保留兼容渲染)
export type { OfficialHealthStatus, OfficialStatusResult } from "./official-status";

// Dashboard 类型
export type {
  TimelineItem,
  ProviderTimeline,
  GroupedProviderTimelines,
  DashboardData,
  GroupInfoSummary,
  AvailabilityPeriod,
  AvailabilityStat,
  AvailabilityStatsMap,
  RefreshMode,
  PingCacheEntry,
  HistorySnapshot,
} from "./dashboard";

// 常量
export { UNGROUPED_KEY, UNGROUPED_DISPLAY_NAME } from "./constants";
