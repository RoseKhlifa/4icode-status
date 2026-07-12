import type { NextConfig } from "next";

const useStandalone = process.env.NEXT_DISABLE_STANDALONE !== "1";

const nextConfig: NextConfig = {
  ...(useStandalone ? { output: "standalone" } : {}),
  // better-sqlite3 是 native 模块 - Next.js standalone 打包时需要显式声明外部
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
