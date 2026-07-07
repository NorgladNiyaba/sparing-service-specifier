import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [foldersRes, docsRes] = await Promise.all([
    admin.from("client_folders").select("*").eq("client_id", session.clientId).order("name"),
    admin.from("client_documents").select("*").eq("client_id", session.clientId).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    folders:   foldersRes.data ?? [],
    documents: docsRes.data   ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("client_documents").update({ is_seen: true }).eq("id", id).eq("client_id", session.clientId);

  return NextResponse.json({ ok: true });
}
