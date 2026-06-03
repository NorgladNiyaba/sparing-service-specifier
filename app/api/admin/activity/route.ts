import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId   = searchParams.get("clientId");
  const unseenOnly = searchParams.get("unseen") === "1";
  const type       = searchParams.get("type") ?? "";
  const from       = searchParams.get("from") ?? "";
  const to         = searchParams.get("to") ?? "";
  const page       = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit      = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset     = (page - 1) * limit;

  const admin = createAdminClient();

  const [clientsRes, docsRes] = await Promise.all([
    admin.from("clients").select("id, full_name, company_name"),
    (() => {
      let q = admin
        .from("client_documents")
        .select("id, client_id, name, folder, is_seen, created_at, size_bytes, type", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (clientId)   q = q.eq("client_id" as string, clientId);
      if (unseenOnly) q = q.eq("is_seen" as string, false);
      if (type)       q = q.eq("type" as string, type);
      if (from)       q = q.gte("created_at" as string, from);
      if (to)         q = q.lte("created_at" as string, to + "T23:59:59.999Z");
      return q;
    })(),
  ]);

  const clientMap = new Map((clientsRes.data ?? []).map((c) => [c.id, c]));
  const docs = (docsRes.data ?? []).map((d) => ({
    id:            d.id,
    clientId:      d.client_id,
    clientName:    clientMap.get(d.client_id)?.full_name ?? "Unknown",
    clientCompany: clientMap.get(d.client_id)?.company_name ?? null,
    name:          d.name,
    folder:        d.folder,
    type:          d.type,
    isSeen:        d.is_seen,
    sizeBytes:     d.size_bytes,
    createdAt:     d.created_at,
  }));

  return NextResponse.json({ data: docs, total: docsRes.count ?? 0, page, limit });
}

// PATCH /api/admin/activity — mark documents as seen
// Body: { ids: string[] } or { all: true, clientId?: string }
export async function PATCH(req: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { ids?: string[]; all?: boolean; clientId?: string };
  const admin = createAdminClient();

  if (body.all) {
    let q = admin.from("client_documents").update({ is_seen: true }).eq("is_seen" as string, false);
    if (body.clientId) q = q.eq("client_id" as string, body.clientId);
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (body.ids?.length) {
    const { error } = await admin
      .from("client_documents")
      .update({ is_seen: true })
      .in("id", body.ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
