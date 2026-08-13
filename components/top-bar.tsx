"use client";

/**
 * 4i.codes 胶囊顶部导航
 * 与首页 / 文档 / 联系 / 关于 视觉一致
 */

import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import { assetPath, apiUrl } from "@/lib/utils/api-url";

const NAV_LABELS = {
  zh: { home: "首页", doc: "文档", status: "状态", contact: "联系", about: "关于" },
  en: { home: "Home", doc: "Docs", status: "Status", contact: "Contact", about: "About" },
};

export function TopBar() {
  const { lang } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const l = NAV_LABELS[lang];
  const themeLabel = lang === "zh"
    ? (theme === "dark" ? "切换至浅色主题" : "切换至深色主题")
    : (theme === "dark" ? "Switch to light theme" : "Switch to dark theme");

  return (
    <header className="ficodes-topbar">
      <div className="ficodes-topbar-inner">
        <a className="ficodes-topbar-brand" href="https://4i.codes">
          <img
            className="ficodes-topbar-logo"
            src={assetPath("/logo.png")}
            alt="4i.codes"
          />
          <span className="ficodes-topbar-brand-name">4i.codes</span>
        </a>
        <nav className="ficodes-topbar-nav" aria-label="Primary">
          <a href="https://4i.codes">{l.home}</a>
          <a href="https://4i.codes/doc/">{l.doc}</a>
          <a href={apiUrl("/")} className="is-active">
            {l.status}
          </a>
          <a href="https://4i.codes/contact">{l.contact}</a>
          <a href="https://4i.codes/about">{l.about}</a>
          <button
            type="button"
            className="ficodes-topbar-theme"
            onClick={toggleTheme}
            aria-label={themeLabel}
            aria-pressed={theme === "dark"}
            title={themeLabel}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
        </nav>
      </div>
    </header>
  );
}
