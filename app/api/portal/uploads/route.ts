import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

async function getCollectionFolderId(admin: ReturnType<typeof createAdminClient>, clientId: string) {
  const { data } = await admin
    .from("client_folders")
    .select("id")
    .eq("client_id", clientId)
    .eq("name", "Collection Files")
    .is("parent_id", null)
    .maybeSingle();
  return data?.id as string | undefined;
}

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const folderId = await getCollectionFolderId(admin, session.clientId);
  if (!folderId) return NextResponse.json([]);

  const { data, error } = await admin
    .from("client_documents")
    .select("*")
    .eq("client_id", session.clientId)
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, storage_path, size_bytes } = await req.json() as {
    name: string; storage_path: string; size_bytes: number;
  };
  if (!name || !storage_path) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = createAdminClient();
  const folderId = await getCollectionFolderId(admin, session.clientId);

  const { data, error } = await admin
    .from("client_documents")
    .insert({
      client_id:    session.clientId,
      name,
      type:         "Upload",
      storage_path,
      size_bytes,
      folder_id:    folderId ?? null,
      is_seen:      true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json() as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("client_documents")
    .select("storage_path, type")
    .eq("id", id)
    .eq("client_id", session.clientId)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (doc.type !== "Upload") return NextResponse.json({ error: "Only uploads can be deleted" }, { status: 403 });

  if (doc.storage_path && doc.storage_path !== "__contract__") {
    await admin.storage.from("client-documents").remove([doc.storage_path]);
  }

  const { error } = await admin.from("client_documents").delete().eq("id", id).eq("client_id", session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
