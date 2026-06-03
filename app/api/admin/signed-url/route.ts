import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const path = request.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  if (path === "__contract__") {
    return NextResponse.json({ url: null, isContract: true });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("client-documents")
    .createSignedUrl(path, 600);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl });
}
