import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("advisors").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { name?: string; email?: string; title?: string; microsoft_email?: string };
  if (!body.name?.trim() || !body.email?.trim()) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return NextResponse.json({ error: "Invalid email address." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisors")
    .insert({ name: body.name.trim(), email: body.email.trim(), title: body.title?.trim() || "Advisor", microsoft_email: body.microsoft_email?.trim() || null })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, { actorEmail: actor.email, actorRole: actor.role, action: "advisor.created", entityType: "advisor", entityId: data.id, entityLabel: data.name });
  return NextResponse.json(data);
}
