import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_records").select("*").eq("client_id", clientId).order("period_key", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const actor = await getAdminUser();
  if (!actor || actor.role === "viewer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { clientId } = await params;

  const body = await req.json() as { periodKey: string; amount: number; status: "paid" | "pending" | "overdue"; paidAt?: string | null; note?: string | null };
  if (!body.periodKey || !body.status || !body.amount) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: current } = await admin.from("payment_records").select("status").eq("client_id", clientId).eq("period_key", body.periodKey).maybeSingle();

  const { data, error } = await admin
    .from("payment_records")
    .upsert({ client_id: clientId, period_key: body.periodKey, amount: body.amount, status: body.status, paid_at: body.status === "paid" ? (body.paidAt ?? new Date().toISOString()) : null, note: body.note ?? null }, { onConflict: "client_id,period_key" })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logAudit(req, {
    actorEmail:  actor.email, actorRole: actor.role,
    action:      "payment.updated", entityType: "payment", entityId: clientId,
    entityLabel: body.periodKey,
    changes:     { status: { from: current?.status ?? "pending", to: body.status } },
  });

  return NextResponse.json(data);
}
