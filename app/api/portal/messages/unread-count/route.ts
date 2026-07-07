import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const { count } = await admin
    .from("client_messages")
    .select("id", { count: "exact", head: true })
    .eq("client_id", session.clientId)
    .eq("sender", "advisor")
    .eq("is_read", false);

  return NextResponse.json({ count: count ?? 0 });
}
