import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page       = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit      = Math.min(50, parseInt(searchParams.get("limit") ?? "50", 10));
  const offset     = (page - 1) * limit;
  const actorFilter  = searchParams.get("actor")  ?? "";
  const actionFilter = searchParams.get("action") ?? "";
  const entityFilter = searchParams.get("entity") ?? "";
  const from         = searchParams.get("from")   ?? "";
  const to           = searchParams.get("to")     ?? "";

  const db = createAdminClient();
  let q = db
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Managers can only see their own actions
  if (actor.role === "manager") q = q.eq("actor_email", actor.email);
  else if (actorFilter)         q = q.ilike("actor_email", `%${actorFilter}%`);

  if (actionFilter) q = q.ilike("action", `%${actionFilter}%`);
  if (entityFilter) q = q.ilike("entity_type", `%${entityFilter}%`);
  if (from)         q = q.gte("created_at", from);
  if (to)           q = q.lte("created_at", to + "T23:59:59.999Z");

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
}
