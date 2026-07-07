import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ clientId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_notes")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Note body required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_notes")
    .insert({ client_id: clientId, author_email: actor.email, body: body.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "note.created", entityType: "note", entityId: data.id,
    entityLabel: body.trim().slice(0, 60),
    changes: { client_id: clientId },
  });

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const { id, body } = await req.json() as { id?: string; body?: string };
  if (!id || !body?.trim()) return NextResponse.json({ error: "id and body required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin.from("client_notes").select("author_email, body").eq("id", id).eq("client_id", clientId).single();
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (existing.author_email !== actor.email && actor.role !== "super_admin") {
    return NextResponse.json({ error: "You can only edit your own notes" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("client_notes")
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("client_id", clientId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "note.edited", entityType: "note", entityId: id,
    entityLabel: body.trim().slice(0, 60),
    changes: { body: { from: existing.body.slice(0, 100), to: body.trim().slice(0, 100) } },
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin.from("client_notes").select("author_email, body").eq("id", id).eq("client_id", clientId).single();
  if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });
  if (existing.author_email !== actor.email && actor.role !== "super_admin") {
    return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
  }

  const { error } = await admin.from("client_notes").delete().eq("id", id).eq("client_id", clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "note.deleted", entityType: "note", entityId: id,
    entityLabel: existing.body.slice(0, 60),
    changes: { client_id: clientId },
  });

  return NextResponse.json({ ok: true });
}
