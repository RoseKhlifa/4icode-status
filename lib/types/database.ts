/**
 * 数据库表行类型 (4i.codes SQLite 版本)
 * 保留可用性视图的类型形状,方便读取逻辑复用。
 */

/**
 * check_history 表的行类型 (SQLite)
 */
export interface CheckHistoryRow {
  id: number;
  config_id: string;
  status: string;
  latency_ms: number | null;
  ping_latency_ms: number | null;
  checked_at: string;
  message: string | null;
}

/**
 * 可用性统计的聚合结果 (运行时计算,不再来自视图)
 */
export interface AvailabilityStats {
  config_id: string;
  period: "7d" | "15d" | "30d";
  total_checks: number;
  operational_count: number;
  availability_pct: number | null;
}
