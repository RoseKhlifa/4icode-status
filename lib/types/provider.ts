/**
 * Provider 相关类型定义
 */

/**
 * 支持的 AI Provider 类型
 */
export type ProviderType = "openai" | "gemini" | "anthropic";

/**
 * Provider 配置
 */
export interface ProviderConfig {
  id: string; // 由 config-loader 派生的稳定 id
  name: string;
  type: ProviderType;
  endpoint: string;
  model: string;
  apiKey: string;
  is_maintenance: boolean;
  requestHeaders?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
  groupName?: string | null;

  /* ============================================================
   * 4i.codes 表格视图扩展字段
   * ============================================================ */

  /** 服务分类, 用于筛选栏的"所有分类"下拉 (如 "Chat", "Codex", "Image") */
  category?: string | null;

  /** 服务商品牌 (与 UI 图标关联), 如 "Cursor", "Codex", "OpenAI", "Anthropic", "Gemini" */
  vendor?: string | null;

  /** 服务名 (用于表格"服务"列), 如 "cc-kiro" "Gemini" "Codex-Mixed" */
  service?: string | null;

  /** 多模型列表 (显示在"模型"列, 一行一个) */
  models?: string[] | null;

  /** 价格倍率 (显示在"价格"列上方), 如 "≤0.8×" */
  priceRatio?: string | null;

  /** 价格提示 (显示在"价格"列下方), 如 "0.7~" */
  priceHint?: string | null;

  /** 手动图标 key, 如 "cc" "gm" "cx" "oa" "an" — 对应 vendor-badge.tsx 里的预设 */
  iconKey?: string | null;

  /**
   * 稳定运行基线天数 (对外展示的最小值)
   * StatusTable "收录"列会显示 max(realDays, baselineDays)
   * 真实运行天数超过 baseline 后按真实的显示
   */
  baselineDays?: number | null;

  /**
   * 探测伪装模板 — 用于绕过上游对客户端的校验
   *   "claude-code" → 伪装成 Claude Code CLI (常用于 Claude 反向渠道)
   *   "none" / null → 无伪装
   * 参考 lib/providers/disguises.ts 里的 DISGUISE_PRESETS
   */
  disguise?: string | null;
}

/**
 * 默认 API 端点
 */
export const DEFAULT_ENDPOINTS: Record<ProviderType, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  gemini: "https://generativelanguage.googleapis.com",
  anthropic: "https://api.anthropic.com/v1/messages",
};
