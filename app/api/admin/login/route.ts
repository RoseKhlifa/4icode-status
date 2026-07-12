import { NextResponse } from "next/server";
import { getStoredHash, verifyPassword, ensureInitialPassword } from "@/lib/admin/credentials";
import { buildCookie, createSession } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 保底: 首次访问登录时若无密码, 触发初始化
  ensureInitialPassword();

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const password = String(body.password ?? "");
  if (!password) {
    return NextResponse.json({ error: "missing_password" }, { status: 400 });
  }

  const stored = getStoredHash();
  if (!stored) {
    return NextResponse.json({ error: "password_not_initialized" }, { status: 500 });
  }

  if (!verifyPassword(password, stored)) {
    // 简单的抗爆破: 每次失败延迟 500ms
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const { token, expiresAt } = createSession();
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true, expiresAt: expiresAt.toISOString() });
  res.headers.set("Set-Cookie", buildCookie(token, expiresAt, isProd));
  return res;
}
