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
import { useLocale } from "@/lib/i18n/context";

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

export function FilterBar(props: FilterBarProps) {
  const { t } = useLocale();
  const WINDOW_TABS: Array<{ key: WindowKey; label: string }> = [
    { key: "90m", label: t.filter.win90m },
    { key: "24h", label: t.filter.win24h },
    { key: "7d", label: t.filter.win7d },
    { key: "30d", label: t.filter.win30d },
    { key: "all", label: t.filter.winAll },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/50 bg-white/40 px-3 py-2.5 backdrop-blur sm:gap-2.5 sm:px-4 sm:py-3">
      {/* 左: 漏斗图标 + 下拉, 手机隐藏漏斗省空间 */}
      <div className="hidden items-center gap-2 pl-1 text-muted-foreground sm:flex">
        <Filter className="h-4 w-4" />
      </div>

      <Select
        placeholder={t.filter.allCategories}
        value={props.category}
        options={props.categories}
        onChange={props.onCategoryChange}
      />
      <Select
        placeholder={t.filter.allVendors}
        value={props.vendor}
        options={props.vendors}
        onChange={props.onVendorChange}
      />
      <Select
        placeholder={t.filter.allServices}
        value={props.service}
        options={props.services}
        onChange={props.onServiceChange}
      />
      <Select
        placeholder={t.filter.allChannels}
        value={props.channel}
        options={props.channels}
        onChange={props.onChannelChange}
      />

      {/* 中: 时间窗口 tabs */}
      <div className="ml-1 flex items-center gap-0.5 rounded-full border border-border/50 bg-background/40 p-1">
        {WINDOW_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => props.onWindowChange(tab.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs transition-all",
              props.activeWindow === tab.key
                ? "bg-foreground text-background shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 右: 刷新 */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={props.onRefresh}
          className={cn(
            "flex h-9 items-center gap-2 rounded-full border border-border/50 bg-background/50 px-4 text-sm transition-all hover:border-foreground/40",
            props.refreshing && "opacity-60"
          )}
          disabled={props.refreshing}
        >
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              props.refreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            )}
          />
          {props.refreshing ? t.filter.refreshing : t.filter.refresh}
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
          "h-9 appearance-none rounded-full border border-border/50 bg-background/40 pl-4 pr-8 text-sm",
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
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
