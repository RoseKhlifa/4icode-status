"use client";

/**
 * 4i.codes 状态看板核心表格
 *
 * 收紧版: 减少列 padding、行高更紧、监控条更长, 让内容更"实"
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
import { useLocale } from "@/lib/i18n/context";

interface StatusTableProps {
  timelines: ProviderTimeline[];
  availabilityStats: AvailabilityStatsMap;
  selectedPeriod: AvailabilityPeriod;
}

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
  const { t } = useLocale();
  const PERIOD_LABEL: Record<AvailabilityPeriod, string> = {
    "7d": t.table.period7d,
    "15d": t.table.period15d,
    "30d": t.table.period30d,
  };

  if (timelines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/40 bg-white/40 px-6 py-12 text-center backdrop-blur dark:bg-white/[0.04]">
        <CircleDashed className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{t.table.emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-white/40 backdrop-blur dark:bg-white/[0.04]">
      {/* ============================================================
       * 手机版: 卡片列表 (每个 provider 一张卡)
       * 桌面版: 大宽表格 (与之前一致)
       * 通过 tailwind `md:hidden` / `hidden md:block` 切换
       * ============================================================ */}

      {/* 移动版卡片列表 */}
      <div className="flex flex-col divide-y divide-border/40 md:hidden">
        {timelines.map((tl) => (
          <MobileCard
            key={tl.id}
            timeline={tl}
            stats={availabilityStats[tl.id]}
            selectedPeriod={selectedPeriod}
          />
        ))}
      </div>

      {/* 桌面版表格 */}
      <div
        className="hidden md:block overflow-x-auto"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--table-scroll-fade) 30%, transparent), linear-gradient(to right, transparent, var(--table-scroll-fade) 70%), radial-gradient(farthest-side at 0 50%, var(--table-scroll-shadow), transparent), radial-gradient(farthest-side at 100% 50%, var(--table-scroll-shadow), transparent)",
          backgroundPosition: "0 0, 100% 0, 0 0, 100% 0",
          backgroundRepeat: "no-repeat",
          backgroundSize: "40px 100%, 40px 100%, 14px 100%, 14px 100%",
          backgroundAttachment: "local, local, scroll, scroll",
        }}
      >
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[10%]" /> {/* 服务商 */}
            <col className="w-[7%]" /> {/* 服务 badge */}
            <col className="w-[9%]" /> {/* 通道 */}
            <col className="w-[15%]" /> {/* 模型 */}
            <col className="w-[6%]" /> {/* 价格 */}
            <col className="w-[7%]" /> {/* 收录天数 */}
            <col className="w-[7%]" /> {/* 可用率 */}
            <col className="w-[9%]" /> {/* 最后监测 */}
            <col /> {/* 趋势条: 占满剩余 */}
          </colgroup>
          <thead className="bg-white/70 backdrop-blur dark:bg-white/[0.07]">
            <tr className="h-11 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <Th className="pl-5">{t.table.vendor}</Th>
              <Th>{t.table.service}</Th>
              <Th>{t.table.channel}</Th>
              <Th>{t.table.model}</Th>
              <Th>{t.table.price}</Th>
              <Th className="text-center">{t.table.coverage}</Th>
              <Th className="text-right">{t.table.availability}</Th>
              <Th>{t.table.lastCheck}</Th>
              <Th className="pr-5">
                {t.table.trend}
                <span className="ml-2 text-[10.5px] tracking-normal opacity-70">
                  {t.table.trendSuffix(PERIOD_LABEL[selectedPeriod])}
                </span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {timelines.map((tl, i) => (
              <Row
                key={tl.id}
                timeline={tl}
                stats={availabilityStats[tl.id]}
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
        "whitespace-nowrap border-b border-border/40 px-3 text-left align-middle font-semibold",
        className
      )}
    >
      {children}
    </th>
  );
}

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
  const { t } = useLocale();
  const latest = timeline.latest;
  const models = latest.models && latest.models.length > 0 ? latest.models : [latest.model];
  const vendorLabel = latest.vendor ?? latest.type.toUpperCase();
  const channel = latest.groupName ?? t.table.defaultChannel;
  const currentStat = stats?.find((s) => s.period === selectedPeriod);
  const pct = currentStat?.availabilityPct ?? null;

  return (
    <tr
      className={cn(
        "border-b border-border/30 transition-colors hover:bg-white/60 dark:hover:bg-white/[0.08]",
        striped && "bg-white/25 dark:bg-white/[0.025]"
      )}
    >
      {/* 服务商 */}
      <td className="pl-5 pr-3 py-3.5 align-middle">
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-foreground">{latest.name}</span>
          <span className="text-xs text-muted-foreground">{vendorLabel}</span>
        </div>
      </td>

      {/* 服务 (品牌 badge) */}
      <td className="px-3 py-3.5 align-middle">
        <VendorBadge iconKey={latest.iconKey} vendor={latest.vendor} />
      </td>

      {/* 通道 */}
      <td className="px-3 py-3.5 align-middle">
        <div className="flex items-center gap-2 text-sm text-foreground/85">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot(latest.status))} />
          <span className="truncate">{channel}</span>
        </div>
      </td>

      {/* 模型 */}
      <td className="px-3 py-3.5 align-middle">
        <div className="flex flex-col gap-0 font-mono text-[13px] leading-tight text-foreground/85">
          {models.slice(0, 4).map((m) => (
            <span key={m} className="truncate">
              {m}
            </span>
          ))}
          {models.length > 4 && (
            <span className="text-[11px] text-muted-foreground">+{models.length - 4}</span>
          )}
        </div>
      </td>

      {/* 价格 */}
      <td className="px-3 py-3.5 align-middle">
        <div className="flex flex-col font-mono text-[13px] leading-tight">
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

      {/* 收录天数: max(realCoverageDays, baselineDays) */}
      <td className="px-3 py-3.5 text-center align-middle font-mono text-[13px] text-foreground/80">
        {formatCoverage(latest.realCoverageDays, latest.baselineDays)}
      </td>

      {/* 可用率 */}
      <td className="px-3 py-3.5 text-right align-middle">
        <span className={cn("font-mono text-[15px] font-bold", pctColor(pct))}>
          {pct == null ? "—" : `${pct.toFixed(pct >= 99 ? 0 : 2)}%`}
        </span>
      </td>

      {/* 最后监测 */}
      <td className="px-3 py-3.5 align-middle">
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1.5 font-mono text-[13px]">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot(latest.status))} />
            <span className="text-foreground">
              {latest.latencyMs != null ? `${latest.latencyMs}ms` : "—"}
            </span>
          </span>
          <span className="pl-3.5 font-mono text-[11px] text-muted-foreground/80">
            {formatLastTime(latest.checkedAt)}
          </span>
        </div>
      </td>

      {/* 监控条 */}
      <td className="pl-3 pr-5 py-3.5 align-middle">
        <StatusStrip items={timeline.items} slots={60} />
      </td>
    </tr>
  );
}

/** 只取 HH:mm */
function formatLastTime(iso: string): string {
  const full = formatLocalTime(iso);
  const parts = full.split(" ");
  const hm = parts[1] ?? full;
  return hm.split(":").slice(0, 2).join(":");
}

/**
 * 显示 max(real, baseline) 天数
 *   - 都无 → "—"
 *   - 只有 baseline → baseline
 *   - 只有 real → real
 *   - 都有 → max
 */
function formatCoverage(
  real: number | null | undefined,
  baseline: number | null | undefined
): string {
  const r = typeof real === "number" && Number.isFinite(real) ? real : null;
  const b = typeof baseline === "number" && Number.isFinite(baseline) ? baseline : null;
  if (r == null && b == null) return "—";
  const days = Math.max(r ?? 0, b ?? 0);
  return `${days}d`;
}

/**
 * 移动版卡片: 单个 provider
 *
 * 布局 (从上到下):
 *   [top row]  Vendor 名 · 品牌 badge          ·         状态灯 + 可用率 %
 *   [channel]  通道名                                    最后监测 latency + 时间
 *   [models]   模型列表 (最多 4 个 + "+N" 汇总)
 *   [strip]    监控条 (全宽)
 *   [meta]     收录 xxd · 价格
 */
function MobileCard({
  timeline,
  stats,
  selectedPeriod,
}: {
  timeline: ProviderTimeline;
  stats: AvailabilityStat[] | undefined;
  selectedPeriod: AvailabilityPeriod;
}) {
  const { t } = useLocale();
  const latest = timeline.latest;
  const models = latest.models && latest.models.length > 0 ? latest.models : [latest.model];
  const vendorLabel = latest.vendor ?? latest.type.toUpperCase();
  const channel = latest.groupName ?? t.table.defaultChannel;
  const currentStat = stats?.find((s) => s.period === selectedPeriod);
  const pct = currentStat?.availabilityPct ?? null;

  return (
    <div className="flex flex-col gap-2.5 px-4 py-4">
      {/* 第 1 行: 服务商 + badge  |  可用率 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold text-foreground">
              {latest.name}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {vendorLabel}
            </div>
          </div>
          <VendorBadge iconKey={latest.iconKey} vendor={latest.vendor} />
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span
            className={cn("font-mono text-[16px] font-bold", pctColor(pct))}
          >
            {pct == null ? "—" : `${pct.toFixed(pct >= 99 ? 0 : 2)}%`}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t.table.availability}
          </span>
        </div>
      </div>

      {/* 第 2 行: 通道 (含状态灯) · 最后监测 */}
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              statusDot(latest.status)
            )}
          />
          <span className="truncate text-foreground/85">{channel}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <span className="text-foreground/80">
            {latest.latencyMs != null ? `${latest.latencyMs}ms` : "—"}
          </span>
          <span>·</span>
          <span>{formatLastTime(latest.checkedAt)}</span>
        </div>
      </div>

      {/* 第 3 行: 模型列表 */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[11px] leading-relaxed text-foreground/70">
        {models.slice(0, 4).map((m) => (
          <span key={m} className="truncate">
            {m}
          </span>
        ))}
        {models.length > 4 && (
          <span className="text-muted-foreground">
            +{models.length - 4}
          </span>
        )}
      </div>

      {/* 第 4 行: 监控条 */}
      <div className="pt-1">
        <StatusStrip items={timeline.items} slots={40} />
      </div>

      {/* 第 5 行: 元信息 */}
      <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-wider text-muted-foreground/80">
        <span>
          {t.table.coverage}{" "}
          <span className="font-mono normal-case text-foreground/70">
            {formatCoverage(latest.realCoverageDays, latest.baselineDays)}
          </span>
        </span>
        {(latest.priceRatio || latest.priceHint) && (
          <>
            <span>·</span>
            <span className="truncate">
              {t.table.price}{" "}
              <span className="font-mono normal-case text-foreground/70">
                {latest.priceRatio ?? latest.priceHint}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
