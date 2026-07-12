/**
 * 管理端会话
 *
 * - Session token 存 SQLite (admin_sessions), 24 小时过期
 * - 用 httpOnly + SameSite=Lax + secure(prod) cookie 承载 token
 * - 无需 SESSION_SECRET: token 直接是随机 32 字节
 */

import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "../database/sqlite";

export const COOKIE_NAME = "4icode_status_admin";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

interface SessionRow {
  token: string;
  created_at: string;
  expires_at: string;
}

function pruneExpired(): void {
  const db = getDb();
  db.prepare(`DELETE FROM admin_sessions WHERE expires_at <= datetime('now')`).run();
}

export function createSession(): { token: string; expiresAt: Date } {
  pruneExpired();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);
  getDb()
    .prepare(
      `INSERT INTO admin_sessions (token, created_at, expires_at) VALUES (?, ?, ?)`
    )
    .run(token, now.toISOString(), expires.toISOString());
  return { token, expiresAt: expires };
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  pruneExpired();
  const row = getDb()
    .prepare<[string], SessionRow>(
      `SELECT token, created_at, expires_at FROM admin_sessions WHERE token = ?`
    )
    .get(token);
  if (!row) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export function destroySession(token: string | undefined): void {
  if (!token) return;
  getDb().prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(token);
}

/**
 * 从 request cookies 里读取当前会话 token
 * 在 route handler 里用: `const token = await getSessionToken();`
 */
export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

/**
 * 在 route handler 里用: `if (!(await requireAuth())) return unauthorized();`
 */
export async function requireAuth(): Promise<boolean> {
  const token = await getSessionToken();
  return verifySession(token);
}

/**
 * 判断当前请求是不是 https
 *
 * 支持 3 种来源:
 *   - X-Forwarded-Proto (nginx 反代常见)
 *   - Forwarded (RFC 7239)
 *   - request.url 的 protocol
 *
 * 只有真的 https 才在 cookie 上加 Secure 标记, 否则 http 直连会静默丢 cookie.
 */
export function isRequestSecure(request: Request): boolean {
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ??
    request.headers.get("x-forwarded-protocol");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim().toLowerCase() === "https";
  }
  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    // e.g. "for=1.2.3.4;proto=https"
    const m = forwarded.match(/proto=([^;,\s]+)/i);
    if (m) return m[1].toLowerCase() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 用于构造 Set-Cookie header 值
 * isSecure 决定要不要加 Secure 标记 (http 直连必须 false, 否则浏览器会丢 cookie)
 */
export function buildCookie(token: string, expiresAt: Date, isSecure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (isSecure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie(isSecure: boolean): string {
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  ];
  if (isSecure) parts.push("Secure");
  return parts.join("; ");
}
