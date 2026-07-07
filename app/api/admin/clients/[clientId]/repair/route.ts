import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setupClient } from "@/app/api/portal/setup-contact/route";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const admin = createAdminClient();

  // Get the auth_user_id from the clients table
  const { data: client } = await admin
    .from("clients")
    .select("auth_user_id, full_name, email")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.auth_user_id) return NextResponse.json({ error: "Client has no auth user — cannot repair." }, { status: 400 });

  const result = await setupClient(clientId, client.auth_user_id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "client.repaired", entityType: "client", entityId: clientId,
    entityLabel: client.full_name,
    changes: {},
  });

  return NextResponse.json({ ok: true });
}
