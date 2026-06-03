import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search")?.trim() ?? "";
  const track     = searchParams.get("track") ?? "";
  const dormant   = searchParams.get("dormant") === "1";
  const sortField = searchParams.get("sortField") ?? "signed_at";
  const sortDir   = searchParams.get("sortDir") === "asc";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit     = Math.min(100, parseInt(searchParams.get("limit") ?? "25", 10));
  const offset    = (page - 1) * limit;

  const admin = createAdminClient();

  // Build clients query
  let q = admin
    .from("clients")
    .select("id, full_name, email, company_name, service_track, monthly_price, payment_schedule, signed_at, advisor_id, advisors(id, name)", { count: "exact" })
    .order(sortField, { ascending: sortDir })
    .range(offset, offset + limit - 1);

  if (search) {
    q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
  }
  if (track) q = q.eq("service_track" as string, track);

  const [clientsRes, unreadRes, lastActivityRes] = await Promise.all([
    q,
    admin.from("client_documents").select("client_id").eq("is_seen" as string, false),
    admin.from("client_documents")
      .select("client_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (clientsRes.error) return NextResponse.json({ error: clientsRes.error.message }, { status: 500 });

  const unreadByClient = (unreadRes.data ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.client_id] = (acc[d.client_id] ?? 0) + 1;
    return acc;
  }, {});

  // Last activity per client (first row per client_id since ordered desc)
  const lastActivityMap = new Map<string, string>();
  for (const row of (lastActivityRes.data ?? [])) {
    if (!lastActivityMap.has(row.client_id)) {
      lastActivityMap.set(row.client_id, row.created_at);
    }
  }

  const dormantThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let data = (clientsRes.data ?? []).map((c) => {
    const lastActivity = lastActivityMap.get(c.id) ?? null;
    const isDormant = !lastActivity || new Date(lastActivity).getTime() < dormantThreshold;
    const advisor = (c as Record<string, unknown>).advisors as { id: string; name: string } | null;
    return {
      ...c,
      advisors:      undefined,
      advisor_name:  advisor?.name ?? null,
      unread_count:  unreadByClient[c.id] ?? 0,
      last_activity: lastActivity,
      is_dormant:    isDormant,
    };
  });

  if (dormant) data = data.filter((c) => c.is_dormant);

  return NextResponse.json({ data, total: clientsRes.count ?? 0, page, limit });
}
