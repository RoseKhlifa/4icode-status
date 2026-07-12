import { NextResponse } from "next/server";
import {
  buildClearCookie,
  destroySession,
  getSessionToken,
  isRequestSecure,
} from "@/lib/admin/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = await getSessionToken();
  destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildClearCookie(isRequestSecure(request)));
  return res;
}
