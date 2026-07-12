"use client";

/**
 * 服务商小徽章
 *
 * 从 iconKey 派生 SVG 图标 + 文字 label + 主题色边框。
 * 找不到匹配时用首字母兜底。
 *
 * iconKey → 图标 / 品牌色:
 *   cc / claude  → /vendors/claude.svg (橙)
 *   cx / gpt / openai → /vendors/gpt.svg (青)
 *   gm / gemini → /vendors/gemini.svg (蓝)
 *   gk / grok  → /vendors/grok.svg (灰)
 */

import { cn } from "@/lib/utils";

interface VendorPreset {
  label: string;
  ring: string;
  tint: string;
  icon?: string;
}

const PRESETS: Record<string, VendorPreset> = {
  cc: {
    label: "CC",
    ring: "border-orange-400/50",
    tint: "bg-orange-400/10 text-orange-500",
    icon: "/vendors/claude.svg",
  },
  claude: {
    label: "CC",
    ring: "border-orange-400/50",
    tint: "bg-orange-400/10 text-orange-500",
    icon: "/vendors/claude.svg",
  },
  cx: {
    label: "CX",
    ring: "border-sky-400/50",
    tint: "bg-sky-400/10 text-sky-500",
    icon: "/vendors/gpt.svg",
  },
  gpt: {
    label: "GPT",
    ring: "border-sky-400/50",
    tint: "bg-sky-400/10 text-sky-500",
    icon: "/vendors/gpt.svg",
  },
  oa: {
    label: "OA",
    ring: "border-emerald-400/50",
    tint: "bg-emerald-400/10 text-emerald-500",
    icon: "/vendors/gpt.svg",
  },
  openai: {
    label: "OAI",
    ring: "border-emerald-400/50",
    tint: "bg-emerald-400/10 text-emerald-500",
    icon: "/vendors/gpt.svg",
  },
  gm: {
    label: "GM",
    ring: "border-indigo-400/50",
    tint: "bg-indigo-400/10 text-indigo-500",
    icon: "/vendors/gemini.svg",
  },
  gemini: {
    label: "GM",
    ring: "border-indigo-400/50",
    tint: "bg-indigo-400/10 text-indigo-500",
    icon: "/vendors/gemini.svg",
  },
  gk: {
    label: "GK",
    ring: "border-slate-400/50",
    tint: "bg-slate-400/10 text-slate-500",
    icon: "/vendors/grok.svg",
  },
  grok: {
    label: "GK",
    ring: "border-slate-400/50",
    tint: "bg-slate-400/10 text-slate-500",
    icon: "/vendors/grok.svg",
  },
  an: {
    label: "AN",
    ring: "border-amber-400/50",
    tint: "bg-amber-400/10 text-amber-500",
    icon: "/vendors/claude.svg",
  },
  anthropic: {
    label: "AN",
    ring: "border-amber-400/50",
    tint: "bg-amber-400/10 text-amber-500",
    icon: "/vendors/claude.svg",
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
  const fallbackLabel = (vendor ?? "??").slice(0, 3).toUpperCase();

  const p: VendorPreset = preset ?? {
    label: fallbackLabel,
    ring: "border-border/60",
    tint: "bg-muted text-foreground/70",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
        p.ring,
        p.tint,
        className
      )}
      title={vendor ?? undefined}
    >
      {p.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.icon}
          alt=""
          aria-hidden="true"
          className="h-3 w-3"
          draggable={false}
        />
      ) : (
        <span className="text-[10px] leading-none">◆</span>
      )}
      {p.label}
    </span>
  );
}
