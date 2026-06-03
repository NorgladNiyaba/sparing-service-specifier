import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get the client's advisor_id
  const { data: client } = await admin
    .from("clients")
    .select("advisor_id")
    .eq("auth_user_id", user.id)
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

  // Fallback to env-var defaults (Mireille Bakal)
  return NextResponse.json({ name: ADVISOR_NAME, email: ADVISOR_EMAIL, title: "Advisor" });
}
