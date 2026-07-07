import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("advisor_id")
    .eq("id", session.clientId)
    .maybeSingle();

  if (client?.advisor_id) {
    const { data: advisor } = await admin
      .from("advisors")
      .select("name, email, title")
      .eq("id", client.advisor_id)
      .maybeSingle();

    if (advisor) {
      return NextResponse.json({ name: advisor.name, email: advisor.email, title: advisor.title });
    }
  }

  return NextResponse.json({ name: ADVISOR_NAME, email: ADVISOR_EMAIL, title: "Advisor" });
}
