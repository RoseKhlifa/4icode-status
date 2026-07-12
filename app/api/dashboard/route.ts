import { NextResponse } from "next/server";

import { loadDashboardDataWithEtag } from "@/lib/core/dashboard-data";
import type { AvailabilityPeriod } from "@/lib/types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const VALID_PERIODS: AvailabilityPeriod[] = ["7d", "15d", "30d"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("trendPeriod");
  const forceRefreshParam = searchParams.get("forceRefresh");
  const shouldForceRefresh =
    forceRefreshParam === "1" || forceRefreshParam === "true";
  const trendPeriod = VALID_PERIODS.includes(period as AvailabilityPeriod)
    ? (period as AvailabilityPeriod)
    : undefined;

  const { data, etag } = await loadDashboardDataWithEtag({
    refreshMode: shouldForceRefresh ? "always" : "never",
    trendPeriod,
  });

  // 条件请求
  const ifNoneMatch = request.headers.get("If-None-Match");
  if (ifNoneMatch === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  const response = NextResponse.json(data);

  // 4i.codes 单节点没有 CDN, 也不打算让浏览器缓存这个响应.
  // 强制"每次都重新验证", 只保留 ETag 用于减少 body 传输.
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("ETag", etag);
  response.headers.set("Vary", "Accept-Encoding");

  return response;
}
