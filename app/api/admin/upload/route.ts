import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";
import { sendNewDocumentNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file     = formData.get("file") as File | null;
  const clientId = formData.get("clientId") as string;
  const folderId = formData.get("folder_id") as string;
  const docName  = (formData.get("name") as string) || file?.name || "Untitled";
  const docType  = (formData.get("type") as string) || "Report";

  if (!file || !clientId || !folderId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const timestamp = Date.now();
  const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${clientId}/${timestamp}_${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from("client-documents")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: doc, error: insertError } = await admin
    .from("client_documents")
    .insert({ client_id: clientId, name: docName, type: docType, storage_path: storagePath, folder_id: folderId, size_bytes: file.size, is_seen: false })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  logAudit(request, {
    actorEmail:  actor.email,
    actorRole:   actor.role,
    action:      "document.uploaded",
    entityType:  "document",
    entityId:    doc.id,
    entityLabel: docName,
    changes:     { folder_id: folderId, type: docType, size_bytes: file.size },
  });

  // Email notification (non-blocking)
  const { data: client } = await admin.from("clients").select("full_name, email, auth_user_id").eq("id", clientId).maybeSingle();
  if (client?.email) {
    const { data: folderRow } = await admin.from("client_folders").select("name").eq("id", folderId).maybeSingle();
    const folderName = folderRow?.name ?? "Documents";
    let notifyEnabled = true;
    if (client.auth_user_id) {
      const { data: userData } = await admin.auth.admin.getUserById(client.auth_user_id);
      notifyEnabled = userData?.user?.user_metadata?.notifications_new_documents !== false;
    }
    if (notifyEnabled) {
      void sendNewDocumentNotification({ toEmail: client.email, toName: client.full_name, docName, folder: folderName, docType, advisorName: ADVISOR_NAME, advisorEmail: ADVISOR_EMAIL });
    }
  }

  return NextResponse.json(doc);
}
