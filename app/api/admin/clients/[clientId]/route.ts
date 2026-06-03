import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const admin = createAdminClient();

  const [clientRes, foldersRes, docsRes] = await Promise.all([
    admin.from("clients").select("*").eq("id", clientId).single(),
    admin.from("client_folders").select("*").eq("client_id", clientId).order("name"),
    admin.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
  ]);

  if (clientRes.error) return NextResponse.json({ error: clientRes.error.message }, { status: 404 });

  return NextResponse.json({ client: clientRes.data, folders: foldersRes.data ?? [], documents: docsRes.data ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Fetch current values for diff
  const admin = createAdminClient();
  const { data: current } = await admin.from("clients").select("full_name, internal_notes, advisor_id").eq("id", clientId).maybeSingle();

  const patch: Record<string, unknown> = {};
  if (typeof body.internal_notes === "string") patch.internal_notes = body.internal_notes;
  if ("advisor_id" in body) patch.advisor_id = body.advisor_id ?? null;

  const { error } = await admin.from("clients").update(patch).eq("id", clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Build changes diff
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if ("internal_notes" in patch) changes.internal_notes = { from: current?.internal_notes, to: patch.internal_notes };
  if ("advisor_id"     in patch) changes.advisor_id     = { from: current?.advisor_id,    to: patch.advisor_id };

  logAudit(req, {
    actorEmail:  actor.email,
    actorRole:   actor.role,
    action:      "client.updated",
    entityType:  "client",
    entityId:    clientId,
    entityLabel: current?.full_name ?? clientId,
    changes,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const admin = createAdminClient();

  const { data: client, error: clientErr } = await admin.from("clients").select("auth_user_id, full_name").eq("id", clientId).single();
  if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 404 });

  if (client.auth_user_id) {
    const { error: authErr } = await admin.auth.admin.deleteUser(client.auth_user_id);
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });
  } else {
    await admin.from("clients").delete().eq("id", clientId);
  }

  logAudit(req, {
    actorEmail:  actor.email,
    actorRole:   actor.role,
    action:      "client.deleted",
    entityType:  "client",
    entityId:    clientId,
    entityLabel: client.full_name,
  });

  return NextResponse.json({ success: true });
}
