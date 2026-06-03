import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ advisorId: string }> }) {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { advisorId } = await params;

  const body = await req.json() as { name?: string; email?: string; title?: string; microsoft_email?: string | null; is_active?: boolean };
  if (body.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: current } = await admin.from("advisors").select("name, email, title, is_active").eq("id", advisorId).maybeSingle();

  const patch: Record<string, unknown> = {};
  if (body.name            !== undefined) patch.name            = body.name.trim();
  if (body.email           !== undefined) patch.email           = body.email.trim();
  if (body.title           !== undefined) patch.title           = body.title.trim() || "Advisor";
  if (body.microsoft_email !== undefined) patch.microsoft_email = body.microsoft_email?.trim() || null;
  if (body.is_active       !== undefined) patch.is_active       = body.is_active;

  const { data, error } = await admin.from("advisors").update(patch).eq("id", advisorId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  Object.keys(patch).forEach((k) => { changes[k] = { from: (current as Record<string, unknown>)?.[k], to: patch[k] }; });

  logAudit(req, { actorEmail: actor.email, actorRole: actor.role, action: "advisor.updated", entityType: "advisor", entityId: advisorId, entityLabel: current?.name ?? advisorId, changes });
  return NextResponse.json(data);
}
