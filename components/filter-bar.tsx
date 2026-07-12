"use client";

/**
 * 筛选栏 (对标图片顶部 4 个下拉 + 5 个时间窗口 tab)
 *
 * 4i.codes 版本约束:
 *   - 下拉是纯前端聚合 (从 provider config 派生), 不落 URL
 *   - 时间窗口 tab 决定"可用率"列和监控条的窗口
 */

import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AvailabilityPeriod } from "@/lib/types";

export type WindowKey = "90m" | "24h" | "7d" | "30d" | "all";

/** WindowKey → 后端可用率查询周期 (只有 7d/30d 后端直接支持, 其余映射到最接近的) */
export function windowToPeriod(w: WindowKey): AvailabilityPeriod {
  if (w === "30d") return "30d";
  if (w === "7d" || w === "24h" || w === "90m" || w === "all") return "7d";
  return "7d";
}

interface FilterBarProps {
  categories: string[];
  vendors: string[];
  services: string[];
  channels: string[];

  category: string | null;
  vendor: string | null;
  service: string | null;
  channel: string | null;

  onCategoryChange: (v: string | null) => void;
  onVendorChange: (v: string | null) => void;
  onServiceChange: (v: string | null) => void;
  onChannelChange: (v: string | null) => void;

  activeWindow: WindowKey;
  onWindowChange: (w: WindowKey) => void;

  onRefresh: () => void;
  refreshing?: boolean;
}

const WINDOW_TABS: Array<{ key: WindowKey; label: string }> = [
  { key: "90m", label: "近 90 分钟" },
  { key: "24h", label: "近 24 小时" },
  { key: "7d", label: "近 7 天" },
  { key: "30d", label: "近 30 天" },
  { key: "all", label: "全天" },
];

export function FilterBar(props: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-white/40 px-3 py-2 backdrop-blur">
      {/* 左: 漏斗图标 + 下拉 */}
      <div className="flex items-center gap-2 pl-1 text-muted-foreground">
        <Filter className="h-4 w-4" />
      </div>

      <Select
        placeholder="所有分类"
        value={props.category}
        options={props.categories}
        onChange={props.onCategoryChange}
      />
      <Select
        placeholder="所有服务商"
        value={props.vendor}
        options={props.vendors}
        onChange={props.onVendorChange}
      />
      <Select
        placeholder="所有服务"
        value={props.service}
        options={props.services}
        onChange={props.onServiceChange}
      />
      <Select
        placeholder="所有通道"
        value={props.channel}
        options={props.channels}
        onChange={props.onChannelChange}
      />

      {/* 中: 时间窗口 tabs */}
      <div className="ml-1 flex items-center gap-0.5 rounded-full border border-border/50 bg-background/40 p-0.5">
        {WINDOW_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => props.onWindowChange(t.key)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] transition-all",
              props.activeWindow === t.key
                ? "bg-foreground text-background shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 右: 刷新 */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={props.onRefresh}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full border border-border/50 bg-background/50 px-3 text-xs transition-all hover:border-foreground/40",
            props.refreshing && "opacity-60"
          )}
          disabled={props.refreshing}
        >
          <span
            className={cn(
              "inline-block h-1.5 w-1.5 rounded-full",
              props.refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            )}
          />
          {props.refreshing ? "刷新中" : "立即刷新"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 * 极简下拉 (原生 <select> 套 4i 样式)
 * ============================================================ */
function Select({
  placeholder,
  value,
  options,
  onChange,
}: {
  placeholder: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={cn(
          "h-8 appearance-none rounded-full border border-border/50 bg-background/40 pl-3.5 pr-7 text-[11.5px]",
          "text-foreground transition-colors hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/20",
          "cursor-pointer"
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
