"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SkeletonCard, SkeletonActivityRow } from "@/components/admin/skeleton";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TRACK_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  ECSS: { bg: "rgba(5,150,105,0.1)",   text: "#059669", bar: "#059669" },
  ICSS: { bg: "rgba(29,78,216,0.1)",   text: "#1d4ed8", bar: "#1d4ed8" },
  OHSS: { bg: "rgba(217,119,6,0.1)",   text: "#d97706", bar: "#d97706" },
};

type Period = "this_month" | "last_30" | "all_time";
const PERIODS: { value: Period; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_30",    label: "Last 30 days" },
  { value: "all_time",   label: "All time" },
];

interface DashboardData {
  mrr: number;
  clientCount: number;
  avgPerClient: number;
  newThisMonth: number;
  newInPeriod: number;
  period: Period;
  byTrack: { track: string; count: number; mrr: number }[];
  upcomingBilling: { clientId: string; name: string; company: string | null; amount: number; date: string }[];
  recentActivity: { id: string; clientId: string; clientName: string; clientCompany: string | null; name: string; folder: string | null; isSeen: boolean; createdAt: string }[];
}

function StatCard({ label, value, sub, delay }: { label: string; value: string; sub?: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}
      className="rounded-2xl border bg-white p-5" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "#9ca3af" }}>{label}</div>
      <div className="mt-2 text-[1.65rem] font-bold tracking-[-0.03em]" style={{ color: "#171717" }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<Period>("all_time");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dashboard?period=${period}`)
      .then((r) => r.json())
      .then((d: DashboardData) => { setData(d); setLoading(false); });
  }, [period]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const maxTrackMrr = data ? Math.max(...data.byTrack.map((t) => t.mrr), 1) : 1;

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <div className="px-8 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-7">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Dashboard</h1>
            <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>{today}</p>
          </div>
          {/* Period selector */}
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "#f3f4f6" }}>
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold transition"
                style={{ background: period === p.value ? "#ffffff" : "transparent", color: period === p.value ? "#171717" : "#9ca3af", boxShadow: period === p.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {loading ? (
        <>
          <div className="mb-6 grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef" }}>
              <div className="h-3 w-32 rounded-md animate-pulse mb-5" style={{ background: "#f0f0f2" }} />
              {[70, 45, 30].map((w, i) => (
                <div key={i} className="mb-4">
                  <div className="mb-1.5 flex justify-between">
                    <div className="h-3 rounded-md animate-pulse" style={{ background: "#f0f0f2", width: "80px" }} />
                    <div className="h-3 rounded-md animate-pulse" style={{ background: "#f0f0f2", width: "60px" }} />
                  </div>
                  <div className="h-2 rounded-full" style={{ background: "#f3f4f6" }}>
                    <div className="h-2 rounded-full animate-pulse" style={{ background: "#ebebed", width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef" }}>
              <div className="h-3 w-32 rounded-md animate-pulse mb-5" style={{ background: "#f0f0f2" }} />
              {[1,2,3].map((i) => <div key={i} className="mb-2.5 h-14 rounded-xl animate-pulse" style={{ background: "#f4f4f6" }} />)}
            </div>
          </div>
          <div className="rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
            <div className="border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
              <div className="h-3 w-28 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
            </div>
            {[1,2,3,4,5].map((i) => <SkeletonActivityRow key={i} />)}
          </div>
        </>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <StatCard label="Monthly recurring revenue" value={formatCurrency(data.mrr)} sub="across all clients" delay={0.04} />
            <StatCard label="Active clients" value={String(data.clientCount)} sub={data.newThisMonth > 0 ? `+${data.newThisMonth} this month` : "no new this month"} delay={0.08} />
            <StatCard label="Avg per client" value={formatCurrency(data.avgPerClient)} sub="monthly" delay={0.12} />
            <StatCard
              label={`New — ${periodLabel}`}
              value={String(data.newInPeriod)}
              sub={period === "all_time" ? "all time" : periodLabel.toLowerCase()}
              delay={0.16}
            />
          </div>

          {/* Middle row */}
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_340px]">
            {/* Revenue by track */}
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
              className="rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h2 className="mb-5 text-sm font-semibold" style={{ color: "#171717" }}>Revenue by plan</h2>
              {data.byTrack.length === 0 ? (
                <p className="text-sm" style={{ color: "#9ca3af" }}>No data yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.byTrack.map((t, i) => {
                    const colors = TRACK_COLORS[t.track] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280", bar: "#6b7280" };
                    return (
                      <div key={t.track}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.08em]"
                              style={{ background: colors.bg, color: colors.text }}>{t.track}</span>
                            <span className="text-xs" style={{ color: "#9ca3af" }}>{t.count} client{t.count !== 1 ? "s" : ""}</span>
                          </div>
                          <span className="text-sm font-semibold" style={{ color: "#171717" }}>{formatCurrency(t.mrr)}/mo</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ background: "#f3f4f6" }}>
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${(t.mrr / maxTrackMrr) * 100}%` }}
                            transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full" style={{ background: colors.bar }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Upcoming billing */}
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.22 }}
              className="rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h2 className="mb-5 text-sm font-semibold" style={{ color: "#171717" }}>Upcoming billing</h2>
              {data.upcomingBilling.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-2 text-2xl">🗓</div>
                  <p className="text-sm font-medium" style={{ color: "#6b7280" }}>Nothing in the next 7 days</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.upcomingBilling.map((b, i) => {
                    const daysUntil = Math.ceil((new Date(b.date + "T00:00:00").getTime() - Date.now()) / 86400000);
                    const urgent = daysUntil <= 2;
                    return (
                      <motion.div key={b.clientId + b.date}
                        initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.28 + i * 0.04 }}
                        className="flex items-center justify-between gap-3 rounded-xl p-3"
                        style={{ background: urgent ? "rgba(239,68,68,0.05)" : "#fafafa", border: `1px solid ${urgent ? "rgba(239,68,68,0.15)" : "#f3f4f6"}` }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium" style={{ color: "#171717" }}>{b.name}</div>
                          <div className="text-xs" style={{ color: urgent ? "#ef4444" : "#9ca3af" }}>
                            {formatDate(b.date)}{urgent ? " · soon" : ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold" style={{ color: "#171717" }}>{formatCurrency(b.amount)}</div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.26 }}
            className="rounded-2xl border bg-white" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
              <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Recent activity</h2>
              <Link href="/admin/activity" className="text-xs font-medium transition-opacity hover:opacity-60" style={{ color: "#1d4ed8" }}>
                View all →
              </Link>
            </div>
            {data.recentActivity.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm" style={{ color: "#9ca3af" }}>No activity yet.</div>
            ) : (
              <div>
                {data.recentActivity.map((item, i) => (
                  <motion.div key={item.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 0.3 + i * 0.03 }}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-[#fafafa]"
                    style={{ borderBottom: i < data.recentActivity.length - 1 ? "1px solid #f9f9fb" : "none" }}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: item.isSeen ? "#f3f4f6" : "rgba(29,78,216,0.08)" }}>
                      <svg className="h-3.5 w-3.5" style={{ color: item.isSeen ? "#9ca3af" : "#1d4ed8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Link href={`/admin/clients/${item.clientId}`} className="font-semibold hover:underline" style={{ color: "#171717" }}>{item.clientName}</Link>
                        <span style={{ color: "#d1d5db" }}>·</span>
                        <span className="truncate" style={{ color: "#6b7280" }}>{item.name}</span>
                      </div>
                      {item.folder && <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>{item.folder}</div>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {!item.isSeen && (
                        <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase text-white" style={{ background: "#1d4ed8" }}>New</span>
                      )}
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{timeAgo(item.createdAt)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      ) : null}
    </div>
  );
}
