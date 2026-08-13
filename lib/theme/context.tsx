"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type StatusTheme = "light" | "dark";

export const STATUS_THEME_STORAGE_KEY = "4icode-status-theme";

interface ThemeMessage {
  type: "4icode:theme";
  theme: StatusTheme;
}

interface ThemeContextValue {
  theme: StatusTheme;
  setTheme: (theme: StatusTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

export function parseStatusTheme(value: unknown): StatusTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function isThemeMessage(value: unknown): value is ThemeMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.type === "4icode:theme" && parseStatusTheme(message.theme) !== null;
}

function isEmbedded() {
  const value = new URLSearchParams(window.location.search).get("embed");
  return value === "1" || value === "true";
}

function applyTheme(theme: StatusTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<StatusTheme>("light");

  const commitTheme = useCallback((next: StatusTheme, persist: boolean) => {
    setThemeState(next);
    applyTheme(next);
    if (!persist) return;

    try {
      localStorage.setItem(STATUS_THEME_STORAGE_KEY, next);
    } catch {
      /* localStorage 不可用时仍保留当前页面主题 */
    }
  }, []);

  useEffect(() => {
    const embedded = isEmbedded();
    const queryTheme = parseStatusTheme(
      new URLSearchParams(window.location.search).get("theme"),
    );
    let initialTheme = parseStatusTheme(document.documentElement.dataset.theme) ?? "light";

    if (embedded) {
      initialTheme = queryTheme ?? initialTheme;
    } else {
      try {
        initialTheme = parseStatusTheme(localStorage.getItem(STATUS_THEME_STORAGE_KEY))
          ?? initialTheme;
      } catch {
        /* ignore */
      }
    }

    const syncTimer = window.setTimeout(() => setThemeState(initialTheme), 0);

    const onThemeMessage = (event: MessageEvent<unknown>) => {
      if (!embedded || event.source !== window.parent || !isThemeMessage(event.data)) return;
      window.clearTimeout(syncTimer);
      commitTheme(event.data.theme, false);
    };

    window.addEventListener("message", onThemeMessage);
    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("message", onThemeMessage);
    };
  }, [commitTheme]);

  const setTheme = useCallback((next: StatusTheme) => {
    commitTheme(next, !isEmbedded());
  }, [commitTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
