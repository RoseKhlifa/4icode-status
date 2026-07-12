/**
 * 拼接 API URL, 自动加上 Next.js basePath
 *
 * 当 status 项目挂在 nginx 反代 (比如 /status/) 下面时, next.config.ts 会设 basePath="/status".
 * 前端 fetch("/api/xxx") 不会自动加前缀 (Next 只对 <Link> / router 加),
 * 必须手工用这个 helper 拼一下, 否则会打到根路径被 nginx 兜底吞掉返回 HTML.
 *
 * NEXT_PUBLIC_BASE_PATH 会由 Next.js 在 client 端注入 (从 basePath 派生),
 * 也可以显式在 .env 里覆盖.
 */

// Next.js 会自动把 next.config.ts 的 basePath 暴露成运行时全局
// process.env.__NEXT_ROUTER_BASEPATH (server + client 都可用)
declare const process: {
  env: Record<string, string | undefined>;
};

function getBasePath(): string {
  // 优先用 Next runtime 注入的
  const runtime =
    (process.env.__NEXT_ROUTER_BASEPATH as string | undefined) ||
    (process.env.NEXT_PUBLIC_BASE_PATH as string | undefined) ||
    "";
  return runtime && runtime !== "/" ? runtime.replace(/\/$/, "") : "";
}

/**
 * apiUrl("/api/dashboard") -> "/status/api/dashboard" (生产) / "/api/dashboard" (dev)
 */
export function apiUrl(path: string): string {
  const base = getBasePath();
  if (!path.startsWith("/")) path = "/" + path;
  return base + path;
}
