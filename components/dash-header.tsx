"use client";

/**
 * 4i.codes 状态看板顶部横幅
 *
 * 对标图片顶部行:
 *   [活动图标] [大标题 - 蓝墨渐变] [副标题]                    [国旗] [主题] [分享] [正常数徽章] [异常数徽章]
 *
 * 4i 主题保留米黄底, 标题渐变用墨 → 深棕的柔和过渡, 不用蓝色 (与 landing 一致)。
 */

import { Activity, Github, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashHeaderProps {
  operationalCount: number;
  degradedCount: number;
  errorCount: number;
  maintenanceCount: number;
}

export function DashHeader({
  operationalCount,
  degradedCount,
  errorCount,
  maintenanceCount,
}: DashHeaderProps) {
  const badCount = degradedCount + errorCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* 左: 品牌 */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <h1
            className={cn(
              "text-2xl font-black tracking-tight sm:text-3xl",
              "bg-gradient-to-r from-[#161311] via-[#2a221a] to-[#4e4030] bg-clip-text text-transparent"
            )}
          >
            4i.codes 状态监控
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            实时监测 API 中转服务可用性矩阵
          </p>
        </div>
      </div>

      {/* 右: 徽章组 */}
      <div className="flex items-center gap-2">
        <IconButton title="中文" letter="中" />
        <IconButton title="主题">
          <ThemeSunIcon />
        </IconButton>
        <a
          href="https://github.com/RoseKhlifa/4icode-status"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          title="GitHub"
        >
          <Github className="h-4 w-4" />
        </a>
        <IconButton title="分享">
          <Share2 className="h-4 w-4" />
        </IconButton>

        <CountBadge tone="emerald" count={operationalCount} title="正常" />
        {maintenanceCount > 0 && (
          <CountBadge tone="slate" count={maintenanceCount} title="维护" />
        )}
        <CountBadge tone="rose" count={badCount} title="异常" />
      </div>
    </div>
  );
}

/* ============================================================
 * 小组件
 * ============================================================ */
function IconButton({
  title,
  letter,
  children,
}: {
  title: string;
  letter?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
      title={title}
      aria-label={title}
    >
      {letter ? (
        <span className="font-bold text-sm">{letter}</span>
      ) : (
        children
      )}
    </button>
  );
}

function CountBadge({
  count,
  title,
  tone,
}: {
  count: number;
  title: string;
  tone: "emerald" | "rose" | "slate";
}) {
  const toneClass = {
    emerald: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
    rose: "bg-rose-500/15 text-rose-700 border-rose-500/30",
    slate: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  }[tone];
  const dotClass = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    slate: "bg-slate-500",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold backdrop-blur",
        toneClass
      )}
      title={title}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass)} />
      {count}
    </span>
  );
}

function ThemeSunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.13 1.13M17.27 17.27l1.13 1.13M5.6 18.4l1.13-1.13M17.27 6.73l1.13-1.13"></path>
    </svg>
  );
}
