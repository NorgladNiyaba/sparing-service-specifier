import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Folder name is required." }, { status: 400 });

  const parentId = typeof body.parent_id === "string" ? body.parent_id : null;

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_folders").insert({ client_id: clientId, name, parent_id: parentId }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "folder.created", entityType: "folder", entityId: data.id, entityLabel: name,
    changes: { client_id: clientId },
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const folderId = typeof body.id === "string" ? body.id : "";
  if (!folderId) return NextResponse.json({ error: "Folder id required." }, { status: 400 });

  const admin = createAdminClient();

  const { data: folder } = await admin.from("client_folders").select("name").eq("id", folderId).eq("client_id", clientId).single();
  if (!folder) return NextResponse.json({ error: "Folder not found." }, { status: 404 });

  const { error } = await admin.from("client_folders").delete().eq("id", folderId).eq("client_id", clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "folder.deleted", entityType: "folder", entityId: folderId, entityLabel: folder.name,
    changes: { client_id: clientId },
  });

  return NextResponse.json({ ok: true });
}
