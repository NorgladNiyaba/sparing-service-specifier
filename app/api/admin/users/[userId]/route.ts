import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminRole } from "@/lib/admin-auth";

const VALID_ROLES: AdminRole[] = ["super_admin", "manager", "viewer"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const actor = await getAdminUser();
  if (actor?.role !== "super_admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json() as { role?: string; is_active?: boolean };

  // Prevent super admin from demoting themselves
  const db = createAdminClient();
  const { data: target } = await db.from("admin_users").select("email, role, is_active").eq("id", userId).single();
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.email === actor.email && body.role && body.role !== "super_admin") {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }
  if (target.email === actor.email && body.is_active === false) {
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  }
  if (body.role && !VALID_ROLES.includes(body.role as AdminRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.role      !== undefined) patch.role      = body.role;
  if (body.is_active !== undefined) patch.is_active = body.is_active;

  const { data, error } = await db.from("admin_users").update(patch).eq("id", userId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  if (body.role      !== undefined) changes.role      = { from: target.role,      to: body.role };
  if (body.is_active !== undefined) changes.is_active = { from: target.is_active, to: body.is_active };

  logAudit(req, {
    actorEmail:  actor.email,
    actorRole:   actor.role,
    action:      "user.updated",
    entityType:  "admin_user",
    entityId:    userId,
    entityLabel: target.email,
    changes,
  });

  return NextResponse.json(data);
}
