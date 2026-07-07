import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export const DEFAULT_FOLDERS = [
  "Contract",
  "Agency Notices & Resolutions",
  "Assets",
  "Benefits Policy & Notices",
  "Collection Files",
  "Compliance",
  "Forms",
  "Human Resources",
  "Inquiry",
  "Monthly Accounting",
  "Monthly Check, Cash and Other Payments",
  "Other Services",
  "Payroll",
  "Payroll Quarterly & Annual Filings",
  "Quarterly Accounting",
  "Receipts",
  "Sparing Invoices",
  "Tax Credits",
  "Taxes",
  "Weekly Accomplishments",
];

export async function setupClient(clientId: string, authUserId: string, serviceTrack?: string) {
  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("email, full_name, service_track")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { error: "Client not found" };

  // 1. Idempotent folder creation — only create what doesn't exist yet
  const { data: existingFolders } = await admin
    .from("client_folders")
    .select("id, name")
    .eq("client_id", clientId)
    .is("parent_id", null);

  const existingNames = new Set((existingFolders ?? []).map((f) => f.name));

  // Remove legacy "Client Uploads" folder if still present
  const legacyFolder = (existingFolders ?? []).find((f) => f.name === "Client Uploads");
  if (legacyFolder) {
    await admin.from("client_folders").delete().eq("id", legacyFolder.id);
    existingNames.delete("Client Uploads");
  }

  const toCreate = DEFAULT_FOLDERS.filter((name) => !existingNames.has(name));
  let allFolders = existingFolders?.filter((f) => f.name !== "Client Uploads") ?? [];

  if (toCreate.length > 0) {
    const { data: created } = await admin
      .from("client_folders")
      .insert(toCreate.map((name) => ({ client_id: clientId, name })))
      .select("id, name");
    allFolders = [...allFolders, ...(created ?? [])];
  }

  // 2. Contract document — create if missing, fix folder_id if null
  const contractFolder = allFolders.find((f) => f.name === "Contract");
  const contractFolderId = contractFolder?.id ?? null;
  const track = serviceTrack ?? client.service_track ?? "SERVICE";

  const { data: existingDoc } = await admin
    .from("client_documents")
    .select("id, folder_id")
    .eq("client_id", clientId)
    .eq("storage_path", "__contract__")
    .maybeSingle();

  if (!existingDoc) {
    await admin.from("client_documents").insert({
      client_id:    clientId,
      name:         `Service Agreement — ${track}`,
      type:         "Contract",
      storage_path: "__contract__",
      folder_id:    contractFolderId,
      is_seen:      false,
    });
  } else if (!existingDoc.folder_id && contractFolderId) {
    await admin
      .from("client_documents")
      .update({ folder_id: contractFolderId })
      .eq("id", existingDoc.id);
  }

  // 3. Upsert contacts row
  const { data: contact, error: contactError } = await admin
    .from("contacts")
    .upsert(
      { auth_user_id: authUserId, email: client.email, full_name: client.full_name },
      { onConflict: "auth_user_id" }
    )
    .select("id")
    .single();

  if (contactError) return { error: contactError.message };

  // 4. Upsert contact_client_access
  const { error: accessError } = await admin
    .from("contact_client_access")
    .upsert(
      { contact_id: contact.id, client_id: clientId, role: "owner" },
      { onConflict: "contact_id,client_id" }
    );

  if (accessError) return { error: accessError.message };

  return { ok: true };
}

export async function POST(req: NextRequest) {
  const { clientId, authUserId, serviceTrack } = await req.json() as {
    clientId?: string;
    authUserId?: string;
    serviceTrack?: string;
  };

  if (!clientId || !authUserId) {
    return NextResponse.json({ error: "clientId and authUserId required" }, { status: 400 });
  }

  const result = await setupClient(clientId, authUserId, serviceTrack);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
