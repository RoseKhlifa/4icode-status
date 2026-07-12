import type { NextConfig } from "next";

const useStandalone = process.env.NEXT_DISABLE_STANDALONE !== "1";

// STATUS_BASE_PATH 用于反代场景 (比如 nginx 挂载到 4i.codes/status/),
// 生产必须设为 "/status", 否则 _next/static 资源路径会被 nginx 兜底
// 匹配吞掉, 浏览器拿到 HTML 报 "Unexpected token '<'".
// 本地开发 (npm run dev) 不设, 直接根路径.
const rawBase = process.env.STATUS_BASE_PATH || "";
const basePath = rawBase && rawBase !== "/" ? rawBase.replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" } : {}),
  // better-sqlite3 是 native 模块 - Next.js standalone 打包时需要显式声明外部
  serverExternalPackages: ["better-sqlite3"],
  // 反代场景下同时设 basePath + assetPrefix, Next 会自动加前缀
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
