"use client";

/**
 * 90 格状态色块条 (对标图片中的"可用率趋势"列)
 *
 * - 最多 90 格 (对齐"近 90 分钟" tab; 也能被 7d/30d 复用,窗口只是数据范围不同)
 * - 缺失格 (无数据) 显示为灰色空槽
 * - hover 显示时间 + 状态 + 延迟
 */

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { CheckResult, HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatLocalTime } from "@/lib/utils";

const STATUS_COLOR: Record<HealthStatus, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  failed: "bg-rose-500",
  validation_failed: "bg-orange-500",
  maintenance: "bg-slate-400",
  error: "bg-rose-600",
};

const EMPTY_COLOR = "bg-black/10";

interface StatusStripProps {
  items: CheckResult[];
  /** 最多显示的格数, 默认 90 */
  slots?: number;
  className?: string;
}

export function StatusStrip({ items, slots = 90, className }: StatusStripProps) {
  // items 是 checkedAt DESC (最新在最前). 我们要 UI 从左到右 = 旧到新, 所以反转.
  const asc = items.slice(0, slots).slice().reverse();
  const emptyCount = Math.max(0, slots - asc.length);

  return (
    <div
      className={cn(
        "flex h-6 w-full items-center gap-[2px]",
        className
      )}
      role="img"
      aria-label={`最近 ${slots} 次探测状态`}
    >
      {Array.from({ length: emptyCount }, (_, i) => (
        <span
          key={`empty-${i}`}
          className={cn("h-full min-w-0 flex-1 rounded-[3px]", EMPTY_COLOR)}
        />
      ))}
      {asc.map((item, idx) => (
        <HoverCard key={`${item.checkedAt}-${idx}`} openDelay={80} closeDelay={40}>
          <HoverCardTrigger asChild>
            <span
              className={cn(
                "h-full min-w-0 flex-1 rounded-[3px] transition-opacity hover:opacity-80",
                STATUS_COLOR[item.status] ?? EMPTY_COLOR
              )}
            />
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            className="w-auto min-w-56 rounded-xl border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          >
            <div className="mb-1 flex items-center gap-2 text-foreground">
              <span
                className={cn("inline-block h-2 w-2 rounded-full", STATUS_COLOR[item.status])}
              />
              <span className="font-semibold">{STATUS_LABEL[item.status]}</span>
              <span className="ml-auto font-mono text-muted-foreground">
                {formatLocalTime(item.checkedAt)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-[11px] text-muted-foreground">
              <span>
                对话延迟{" "}
                <b className="font-mono text-foreground">
                  {item.latencyMs != null ? `${item.latencyMs} ms` : "—"}
                </b>
              </span>
              <span>
                端点 PING{" "}
                <b className="font-mono text-foreground">
                  {item.pingLatencyMs != null ? `${item.pingLatencyMs} ms` : "—"}
                </b>
              </span>
            </div>
            {item.message && (
              <div className="mt-1 max-w-[320px] truncate text-[11px] text-muted-foreground/80">
                {item.message}
              </div>
            )}
          </HoverCardContent>
        </HoverCard>
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<HealthStatus, string> = {
  operational: "正常",
  degraded: "延迟",
  failed: "异常",
  validation_failed: "验证失败",
  maintenance: "维护中",
  error: "错误",
};
