import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/admin-auth";

const VALID_ROLES: AdminRole[] = ["super_admin", "manager", "viewer"];

export async function GET() {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data, error } = await db
    .from("admin_users")
    .select("id, email, role, is_active, created_by, created_at")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { email?: string; role?: string };
  if (!body.email?.trim()) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  if (!body.role || !VALID_ROLES.includes(body.role as AdminRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("admin_users")
    .insert({ email: body.email.trim().toLowerCase(), role: body.role, created_by: actor.email })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "This email already has access." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit(req, {
    actorEmail:  actor.email,
    actorRole:   actor.role,
    action:      "user.created",
    entityType:  "admin_user",
    entityId:    data.id,
    entityLabel: data.email,
    changes:     { role: data.role },
  });

  return NextResponse.json(data);
}
