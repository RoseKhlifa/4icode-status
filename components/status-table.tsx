"use client";

/**
 * 4i.codes 状态看板核心表格
 *
 * 布局对标用户提供的 IKunCode 状态监控截图 (但保持 4i 米黄墨主题):
 *   服务商 | 服务 | 通道 | 模型 | 价格 | 收录 | 可用率 | 最后监测 | 90 格监控条
 */

import { CircleDashed } from "lucide-react";
import { StatusStrip } from "@/components/status-strip";
import { VendorBadge } from "@/components/vendor-badge";
import type {
  AvailabilityPeriod,
  AvailabilityStat,
  AvailabilityStatsMap,
  ProviderTimeline,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatLocalTime } from "@/lib/utils";

interface StatusTableProps {
  timelines: ProviderTimeline[];
  availabilityStats: AvailabilityStatsMap;
  selectedPeriod: AvailabilityPeriod;
}

const PERIOD_LABEL: Record<AvailabilityPeriod, string> = {
  "7d": "近 7 天",
  "15d": "近 15 天",
  "30d": "近 30 天",
};

function pctColor(pct: number | null | undefined) {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 99) return "text-emerald-600";
  if (pct >= 95) return "text-amber-600";
  return "text-rose-600";
}

function statusDot(status: string) {
  if (status === "operational") return "bg-emerald-500";
  if (status === "degraded" || status === "validation_failed") return "bg-amber-500";
  if (status === "maintenance") return "bg-slate-400";
  return "bg-rose-500";
}

export function StatusTable({
  timelines,
  availabilityStats,
  selectedPeriod,
}: StatusTableProps) {
  if (timelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-white/40 px-6 py-16 text-center backdrop-blur">
        <CircleDashed className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          暂无 provider 配置或探测数据。请检查 <code className="rounded bg-muted px-1.5 font-mono">data/providers.json</code>。
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/40 backdrop-blur">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-white/70 backdrop-blur">
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <Th className="pl-5">服务商</Th>
              <Th>服务</Th>
              <Th>通道</Th>
              <Th>模型</Th>
              <Th>价格</Th>
              <Th className="text-center">
                收录
                <div className="text-[9px] normal-case tracking-normal opacity-70">天数</div>
              </Th>
              <Th className="text-right">可用率</Th>
              <Th>
                最后
                <div className="text-[9px] normal-case tracking-normal opacity-70">监测</div>
              </Th>
              <Th className="pr-5">
                可用率趋势
                <span className="ml-1 text-[9px] normal-case tracking-normal opacity-70">
                  [{PERIOD_LABEL[selectedPeriod]}]
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {timelines.map((t, i) => (
              <Row
                key={t.id}
                timeline={t}
                stats={availabilityStats[t.id]}
                selectedPeriod={selectedPeriod}
                striped={i % 2 === 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
 * 表头 <th>
 * ============================================================ */
function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-border/40 px-3 py-3 text-left align-bottom font-semibold",
        className
      )}
    >
      {children}
    </th>
  );
}

/* ============================================================
 * 单行
 * ============================================================ */
function Row({
  timeline,
  stats,
  selectedPeriod,
  striped,
}: {
  timeline: ProviderTimeline;
  stats: AvailabilityStat[] | undefined;
  selectedPeriod: AvailabilityPeriod;
  striped?: boolean;
}) {
  const latest = timeline.latest;
  const models = latest.models && latest.models.length > 0 ? latest.models : [latest.model];
  const vendorLabel = latest.vendor ?? latest.type.toUpperCase();
  const service = latest.service ?? latest.name;
  const channel = latest.groupName ?? "默认渠道";
  const currentStat = stats?.find((s) => s.period === selectedPeriod);
  const pct = currentStat?.availabilityPct ?? null;

  return (
    <tr
      className={cn(
        "border-b border-border/30 transition-colors hover:bg-white/60",
        striped && "bg-white/25"
      )}
    >
      {/* 服务商 */}
      <td className="pl-5 pr-3 py-3 align-middle">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {latest.name}
          </div>
          <span className="text-[11px] text-muted-foreground">{vendorLabel}</span>
        </div>
      </td>

      {/* 服务 (品牌 badge) */}
      <td className="px-3 py-3 align-middle">
        <VendorBadge iconKey={latest.iconKey} vendor={latest.vendor} />
      </td>

      {/* 通道 */}
      <td className="px-3 py-3 align-middle">
        <div className="flex items-center gap-2 text-foreground/80">
          <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(latest.status))} />
          <span>{channel}</span>
        </div>
      </td>

      {/* 模型 */}
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col gap-0.5 font-mono text-[12px] text-foreground/85">
          {models.slice(0, 4).map((m) => (
            <span key={m} className="truncate">
              {m}
            </span>
          ))}
          {models.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{models.length - 4} more</span>
          )}
        </div>
      </td>

      {/* 价格 */}
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col font-mono text-[12px] leading-tight">
          {latest.priceRatio && (
            <span className="text-foreground">{latest.priceRatio}</span>
          )}
          {latest.priceHint && (
            <span className="text-muted-foreground">{latest.priceHint}</span>
          )}
          {!latest.priceRatio && !latest.priceHint && (
            <span className="text-muted-foreground/60">—</span>
          )}
        </div>
      </td>

      {/* 收录天数 (由 30d 窗口的样本数换算, 简化: 有历史 = "-" 兜底显示) */}
      <td className="px-3 py-3 text-center align-middle text-muted-foreground/60 font-mono text-xs">
        —
      </td>

      {/* 可用率 */}
      <td className="px-3 py-3 text-right align-middle">
        <span className={cn("font-mono text-[15px] font-bold", pctColor(pct))}>
          {pct == null ? "—" : `${pct.toFixed(pct >= 99 ? 0 : 2)}%`}
        </span>
      </td>

      {/* 最后监测 (延迟 + 时间) */}
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5 font-mono text-[12px]">
            <span className={cn("h-1.5 w-1.5 rounded-full", statusDot(latest.status))} />
            <span className="text-foreground">
              {latest.latencyMs != null ? `${latest.latencyMs}ms` : "—"}
            </span>
          </span>
          <span className="pl-3 font-mono text-[10px] text-muted-foreground/80">
            {formatLastTime(latest.checkedAt)}
          </span>
        </div>
      </td>

      {/* 90 格监控条 */}
      <td className="pl-3 pr-5 py-3 align-middle">
        <StatusStrip items={timeline.items} slots={45} />
      </td>
    </tr>
  );
}

/** 只取 HH:mm 部分 (图片里"14:17"那种) */
function formatLastTime(iso: string): string {
  const full = formatLocalTime(iso);
  // formatLocalTime 输出如 "2026/07/12 14:17:23"; 取空格后的 HH:mm
  const parts = full.split(" ");
  const hm = parts[1] ?? full;
  return hm.split(":").slice(0, 2).join(":");
}
