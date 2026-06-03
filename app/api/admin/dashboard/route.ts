import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

function nextBillingDate(schedule: string): Date {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  if (schedule === "monthly-1st")  return d < 1  ? new Date(y, m, 1)  : new Date(y, m + 1, 1);
  if (schedule === "monthly-16th") return d < 16 ? new Date(y, m, 16) : new Date(y, m + 1, 16);
  if (d < 1)  return new Date(y, m, 1);
  if (d < 16) return new Date(y, m, 16);
  return new Date(y, m + 1, 1);
}

export async function GET(req: NextRequest) {
  const actor = await getAdminUser(); if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // period: "this_month" | "last_30" | "all_time"
  const period = searchParams.get("period") ?? "all_time";

  const now = new Date();
  let periodStart: string | null = null;
  if (period === "this_month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  } else if (period === "last_30") {
    periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const admin = createAdminClient();

  let clientsQuery = admin
    .from("clients")
    .select("id, full_name, company_name, service_track, monthly_price, payment_schedule, signed_at");
  if (periodStart) clientsQuery = clientsQuery.gte("signed_at" as string, periodStart);

  // Always fetch all clients for billing and track breakdown (needs full picture)
  const [allClientsRes, periodClientsRes, docsRes] = await Promise.all([
    admin.from("clients").select("id, full_name, company_name, service_track, monthly_price, payment_schedule, signed_at"),
    periodStart ? clientsQuery : null,
    admin.from("client_documents").select("id, client_id, name, folder, is_seen, created_at, size_bytes")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const allClients  = allClientsRes.data ?? [];
  const periodClients = periodStart ? (periodClientsRes?.data ?? []) : allClients;
  const docs = docsRes.data ?? [];

  const mrr          = allClients.reduce((s, c) => s + c.monthly_price, 0);
  const clientCount  = allClients.length;
  const avgPerClient = clientCount ? Math.round(mrr / clientCount) : 0;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const newThisMonth = allClients.filter((c) => c.signed_at >= monthStart).length;

  // "New in period" — count of clients signed in selected period
  const newInPeriod = periodStart
    ? allClients.filter((c) => c.signed_at >= periodStart!).length
    : allClients.length;

  // Revenue by track
  const trackMap = new Map<string, { count: number; mrr: number }>();
  for (const c of allClients) {
    const t = trackMap.get(c.service_track) ?? { count: 0, mrr: 0 };
    t.count++;
    t.mrr += c.monthly_price;
    trackMap.set(c.service_track, t);
  }
  const byTrack = Array.from(trackMap.entries())
    .map(([track, v]) => ({ track, ...v }))
    .sort((a, b) => b.mrr - a.mrr);

  // Upcoming billing — next 7 days
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingBilling = allClients
    .map((c) => {
      const next = nextBillingDate(c.payment_schedule);
      return {
        clientId: c.id,
        name:     c.full_name,
        company:  c.company_name,
        amount:   c.payment_schedule === "semi-monthly" ? Math.round(c.monthly_price / 2) : c.monthly_price,
        date:     next.toISOString().slice(0, 10),
        _next:    next.getTime(),
      };
    })
    .filter((x) => x._next <= in7.getTime())
    .sort((a, b) => a._next - b._next)
    .map(({ _next: _, ...rest }) => rest);

  const clientMap = new Map(allClients.map((c) => [c.id, c]));
  const recentActivity = docs.map((d) => ({
    id:            d.id,
    clientId:      d.client_id,
    clientName:    clientMap.get(d.client_id)?.full_name ?? "Unknown",
    clientCompany: clientMap.get(d.client_id)?.company_name ?? null,
    name:          d.name,
    folder:        d.folder,
    isSeen:        d.is_seen,
    sizeBytes:     d.size_bytes,
    createdAt:     d.created_at,
  }));

  return NextResponse.json({
    mrr, clientCount, avgPerClient, newThisMonth, newInPeriod, period,
    byTrack, upcomingBilling, recentActivity,
  });
}
