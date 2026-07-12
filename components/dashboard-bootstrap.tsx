"use client";

import {useCallback, useEffect, useState} from "react";

import {DashboardView} from "@/components/dashboard-view";
import {DashboardSkeleton} from "@/components/dashboard-skeleton";
import {fetchWithCache} from "@/lib/core/frontend-cache";
import type {AvailabilityPeriod, DashboardData} from "@/lib/types";
import {useLocale} from "@/lib/i18n/context";

const DEFAULT_PERIOD: AvailabilityPeriod = "7d";

export function DashboardBootstrap() {
  const { lang } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errText = lang === "en" ? "Failed to load, retry?" : "数据加载失败，请稍后重试";
  const retryText = lang === "en" ? "Retry" : "重新加载";

  const loadData = useCallback(async (forceFresh?: boolean) => {
    try {
      const result = await fetchWithCache({
        trendPeriod: DEFAULT_PERIOD,
        forceFresh,
        revalidateIfFresh: true,
        onBackgroundUpdate: (nextData) => {
          setData(nextData);
        },
      });
      setErrorMessage(null);
      setData(result.data);
    } catch (error) {
      console.error("[4icode-status] 首屏加载失败", error);
      setErrorMessage("failed_to_load");
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    const run = async () => {
      try {
        const result = await fetchWithCache({
          trendPeriod: DEFAULT_PERIOD,
          revalidateIfFresh: true,
          onBackgroundUpdate: (nextData) => {
            if (isActive) {
              setData(nextData);
            }
          },
        });
        if (!isActive) {
          return;
        }
        setErrorMessage(null);
        setData(result.data);
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.error("[4icode-status] 首屏加载失败", error);
        setErrorMessage("failed_to_load");
      }
    };
    run().catch(() => undefined);
    return () => {
      isActive = false;
    };
  }, []);

  if (!data) {
    return (
      <div>
        <DashboardSkeleton />
        {errorMessage && (
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-sm text-muted-foreground">
              <span>{errText}</span>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
              >
                {retryText}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <DashboardView initialData={data} />;
}
