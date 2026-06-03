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

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_folders").insert({ client_id: clientId, name }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "folder.created", entityType: "folder", entityId: data.id, entityLabel: name,
    changes: { client_id: clientId },
  });

  return NextResponse.json(data);
}
