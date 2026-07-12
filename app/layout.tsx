import type { Metadata } from "next";
import "./globals.css";
import "@/lib/core/poller";
import NextTopLoader from "nextjs-toploader";
import { TopBar } from "@/components/top-bar";
import { LocaleProvider } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "4i.codes 状态 · 中转接口实时可用性",
  description:
    "实时监控 4i.codes 各路上游渠道 /v1/chat/completions 等接口的可用性、延迟与错误率。",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={cn("font-mono")}>
      <body className="antialiased">
        <NextTopLoader color="var(--ink)" showSpinner={false} />
        <LocaleProvider>
          <TopBar />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
