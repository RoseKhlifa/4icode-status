"use client";

/**
 * 4i.codes 状态看板顶部横幅
 *
 * 右上按钮组:
 *   [中]     当前语言 (只有中文, tooltip 说明)
 *   [☀]      主题 (只有浅色, tooltip 说明)
 *   [GH]     GitHub 链接 (真链接)
 *   [share]  hover 打开 popover: 宣传文案 + 复制按钮
 *   [● N]    正常/异常计数
 */

import { useState } from "react";
import { Activity, Check, Copy, Github, Share2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface DashHeaderProps {
  operationalCount: number;
  degradedCount: number;
  errorCount: number;
  maintenanceCount: number;
}

const PROMO_TEXT = `4i.codes — For I, For me
面向开发者的 AI API 中转平台
支持 Claude / GPT / Gemini / Grok 全系模型
统一 /v1/chat/completions 接口 · 稳定路由 · 透明计费
访问 https://4i.codes 了解详情`;

export function DashHeader({
  operationalCount,
  degradedCount,
  errorCount,
  maintenanceCount,
}: DashHeaderProps) {
  const badCount = degradedCount + errorCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* 左: 品牌 */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
          <Activity className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <h1
            className={cn(
              "text-xl font-black tracking-tight sm:text-2xl",
              "bg-gradient-to-r from-[#161311] via-[#2a221a] to-[#4e4030] bg-clip-text text-transparent"
            )}
          >
            4i.codes 状态监控
          </h1>
          <p className="text-[11px] text-muted-foreground sm:text-xs">
            实时监测 API 中转服务可用性矩阵
          </p>
        </div>
      </div>

      {/* 右: 按钮组 */}
      <div className="flex items-center gap-1.5">
        <LanguagePill />
        <ThemePill />
        <a
          href="https://github.com/RoseKhlifa/4icode-status"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          title="GitHub · 4icode-status"
        >
          <Github className="h-3.5 w-3.5" />
        </a>
        <SharePopover />

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
 * Language pill
 * ============================================================ */
function LanguagePill() {
  return (
    <HoverCard openDelay={100} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          aria-label="当前语言"
        >
          <span className="text-xs font-bold">中</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-56 rounded-xl border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur"
      >
        <div className="mb-1 font-semibold">语言 · 中文</div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          状态看板暂只提供中文。 4i.codes 主站有中英切换,后续版本会跟进这里。
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

/* ============================================================
 * Theme pill
 * ============================================================ */
function ThemePill() {
  return (
    <HoverCard openDelay={100} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          aria-label="主题"
        >
          <ThemeSunIcon />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-56 rounded-xl border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur"
      >
        <div className="mb-1 font-semibold">主题 · 米黄浅色</div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          4i.codes 品牌调色板是纸色 <code className="font-mono">#efe8df</code> +
          墨色 <code className="font-mono">#161311</code>。暗色模式暂不提供,后续版本视用户反馈开启。
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}

/* ============================================================
 * Share popover
 * ============================================================ */
function SharePopover() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(PROMO_TEXT);
      } else {
        const ta = document.createElement("textarea");
        ta.value = PROMO_TEXT;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <HoverCard openDelay={80} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          aria-label="分享 4i.codes"
        >
          <Share2 className="h-3.5 w-3.5" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-80 rounded-xl border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">推荐给朋友</span>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[10.5px] transition-colors",
              copied
                ? "border-emerald-400 text-emerald-600"
                : "text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> 已复制
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> 复制
              </>
            )}
          </button>
        </div>
        <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/85">
{PROMO_TEXT}
        </pre>
      </HoverCardContent>
    </HoverCard>
  );
}

/* ============================================================
 * Count badge
 * ============================================================ */
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
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold backdrop-blur",
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
