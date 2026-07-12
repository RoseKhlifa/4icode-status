/**
 * 探测请求伪装模板
 *
 * 部分中转/反向渠道对客户端 UA 有硬性校验 (比如只允许官方 CLI 客户端),
 * 需要在探测时把请求头 + 请求体伪装成对应客户端。
 *
 * 使用方式:
 *   provider config 里加 `disguise: "claude-code"` 就会自动合并对应的
 *   headers 和 body metadata 到探测请求里。
 *
 * 用户自定义的 requestHeaders/metadata 优先级高于 disguise (显式覆盖)。
 */

export interface DisguisePreset {
  /** 展示名 (给后台编辑器下拉用) */
  label: string;
  /** 合并到探测请求的 HTTP headers */
  headers: Record<string, string>;
  /** 合并到 POST body 顶层的字段 (用户可以再覆盖) */
  bodyFields: Record<string, unknown>;
}

/**
 * Claude Code CLI (v2.1.114) 伪装
 *
 * 参考真实抓包: 官方 CLI 在调 /v1/messages 时带这套 header + system
 * 中转渠道通常校验 X-App=cli + anthropic-dangerous-direct-browser-access=true
 */
const CLAUDE_CODE_CLI: DisguisePreset = {
  label: "Claude Code CLI",
  headers: {
    "User-Agent": "claude-cli/2.1.114 (external, sdk-cli)",
    "X-App": "cli",
    "anthropic-beta":
      "claude-code-20250219,interleaved-thinking-2025-05-14,context-management-2025-06-27,prompt-caching-scope-2026-01-05,advisor-tool-2026-03-01",
    "anthropic-dangerous-direct-browser-access": "true",
    "anthropic-version": "2023-06-01",
  },
  bodyFields: {
    metadata: {
      user_id:
        "user_0000000000000000000000000000000000000000000000000000000000000000_account_00000000-0000-0000-0000-000000000000_session_00000000-0000-0000-0000-000000000000",
    },
    system: [
      {
        text: "You are Claude Code, Anthropic's official CLI for Claude.",
        type: "text",
      },
    ],
  },
};

/**
 * 无伪装 — 保留 SDK 默认行为
 */
const NONE: DisguisePreset = {
  label: "无伪装 (SDK 默认)",
  headers: {},
  bodyFields: {},
};

export const DISGUISE_PRESETS: Record<string, DisguisePreset> = {
  none: NONE,
  "claude-code": CLAUDE_CODE_CLI,
};

/**
 * 后台编辑器展示用的下拉选项
 */
export const DISGUISE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: NONE.label },
  { value: "claude-code", label: CLAUDE_CODE_CLI.label },
];

/**
 * 从 disguise key 派生要合并的 headers + body 字段
 * 未识别时返回空
 */
export function resolveDisguise(key: string | null | undefined): DisguisePreset {
  if (!key) return NONE;
  return DISGUISE_PRESETS[key] ?? NONE;
}
