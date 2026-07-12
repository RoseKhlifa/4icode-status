import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin/session";
import { getStoredHash, setPassword, verifyPassword } from "@/lib/admin/credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const current = String(body.currentPassword ?? "");
  const next = String(body.newPassword ?? "");

  if (!current || !next) {
    return NextResponse.json({ error: "missing_password_fields" }, { status: 400 });
  }
  if (next.length < 6) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const stored = getStoredHash();
  if (!stored) {
    return NextResponse.json({ error: "no_password_set" }, { status: 500 });
  }
  if (!verifyPassword(current, stored)) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "wrong_current_password" }, { status: 401 });
  }

  setPassword(next);
  return NextResponse.json({ ok: true });
}
