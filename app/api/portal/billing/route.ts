import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email           = typeof body.email           === "string" ? body.email.trim()           : undefined;
  const billing_address = typeof body.billing_address === "string" ? body.billing_address.trim() : undefined;
  const billing_zip     = typeof body.billing_zip     === "string" ? body.billing_zip.trim()     : undefined;

  if (email !== undefined && email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if (email           !== undefined) patch.email           = email           || null;
  if (billing_address !== undefined) patch.billing_address = billing_address || null;
  if (billing_zip     !== undefined) patch.billing_zip     = billing_zip     || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("clients").update(patch).eq("id", session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
