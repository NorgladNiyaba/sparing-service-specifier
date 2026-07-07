import { getAdminUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("contact_client_access")
    .select("id, role, created_at, contacts(id, full_name, email)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const { email, role = "member" } = await req.json() as { email?: string; role?: string };
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (!contact) {
    return NextResponse.json(
      { error: "No contact found with that email. They must have logged into the portal at least once." },
      { status: 404 }
    );
  }

  const { data, error } = await admin
    .from("contact_client_access")
    .insert({ contact_id: contact.id, client_id: clientId, role })
    .select("id, role, created_at, contacts(id, full_name, email)")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "This contact already has access." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clientId } = await params;
  const { accessId } = await req.json() as { accessId?: string };
  if (!accessId) return NextResponse.json({ error: "accessId required" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("contact_client_access")
    .delete()
    .eq("id", accessId)
    .eq("client_id", clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
