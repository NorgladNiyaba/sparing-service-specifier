import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

type Params = { params: Promise<{ token: string }> };

/** GET — validate token + return share mode info */
export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("document_shares")
    .select("id, revoked, expires_at, share_mode, share_password")
    .eq("token", token)
    .single();

  if (!row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  if (row.revoked) return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  return NextResponse.json({
    valid: true,
    mode: row.share_mode ?? "internal",
    hasPassword: !!(row.share_password),
  });
}

/** POST — verify access (email for internal, password for external), return signed URL */
export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const admin = createAdminClient();

  const body = await request.json() as { email?: string; password?: string };

  const { data: row } = await admin
    .from("document_shares")
    .select("id, revoked, expires_at, document_id, client_id, access_count, share_mode, share_password, clients(email), client_documents(name, storage_path)")
    .eq("token", token)
    .single() as unknown as {
      data: {
        id: string; revoked: boolean; expires_at: string;
        document_id: string; client_id: string; access_count: number;
        share_mode: string | null; share_password: string | null;
        clients: { email: string } | null;
        client_documents: { name: string; storage_path: string } | null;
      } | null
    };

  if (!row) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  if (row.revoked) return NextResponse.json({ error: "This link has been revoked." }, { status: 410 });
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  const mode = row.share_mode ?? "internal";

  if (mode === "internal") {
    const normalizedEmail = body.email?.trim().toLowerCase();
    if (!normalizedEmail) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    const clientEmail = row.clients?.email?.trim().toLowerCase();
    if (!clientEmail || normalizedEmail !== clientEmail) {
      return NextResponse.json({ error: "The email you entered doesn't match our records for this link." }, { status: 403 });
    }
  } else {
    if (row.share_password) {
      if (!body.password) return NextResponse.json({ error: "Password is required." }, { status: 400 });
      if (body.password !== row.share_password) {
        return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
      }
    }
  }

  const doc = row.client_documents;
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const now = new Date().toISOString();
  await admin.from("document_shares").update({
    access_count: row.access_count + 1,
    last_accessed_at: now,
    ...(row.access_count === 0 ? { first_accessed_at: now } : {}),
  } as Record<string, unknown>).eq("id", row.id);

  const { data: signed, error: signedError } = await admin.storage
    .from("client-documents")
    .createSignedUrl(doc.storage_path, 90, { download: doc.name });

  if (signedError) return NextResponse.json({ error: `Could not generate download link: ${signedError.message}` }, { status: 500 });

  return NextResponse.json({ name: doc.name, signedUrl: signed.signedUrl });
}
