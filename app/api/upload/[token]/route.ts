import { createAdminClient } from "@/lib/supabase/admin";
import { validateFileBytes, secureStoragePath, MAX_FILE_SIZE } from "@/lib/secure-link";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ token: string }> };

async function resolveToken(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("upload_requests")
    .select("*, clients(email)")
    .eq("token", token)
    .single();
  return data as (typeof data & { clients: { email: string } | null }) | null;
}

/** GET — fetch token metadata for the upload page */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const row = await resolveToken(token);

  if (!row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  if (row.revoked) return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const remaining = row.max_files - row.file_count;
  return NextResponse.json({
    label: row.label,
    targetFolderId: row.target_folder_id,
    remaining,
    maxFiles: row.max_files,
  });
}

/** POST — verify email + upload one file */
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  // Re-fetch inside POST for concurrency safety
  const { data: row, error: rowErr } = await admin
    .from("upload_requests")
    .select("*, clients(id, email)")
    .eq("token", token)
    .single() as unknown as { data: { id: string; client_id: string; label: string; target_folder_id: string | null; max_files: number; file_count: number; expires_at: string; revoked: boolean; clients: { id: string; email: string } | null } | null; error: unknown };

  if (rowErr || !row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  if (row.revoked) return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const formData = await request.formData();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  const file = formData.get("file") as File | null;

  if (!email || !file) return NextResponse.json({ error: "Missing email or file." }, { status: 400 });

  // Email verification
  const clientEmail = row.clients?.email?.trim().toLowerCase();
  if (!clientEmail || email !== clientEmail) {
    return NextResponse.json({ error: "The email you entered doesn't match our records for this link." }, { status: 403 });
  }

  // Atomic capacity check using UPDATE ... WHERE file_count < max_files
  const { data: updated, error: capErr } = await admin
    .from("upload_requests")
    .update({ file_count: row.file_count + 1 } as Record<string, unknown>)
    .eq("id", row.id)
    .lt("file_count", row.max_files)
    .select("file_count")
    .maybeSingle() as unknown as { data: { file_count: number } | null; error: unknown };

  if (capErr || !updated) {
    return NextResponse.json({ error: "Upload limit reached for this link." }, { status: 409 });
  }

  // File validation
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File exceeds 50 MB limit." }, { status: 413 });
  const arrayBuffer = await file.arrayBuffer();
  const header = new Uint8Array(arrayBuffer.slice(0, 8));
  const validationError = validateFileBytes(file.name, file.size, header);
  if (validationError) {
    // Roll back the counter increment on validation failure
    await admin.from("upload_requests")
      .update({ file_count: row.file_count } as Record<string, unknown>)
      .eq("id", row.id);
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // Store with opaque path (no original filename)
  const storagePath = secureStoragePath(row.client_id, file.name, "uploads");
  const { error: storageError } = await admin.storage
    .from("client-documents")
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (storageError) {
    await admin.from("upload_requests")
      .update({ file_count: row.file_count } as Record<string, unknown>)
      .eq("id", row.id);
    return NextResponse.json({ error: "Storage upload failed." }, { status: 500 });
  }

  const { data: doc, error: insertError } = await admin
    .from("client_documents")
    .insert({
      client_id: row.client_id,
      name: file.name,
      type: "Upload",
      storage_path: storagePath,
      size_bytes: file.size,
      folder_id: row.target_folder_id,
      is_seen: true,
    } as Record<string, unknown>)
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const remaining = row.max_files - updated.file_count;
  return NextResponse.json({ doc, remaining });
}
