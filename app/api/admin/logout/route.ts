import { NextResponse } from "next/server";
import { buildClearCookie, destroySession, getSessionToken } from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const token = await getSessionToken();
  destroySession(token);
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookie(isProd));
  return res;
}
