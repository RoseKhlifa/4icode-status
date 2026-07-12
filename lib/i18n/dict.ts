/**
 * 4i.codes 状态看板 i18n 字典
 *
 * 只做 zh / en 两种. 通过 useLocale() hook 消费.
 * localStorage key: 4icode-status-lang
 */

export type Lang = "zh" | "en";

export interface Dict {
  header: {
    title: string;
    subtitle: string;
    langTip: string;
    themeTip: string;
    githubTip: string;
    shareTip: string;
    promo: string;
    copy: string;
    copied: string;
    shareTitle: string;
    countTitleOk: string;
    countTitleBad: string;
    countTitleMaint: string;
  };
  filter: {
    allCategories: string;
    allVendors: string;
    allServices: string;
    allChannels: string;
    win90m: string;
    win24h: string;
    win7d: string;
    win30d: string;
    winAll: string;
    refresh: string;
    refreshing: string;
  };
  table: {
    vendor: string;
    service: string;
    channel: string;
    model: string;
    price: string;
    coverage: string;
    availability: string;
    lastCheck: string;
    trend: string;
    trendSuffix: (period: string) => string;
    defaultChannel: string;
    emptyHint: string;
    period7d: string;
    period15d: string;
    period30d: string;
  };
  status: {
    operational: string;
    degraded: string;
    failed: string;
    validationFailed: string;
    maintenance: string;
    error: string;
  };
  meta: {
    lastUpdated: string;
    providerSummary: (n: number, interval: string) => string;
    unknownTime: string;
    ver: string;
  };
}

const zh: Dict = {
  header: {
    title: "4i.codes 状态监控",
    subtitle: "实时监测 API 中转服务可用性矩阵",
    langTip: "语言 · 中文",
    themeTip: "米黄浅色主题",
    githubTip: "GitHub · 4icode-status",
    shareTip: "分享 4i.codes",
    promo: `4i.codes — For I, For me
面向开发者的 AI API 中转平台
支持 Claude / GPT / Gemini / Grok 全系模型
统一 /v1/chat/completions 接口 · 稳定路由 · 透明计费
访问 https://4i.codes 了解详情`,
    copy: "复制",
    copied: "已复制",
    shareTitle: "推荐给朋友",
    countTitleOk: "正常",
    countTitleBad: "异常",
    countTitleMaint: "维护",
  },
  filter: {
    allCategories: "所有分类",
    allVendors: "所有服务商",
    allServices: "所有服务",
    allChannels: "所有通道",
    win90m: "近 90 分钟",
    win24h: "近 24 小时",
    win7d: "近 7 天",
    win30d: "近 30 天",
    winAll: "全天",
    refresh: "立即刷新",
    refreshing: "刷新中",
  },
  table: {
    vendor: "服务商",
    service: "服务",
    channel: "通道",
    model: "模型",
    price: "价格",
    coverage: "收录天数",
    availability: "可用率",
    lastCheck: "最后监测",
    trend: "可用率趋势",
    trendSuffix: (p) => `[${p}]`,
    defaultChannel: "默认渠道",
    emptyHint:
      "暂无 provider 配置或探测数据。请检查 data/providers.json 或去 /admin 添加。",
    period7d: "近 7 天",
    period15d: "近 15 天",
    period30d: "近 30 天",
  },
  status: {
    operational: "正常",
    degraded: "延迟",
    failed: "异常",
    validationFailed: "验证失败",
    maintenance: "维护中",
    error: "错误",
  },
  meta: {
    lastUpdated: "最后更新",
    providerSummary: (n, interval) => `共 ${n} 个 provider · 探测间隔 ${interval}`,
    unknownTime: "—",
    ver: "Ver.",
  },
};

const en: Dict = {
  header: {
    title: "4i.codes Status",
    subtitle: "Real-time availability matrix for the API gateway",
    langTip: "Language · English",
    themeTip: "Warm paper theme (light only)",
    githubTip: "GitHub · 4icode-status",
    shareTip: "Share 4i.codes",
    promo: `4i.codes — For I, For me
An AI API gateway for developers
Claude / GPT / Gemini / Grok — full lineup
Unified /v1/chat/completions · stable routes · transparent billing
Learn more at https://4i.codes`,
    copy: "Copy",
    copied: "Copied",
    shareTitle: "Share with a friend",
    countTitleOk: "Healthy",
    countTitleBad: "Broken",
    countTitleMaint: "Maintenance",
  },
  filter: {
    allCategories: "All categories",
    allVendors: "All vendors",
    allServices: "All services",
    allChannels: "All channels",
    win90m: "Last 90 min",
    win24h: "Last 24 h",
    win7d: "Last 7 d",
    win30d: "Last 30 d",
    winAll: "All time",
    refresh: "Refresh",
    refreshing: "Refreshing",
  },
  table: {
    vendor: "Vendor",
    service: "Service",
    channel: "Channel",
    model: "Model",
    price: "Price",
    coverage: "Coverage",
    availability: "Uptime",
    lastCheck: "Last check",
    trend: "Uptime trend",
    trendSuffix: (p) => `[${p}]`,
    defaultChannel: "default",
    emptyHint:
      "No providers yet. Add via /admin or check data/providers.json.",
    period7d: "Last 7 d",
    period15d: "Last 15 d",
    period30d: "Last 30 d",
  },
  status: {
    operational: "Healthy",
    degraded: "Degraded",
    failed: "Down",
    validationFailed: "Invalid",
    maintenance: "Maintenance",
    error: "Error",
  },
  meta: {
    lastUpdated: "Last updated",
    providerSummary: (n, interval) => `${n} providers · probe every ${interval}`,
    unknownTime: "—",
    ver: "Ver.",
  },
};

export const DICT: Record<Lang, Dict> = { zh, en };
