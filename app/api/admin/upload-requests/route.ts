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

  const { clientId, label, targetFolder, maxFiles, expiryDays } = await request.json();
  if (!clientId || !label || !targetFolder || !maxFiles || !expiryDays) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiryDays * 86_400_000).toISOString();

  const { data, error } = await admin
    .from("upload_requests")
    .insert({ token, client_id: clientId, label, target_folder: targetFolder, max_files: maxFiles, expires_at: expiresAt })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return NextResponse.json({ ...data, url: `${origin}/upload/${token}` });
}

export async function GET(request: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("upload_requests")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
