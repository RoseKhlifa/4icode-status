"use client";

/**
 * 4i.codes 胶囊顶部导航
 * 与首页 / 文档 / 联系 / 关于 视觉一致
 * 主题按钮是哑按钮 (无点击效果、无 tooltip)
 */

import { useLocale } from "@/lib/i18n/context";

const NAV_LABELS = {
  zh: { home: "首页", doc: "文档", status: "状态", contact: "联系", about: "关于" },
  en: { home: "Home", doc: "Docs", status: "Status", contact: "Contact", about: "About" },
};

export function TopBar() {
  const { lang } = useLocale();
  const l = NAV_LABELS[lang];

  return (
    <header className="ficodes-topbar">
      <div className="ficodes-topbar-inner">
        <a className="ficodes-topbar-brand" href="https://4i.codes">
          <img
            className="ficodes-topbar-logo"
            src="/logo.png"
            alt="4i.codes"
          />
          <span className="ficodes-topbar-brand-name">4i.codes</span>
        </a>
        <nav className="ficodes-topbar-nav" aria-label="Primary">
          <a href="https://4i.codes">{l.home}</a>
          <a href="https://4i.codes/doc/">{l.doc}</a>
          <a href="/" className="is-active">
            {l.status}
          </a>
          <a href="https://4i.codes/contact">{l.contact}</a>
          <a href="https://4i.codes/about">{l.about}</a>
          <span className="ficodes-topbar-theme" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.13 1.13M17.27 17.27l1.13 1.13M5.6 18.4l1.13-1.13M17.27 6.73l1.13-1.13"></path>
            </svg>
          </span>
        </nav>
      </div>
    </header>
  );
}
