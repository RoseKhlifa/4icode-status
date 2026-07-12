"use client";

/**
 * 服务商小徽章
 *
 * 图片里那种 圆角小方块 + 两个字母 + 品牌色边框, 用来在表格"服务商"列一眼分辨。
 *
 * iconKey 会从 provider config 里读:
 *   cc  → Cursor / Claude Code 系
 *   cx  → Codex 系
 *   gm  → Gemini 系
 *   oa  → OpenAI 系
 *   an  → Anthropic 系 (直接 API)
 *   ... 未识别时用首字母兜底
 */

import { cn } from "@/lib/utils";

interface VendorPreset {
  label: string;
  ring: string;
  tint: string;
  glyph: string;
}

const PRESETS: Record<string, VendorPreset> = {
  cc: {
    label: "CC",
    ring: "border-orange-400/50",
    tint: "bg-orange-400/10 text-orange-500",
    glyph: "◈",
  },
  cx: {
    label: "CX",
    ring: "border-sky-400/50",
    tint: "bg-sky-400/10 text-sky-500",
    glyph: "◉",
  },
  gm: {
    label: "GM",
    ring: "border-indigo-400/50",
    tint: "bg-indigo-400/10 text-indigo-500",
    glyph: "◆",
  },
  oa: {
    label: "OA",
    ring: "border-emerald-400/50",
    tint: "bg-emerald-400/10 text-emerald-500",
    glyph: "◇",
  },
  an: {
    label: "AN",
    ring: "border-amber-400/50",
    tint: "bg-amber-400/10 text-amber-500",
    glyph: "◎",
  },
};

interface VendorBadgeProps {
  iconKey?: string | null;
  vendor?: string | null;
  className?: string;
}

export function VendorBadge({ iconKey, vendor, className }: VendorBadgeProps) {
  const key = (iconKey ?? "").toLowerCase();
  const preset = PRESETS[key];

  const fallbackLabel = (vendor ?? "??").slice(0, 2).toUpperCase();

  const p: VendorPreset = preset ?? {
    label: fallbackLabel,
    ring: "border-border/60",
    tint: "bg-muted text-foreground/70",
    glyph: "•",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest",
        p.ring,
        p.tint,
        className
      )}
      title={vendor ?? undefined}
    >
      <span className="text-[10px] leading-none">{p.glyph}</span>
      {p.label}
    </span>
  );
}
