"use client";

/**
 * 4i.codes 状态看板主视图 (表格式)
 *
 * 数据流:
 *   dashboard-bootstrap -> fetchWithCache -> initialData
 *   本组件用 useState + SWR 后台刷新, 每 pollIntervalMs 拉一次
 *   FilterBar 的下拉/时间窗口都是纯前端过滤, 不重新请求
 *
 * 保留特性:
 *   - SWR 后台刷新
 *   - 立即刷新按钮 (forceRefresh)
 *   - 三个可用率窗口 (7d/15d/30d 由后端提供; 90m/24h/all 复用 7d 数据的展示)
 *
 * 移除特性:
 *   - 拖拽排序 / 名称搜索 / tag 过滤 (用图片里的下拉替代)
 *   - 分组折叠面板 (换成表格)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashHeader } from "@/components/dash-header";
import { FilterBar, type WindowKey, windowToPeriod } from "@/components/filter-bar";
import { StatusTable } from "@/components/status-table";
import {
  fetchWithCache,
  setCache,
} from "@/lib/core/frontend-cache";
import type {
  AvailabilityPeriod,
  DashboardData,
  ProviderTimeline,
} from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

interface DashboardViewProps {
  initialData: DashboardData;
}

/** "1 分钟" / "45 秒" 从服务端过来的中文, 客户端按语言翻译 */
function localizeInterval(label: string, lang: "zh" | "en"): string {
  if (lang !== "en") return label;
  const minMatch = label.match(/^(\d+(?:\.\d+)?)\s*分钟$/);
  if (minMatch) return `${minMatch[1]} min`;
  const secMatch = label.match(/^(\d+(?:\.\d+)?)\s*秒$/);
  if (secMatch) return `${secMatch[1]} s`;
  return label;
}

export function DashboardView({ initialData }: DashboardViewProps) {
  const { t, lang } = useLocale();
  const [data, setData] = useState<DashboardData>(initialData);
  const [activeWindow, setActiveWindow] = useState<WindowKey>("90m");
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string | null>(null);
  const [service, setService] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);

  const currentPeriod: AvailabilityPeriod = windowToPeriod(activeWindow);

  /* ============================================================
   * 后端后台轮询 (与 pollIntervalMs 保持一致)
   * ============================================================ */
  useEffect(() => {
    // 前端轮询间隔 = 后端探测间隔 (默认 60s)
    // 用 forceFresh 绕开前端 SWR 缓存 + 服务端 CDN 缓存,
    // 每次都拿一次真正新鲜的数据. 这样后台改动 provider 后,
    // 下一次前端 tick 就能看到新卡片.
    const intervalMs = data.pollIntervalMs > 0 ? data.pollIntervalMs : 60_000;
    let cancelled = false;

    const tick = async () => {
      try {
        const result = await fetchWithCache({
          trendPeriod: currentPeriod,
          forceFresh: true,
        });
        if (!cancelled && result.data) setData(result.data);
      } catch (err) {
        console.error("[4icode-status] 定时刷新失败", err);
      }
    };

    const id = setInterval(tick, intervalMs);

    // 页面可见性变化: 从后台切回前台时, 立刻补一次
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data.pollIntervalMs, currentPeriod]);

  /* ============================================================
   * 切换 trend period (7d/15d/30d) 需要重新拉数据
   * ============================================================ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchWithCache({
          trendPeriod: currentPeriod,
          revalidateIfFresh: true,
          onBackgroundUpdate: (next) => {
            if (!cancelled) setData(next);
          },
        });
        if (!cancelled && result.data) setData(result.data);
      } catch (err) {
        console.error("[4icode-status] 切换窗口拉数据失败", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPeriod]);

  /* ============================================================
   * 立即刷新
   * ============================================================ */
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await fetchWithCache({
        trendPeriod: currentPeriod,
        forceFresh: true,
      });
      if (result.data) {
        setCache(currentPeriod, result.data);
        setData(result.data);
      }
    } catch (err) {
      console.error("[4icode-status] 立即刷新失败", err);
    } finally {
      setRefreshing(false);
    }
  }, [currentPeriod, refreshing]);

  /* ============================================================
   * 派生: 可选筛选值 + 计数
   * ============================================================ */
  const { categories, vendors, services, channels } = useMemo(() => {
    const catSet = new Set<string>();
    const venSet = new Set<string>();
    const svcSet = new Set<string>();
    const chSet = new Set<string>();
    for (const t of data.providerTimelines) {
      const l = t.latest;
      if (l.category) catSet.add(l.category);
      if (l.vendor) venSet.add(l.vendor);
      if (l.service) svcSet.add(l.service);
      if (l.groupName) chSet.add(l.groupName);
    }
    return {
      categories: [...catSet].sort(),
      vendors: [...venSet].sort(),
      services: [...svcSet].sort(),
      channels: [...chSet].sort(),
    };
  }, [data.providerTimelines]);

  const filteredTimelines = useMemo<ProviderTimeline[]>(() => {
    return data.providerTimelines.filter((t) => {
      const l = t.latest;
      if (category && l.category !== category) return false;
      if (vendor && l.vendor !== vendor) return false;
      if (service && l.service !== service) return false;
      if (channel && l.groupName !== channel) return false;
      return true;
    });
  }, [data.providerTimelines, category, vendor, service, channel]);

  const counts = useMemo(() => {
    let operational = 0;
    let degraded = 0;
    let errorCount = 0;
    let maintenance = 0;
    for (const t of filteredTimelines) {
      const s = t.latest.status;
      if (s === "operational") operational++;
      else if (s === "degraded" || s === "validation_failed") degraded++;
      else if (s === "maintenance") maintenance++;
      else errorCount++;
    }
    return { operational, degraded, errorCount, maintenance };
  }, [filteredTimelines]);

  return (
    <div className="flex flex-col gap-3">
      <DashHeader
        operationalCount={counts.operational}
        degradedCount={counts.degraded}
        errorCount={counts.errorCount}
        maintenanceCount={counts.maintenance}
      />

      <FilterBar
        categories={categories}
        vendors={vendors}
        services={services}
        channels={channels}
        category={category}
        vendor={vendor}
        service={service}
        channel={channel}
        onCategoryChange={setCategory}
        onVendorChange={setVendor}
        onServiceChange={setService}
        onChannelChange={setChannel}
        activeWindow={activeWindow}
        onWindowChange={setActiveWindow}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <StatusTable
        timelines={filteredTimelines}
        availabilityStats={data.availabilityStats ?? {}}
        selectedPeriod={currentPeriod}
      />

      <div className="mt-1 flex justify-between text-[10.5px] text-muted-foreground">
        <span>
          {t.meta.lastUpdated}{" "}
          <span className="font-mono">
            {data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString(lang === "en" ? "en-US" : "zh-CN")
              : t.meta.unknownTime}
          </span>
        </span>
        <span>{t.meta.providerSummary(data.total, localizeInterval(data.pollIntervalLabel, lang))}</span>
      </div>
    </div>
  );
}
