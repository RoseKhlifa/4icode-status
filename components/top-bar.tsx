"use client";

/**
 * 4i.codes 胶囊顶部导航
 * 与首页 / 文档 / 联系 / 关于 视觉一致
 */

export function TopBar() {
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
          <a href="https://4i.codes">首页</a>
          <a href="https://4i.codes/doc/">文档</a>
          <a href="/" className="is-active">状态</a>
          <a href="https://4i.codes/contact">联系</a>
          <a href="https://4i.codes/about">关于</a>
          <button
            type="button"
            className="ficodes-topbar-theme"
            aria-label="切换主题 (暂未启用)"
            onClick={() => {
              /* placeholder */
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 3v1.6M12 19.4V21M3 12h1.6M19.4 12H21M5.6 5.6l1.13 1.13M17.27 17.27l1.13 1.13M5.6 18.4l1.13-1.13M17.27 6.73l1.13-1.13"></path>
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
