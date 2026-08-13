"use client";

/**
 * Embed 模式开关
 *
 * 场景: 4i.codes/console 里 iframe 嵌入本 status 页面, 不想显示重复的顶栏和页脚.
 *
 * 契约: URL 带 ?embed=1 (或 ?embed=true) 时启用.
 *   - 给 <html> 加 class="embed-mode"
 *   - 主题由 ThemeProvider 负责, 本组件只管理嵌入布局
 *   - CSS (globals.css) 匹配 .embed-mode 隐藏 .ficodes-topbar / footer / 撤销 body padding-top
 *
 * 用原生 URLSearchParams 读 window.location.search 而不是 next/navigation 的 useSearchParams,
 * 后者在 Next 15/16 里要求外层包 <Suspense>, 太重. 客户端 effect 直接读 URL 更简单.
 * 首帧会闪一下顶栏, 立即消失, 大部分场景可接受.
 */

import { useEffect } from "react";

export function EmbedMode() {
  useEffect(() => {
    const html = document.documentElement;

    const apply = () => {
      const q = new URLSearchParams(window.location.search);
      const v = q.get("embed");
      const active = v === "1" || v === "true";
      html.classList.toggle("embed-mode", active);
    };

    apply();
    // 前端路由变化时(next/link + shallow, 或 history.pushState)重新判定
    const onPop = () => apply();
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      html.classList.remove("embed-mode");
    };
  }, []);

  return null;
}
