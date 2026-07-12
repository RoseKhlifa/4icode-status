"use client";

/**
 * 4i.codes 状态看板顶部横幅
 *
 * 右上按钮组:
 *   [中/EN]  语言切换 (真切换, 存 localStorage)
 *   [☀]      主题 (哑按钮, 无 tooltip / 无 hover popover / 无点击效果)
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
import { useLocale } from "@/lib/i18n/context";
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
  const { t } = useLocale();
  const badCount = degradedCount + errorCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* 左: 品牌 */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <h1
            className={cn(
              "text-2xl font-black tracking-tight sm:text-3xl",
              "bg-gradient-to-r from-[#161311] via-[#2a221a] to-[#4e4030] bg-clip-text text-transparent"
            )}
          >
            {t.header.title}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t.header.subtitle}
          </p>
        </div>
      </div>

      {/* 右: 按钮组 */}
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeMute />
        <a
          href="https://github.com/RoseKhlifa/4icode-status"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          title={t.header.githubTip}
        >
          <Github className="h-4 w-4" />
        </a>
        <SharePopover />

        <CountBadge tone="emerald" count={operationalCount} title={t.header.countTitleOk} />
        {maintenanceCount > 0 && (
          <CountBadge tone="slate" count={maintenanceCount} title={t.header.countTitleMaint} />
        )}
        <CountBadge tone="rose" count={badCount} title={t.header.countTitleBad} />
      </div>
    </div>
  );
}

/* ============================================================
 * Language toggle — 真切换, 无 tooltip
 * ============================================================ */
function LanguageToggle() {
  const { lang, setLang } = useLocale();
  const nextLang = lang === "zh" ? "en" : "zh";
  const glyph = lang === "zh" ? "中" : "EN";
  return (
    <button
      type="button"
      onClick={() => setLang(nextLang)}
      className="flex h-9 items-center justify-center rounded-full border border-border/50 bg-white/40 px-3 min-w-[2.25rem] text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
      aria-label={`Switch language to ${nextLang}`}
      title={nextLang === "en" ? "English" : "中文"}
    >
      <span className="text-sm font-bold">{glyph}</span>
    </button>
  );
}

/* ============================================================
 * Theme — 哑按钮 (无 hover 弹层, 无点击效果)
 * ============================================================ */
function ThemeMute() {
  return (
    <span
      className="flex h-9 w-9 cursor-default items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur select-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 opacity-70"
      >
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.13 1.13M17.27 17.27l1.13 1.13M5.6 18.4l1.13-1.13M17.27 6.73l1.13-1.13"></path>
      </svg>
    </span>
  );
}

/* ============================================================
 * Share popover
 * ============================================================ */
function SharePopover() {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t.header.promo);
      } else {
        const ta = document.createElement("textarea");
        ta.value = t.header.promo;
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground"
          aria-label={t.header.shareTip}
        >
          <Share2 className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="end"
        className="w-80 rounded-xl border border-border/60 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold">{t.header.shareTitle}</span>
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
                <Check className="h-3 w-3" /> {t.header.copied}
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> {t.header.copy}
              </>
            )}
          </button>
        </div>
        <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/85">
{t.header.promo}
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
        "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-bold backdrop-blur",
        toneClass
      )}
      title={title}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      {count}
    </span>
  );
}
