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

interface DashboardViewProps {
  initialData: DashboardData;
}

export function DashboardView({ initialData }: DashboardViewProps) {
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
    const intervalMs = data.pollIntervalMs > 0 ? data.pollIntervalMs : 60_000;
    let cancelled = false;

    const tick = async () => {
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
        console.error("[4icode-status] 定时刷新失败", err);
      }
    };

    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
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
    <div className="flex flex-col gap-5">
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

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>
          最后更新{" "}
          <span className="font-mono">
            {data.lastUpdated
              ? new Date(data.lastUpdated).toLocaleString("zh-CN")
              : "—"}
          </span>
        </span>
        <span>
          共 {data.total} 个 provider · 探测间隔 {data.pollIntervalLabel}
        </span>
      </div>
    </div>
  );
}
