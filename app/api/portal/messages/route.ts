import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

async function getPortalClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, clientId: null };

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return { user, clientId: client?.id ?? null };
}

export async function GET() {
  const { clientId } = await getPortalClient();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_messages")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark all unread advisor messages as read
  const unreadIds = (data ?? [])
    .filter((m) => m.sender === "advisor" && !m.is_read)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await admin.from("client_messages").update({ is_read: true }).in("id", unreadIds);
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { clientId } = await getPortalClient();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json() as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("client_messages")
    .insert({ client_id: clientId, sender: "client", body: body.trim(), is_read: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
