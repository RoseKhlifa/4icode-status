/**
 * 全局状态管理 (单节点版本)
 *
 * 4i.codes 移除了多节点 leader-election, 仅保留 poller 单例状态与 ping 缓存。
 */

import type { PingCacheEntry } from "../types";

declare global {
  var __checkCxPoller: NodeJS.Timeout | undefined;
  var __checkCxPollerRunning: boolean | undefined;
  var __checkCxLastPingStartedAt: number | undefined;
  var __CHECK_CX_PING_CACHE__: Record<string, PingCacheEntry> | undefined;
}

export function getPollerTimer(): NodeJS.Timeout | undefined {
  return globalThis.__checkCxPoller;
}

export function setPollerTimer(timer: NodeJS.Timeout): void {
  globalThis.__checkCxPoller = timer;
}

export function isPollerRunning(): boolean {
  return globalThis.__checkCxPollerRunning ?? false;
}

export function setPollerRunning(running: boolean): void {
  globalThis.__checkCxPollerRunning = running;
}

export function getLastPingStartedAt(): number | undefined {
  return globalThis.__checkCxLastPingStartedAt;
}

export function setLastPingStartedAt(timestamp: number): void {
  globalThis.__checkCxLastPingStartedAt = timestamp;
}

/**
 * 缓存配置
 */
const PING_CACHE_MAX_SIZE = 10;
const PING_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟

export function getPingCacheStore(): Record<string, PingCacheEntry> {
  if (!globalThis.__CHECK_CX_PING_CACHE__) {
    globalThis.__CHECK_CX_PING_CACHE__ = {};
  }
  return globalThis.__CHECK_CX_PING_CACHE__;
}

function pruneCache(store: Record<string, PingCacheEntry>): void {
  const keys = Object.keys(store);
  const now = Date.now();

  for (const key of keys) {
    const entry = store[key];
    if (now - entry.lastPingAt > PING_CACHE_TTL_MS) {
      delete store[key];
    }
  }

  const remainingKeys = Object.keys(store);
  if (remainingKeys.length > PING_CACHE_MAX_SIZE) {
    const sorted = remainingKeys.sort(
      (a, b) => store[a].lastPingAt - store[b].lastPingAt
    );
    const toRemove = sorted.slice(0, remainingKeys.length - PING_CACHE_MAX_SIZE);
    for (const key of toRemove) delete store[key];
  }
}

export function getPingCacheEntry(key: string): PingCacheEntry {
  const store = getPingCacheStore();
  pruneCache(store);
  if (!store[key]) store[key] = { lastPingAt: 0 };
  return store[key];
}

export function clearPingCache(): void {
  globalThis.__CHECK_CX_PING_CACHE__ = {};
}
