import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin/session";
import { listProviders, upsertProvider } from "@/lib/admin/providers-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  if (!(await requireAuth())) return unauthorized();
  return NextResponse.json({ providers: listProviders() });
}

interface UpsertBody {
  originalKey?: { name: string; groupName?: string | null; model: string };
  entry: {
    name: string;
    type: string;
    endpoint: string;
    model: string;
    apiKey?: string;
    enabled?: boolean;
    is_maintenance?: boolean;
    groupName?: string | null;
    category?: string | null;
    vendor?: string | null;
    service?: string | null;
    models?: string[];
    priceRatio?: string | null;
    priceHint?: string | null;
    iconKey?: string | null;
    baselineDays?: number | null;
    disguise?: string | null;
  };
}

export async function POST(request: Request) {
  if (!(await requireAuth())) return unauthorized();
  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const e = body.entry;
  if (!e?.name || !e?.type || !e?.endpoint || !e?.model) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  // 新增场景必须给 apiKey
  if (!body.originalKey && !e.apiKey?.trim()) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 400 });
  }

  const summary = await upsertProvider({
    originalKey: body.originalKey,
    entry: {
      name: e.name,
      type: e.type,
      endpoint: e.endpoint,
      model: e.model,
      apiKey: e.apiKey?.trim() || "",
      enabled: e.enabled,
      is_maintenance: e.is_maintenance,
      groupName: e.groupName ?? undefined,
      category: e.category ?? undefined,
      vendor: e.vendor ?? undefined,
      service: e.service ?? undefined,
      models: e.models ?? undefined,
      priceRatio: e.priceRatio ?? undefined,
      priceHint: e.priceHint ?? undefined,
      iconKey: e.iconKey ?? undefined,
      baselineDays: typeof e.baselineDays === "number" ? e.baselineDays : undefined,
      disguise: e.disguise ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, provider: summary });
}

interface DeleteBody {
  key: { name: string; groupName?: string | null; model: string };
}

export async function DELETE(request: Request) {
  if (!(await requireAuth())) return unauthorized();
  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.key?.name || !body.key?.model) {
    return NextResponse.json({ error: "missing_key" }, { status: 400 });
  }
  const { deleteProvider } = await import("@/lib/admin/providers-store");
  const ok = await deleteProvider(body.key);
  return NextResponse.json({ ok });
}
