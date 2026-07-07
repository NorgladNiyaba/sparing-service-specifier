import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_messages")
    .select("*")
    .eq("client_id", session.clientId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unreadIds = (data ?? [])
    .filter((m) => m.sender === "advisor" && !m.is_read)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await admin.from("client_messages").update({ is_read: true }).in("id", unreadIds);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_messages")
    .insert({ client_id: session.clientId, sender: "client", body: body.trim(), is_read: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
