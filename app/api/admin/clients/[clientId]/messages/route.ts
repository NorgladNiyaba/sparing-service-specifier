import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_messages").select("*").eq("client_id", clientId).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadIds = (data ?? []).filter((m) => m.sender === "client" && !m.is_read).map((m) => m.id);
  if (unreadIds.length > 0) await admin.from("client_messages").update({ is_read: true }).in("id", unreadIds);

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("client_messages")
    .insert({ client_id: clientId, sender: "advisor", body: body.trim(), is_read: false })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail: actor.email, actorRole: actor.role,
    action: "message.sent", entityType: "message", entityId: clientId,
  });

  return NextResponse.json(data);
}
