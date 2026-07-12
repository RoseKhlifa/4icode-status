"use client";

/**
 * Locale context: 顶层挂一次, 所有子组件通过 useLocale() 拿字典 + 切换器
 *
 * 服务端渲染时默认 zh; 客户端首帧再从 localStorage 读取用户选择,
 * 二次渲染换成真实语言 (轻微闪一下, 可接受)
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { DICT, type Dict, type Lang } from "./dict";

const STORAGE_KEY = "4icode-status-lang";
const DEFAULT_LANG: Lang = "zh";

interface Ctx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const LocaleContext = createContext<Ctx>({
  lang: DEFAULT_LANG,
  t: DICT[DEFAULT_LANG],
  setLang: () => undefined,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // 首次渲染完成后, 若 localStorage 有值, 切过去
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "zh") {
        if (saved !== lang) setLangState(saved);
      } else {
        // 首次访问: 按浏览器语言猜一下
        const nav = navigator.language?.toLowerCase() ?? "";
        if (nav.startsWith("en")) setLangState("en");
      }
    } catch {
      /* localStorage 不可用 (隐私模式?) 忽略 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 语言变化时同步到 <html lang>
  useEffect(() => {
    try {
      document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value: Ctx = {
    lang,
    t: DICT[lang],
    setLang,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  return useContext(LocaleContext);
}
