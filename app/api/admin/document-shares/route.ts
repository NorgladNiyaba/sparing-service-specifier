import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/secure-link";
import { getAdminUser } from "@/lib/admin-auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId, clientId, expiryDays, mode, password } = await request.json() as {
    documentId: string; clientId: string; expiryDays: number;
    mode?: "internal" | "external"; password?: string;
  };
  if (!documentId || !clientId || !expiryDays) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("client_documents")
    .select("storage_path")
    .eq("id", documentId)
    .single();

  if (!doc || doc.storage_path === "__contract__") {
    return NextResponse.json({ error: "This document cannot be shared — it has no downloadable file." }, { status: 400 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("document_shares")
    .insert({
      token,
      document_id: documentId,
      client_id: clientId,
      expires_at: expiresAt,
      share_mode: mode ?? "internal",
      share_password: mode === "external" && password ? password : null,
    } as Record<string, unknown>)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ...data, url: `${origin}/share/${token}` });
}
