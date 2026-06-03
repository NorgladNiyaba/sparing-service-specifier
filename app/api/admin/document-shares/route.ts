import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/secure-link";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === process.env.ADMIN_EMAIL;
}

export async function POST(request: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId, clientId, expiryDays } = await request.json();
  if (!documentId || !clientId || !expiryDays) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("document_shares")
    .insert({ token, document_id: documentId, client_id: clientId, expires_at: expiresAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ...data, url: `${origin}/share/${token}` });
}
