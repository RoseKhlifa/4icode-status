/**
 * group-frontend-cache stub (4i.codes 版本)
 *
 * 上游 check-cx 有独立的 /group/[groupName] 页面,访问首页时会预取所有组的数据。
 * 4i.codes 只保留主 Dashboard,不再有单组页面。此 stub 保留导出以避免 dashboard-view
 * 引用报错;真调用时啥也不做。
 */

import type { AvailabilityPeriod } from "../types";

export async function prefetchGroupData(
  _groupName: string,
  _periods: AvailabilityPeriod[],
  _currentPeriod?: AvailabilityPeriod
): Promise<void> {
  void _groupName;
  void _periods;
  void _currentPeriod;
  return;
}
