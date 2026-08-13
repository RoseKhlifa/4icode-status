"use client";

/**
 * 4i.codes 状态看板顶部横幅
 *
 * 右上按钮组:
 *   [中/EN]  语言切换 (真切换, 存 localStorage)
 *   [☀/月]   主题切换 (与顶部导航共享状态)
 *   [GH]     GitHub 链接 (真链接)
 *   [share]  hover 打开 popover: 宣传文案 + 复制按钮
 *   [● N]    正常/异常计数
 */

import { useState } from "react";
import { Activity, Check, Copy, Github, Moon, Share2, Sun } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useLocale } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
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
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm sm:h-11 sm:w-11">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <h1
            className={cn(
              "truncate text-lg font-black tracking-tight sm:text-2xl md:text-3xl",
              "bg-gradient-to-r from-[#161311] via-[#2a221a] to-[#4e4030] bg-clip-text text-transparent dark:from-[#f1ede7] dark:via-[#d8d2ca] dark:to-[#9bc8ce]"
            )}
          >
            {t.header.title}
          </h1>
          <p className="hidden text-[11px] text-muted-foreground sm:block sm:text-sm">
            {t.header.subtitle}
          </p>
        </div>
      </div>

      {/* 右: 按钮组 */}
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
        <a
          href="https://github.com/RoseKhlifa/4icode-status"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-white/[0.04]"
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
      className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border border-border/50 bg-white/40 px-3 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-white/[0.04]"
      aria-label={`Switch language to ${nextLang}`}
      title={nextLang === "en" ? "English" : "中文"}
    >
      <span className="text-sm font-bold">{glyph}</span>
    </button>
  );
}

/* ============================================================
 * Theme toggle
 * ============================================================ */
function ThemeToggle() {
  const { lang } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const label = lang === "zh"
    ? (theme === "dark" ? "切换至浅色主题" : "切换至深色主题")
    : (theme === "dark" ? "Switch to light theme" : "Switch to dark theme");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-white/[0.04]"
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
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
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-white/40 text-muted-foreground backdrop-blur transition-colors hover:border-foreground/40 hover:text-foreground dark:bg-white/[0.04]"
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
        <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground/85 dark:bg-white/[0.05]">
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
