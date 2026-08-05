"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePortalContext } from "@/components/portal/portal-context";
import type { Client, ClientDocument } from "@/lib/supabase/types";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";

const CardManagement = dynamic(() => import("@/components/portal/card-management"), { ssr: false });

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatBytes(b: number | null) {
  if (!b) return "";
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
}
function scheduleLabel(s: string) {
  if (s === "monthly-1st")  return "Monthly · billed on the 1st";
  if (s === "monthly-16th") return "Monthly · billed on the 16th";
  if (s === "semi-monthly") return "Semi-monthly · 1st & 16th";
  return s;
}
function planLabel(track: string) {
  if (track === "ECSS") return "Growth Support";
  if (track === "ICSS") return "Independent Support";
  if (track === "OHSS") return "Office Hours Support";
  return track;
}

function nextBillingDate(schedule: string): Date {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  if (schedule === "monthly-1st")  return d < 1  ? new Date(y, m, 1)  : new Date(y, m + 1, 1);
  if (schedule === "monthly-16th") return d < 16 ? new Date(y, m, 16) : new Date(y, m + 1, 16);
  if (d < 1)  return new Date(y, m, 1);
  if (d < 16) return new Date(y, m, 16);
  return new Date(y, m + 1, 1);
}

interface PayPeriod { key: string; billingDate: Date; periodLabel: string; amount: number; }

function buildPayPeriods(client: Client): PayPeriod[] {
  const signed = new Date(client.signed_at);
  const today  = new Date();
  const periods: PayPeriod[] = [];
  const { payment_schedule: sched, monthly_price: price } = client;
  const half = Math.round(price / 2);

  function push(date: Date, period: string, amount: number) {
    if (date >= signed && date <= today)
      periods.push({ key: date.toISOString().slice(0, 10), billingDate: date, periodLabel: period, amount });
  }

  if (sched === "monthly-1st" || sched === "monthly-16th") {
    const day = sched === "monthly-1st" ? 1 : 16;
    let y = signed.getFullYear(), mo = signed.getMonth();
    for (let i = 0; i < 60; i++) {
      const d = new Date(y, mo, day);
      if (d > today) break;
      push(d, d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), price);
      mo++; if (mo > 11) { mo = 0; y++; }
    }
  } else {
    let y = signed.getFullYear(), mo = signed.getMonth();
    for (let i = 0; i < 120; i++) {
      const d1  = new Date(y, mo, 1);
      const d16 = new Date(y, mo, 16);
      const lastDay  = new Date(y, mo + 1, 0).getDate();
      const monthStr = d1.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (d1 > today) break;
      push(d1,  `${monthStr} · 1–15`,         half);
      if (d16 <= today) push(d16, `${monthStr} · 16–${lastDay}`, half);
      mo++; if (mo > 11) { mo = 0; y++; }
    }
  }
  return periods.sort((a, b) => b.billingDate.getTime() - a.billingDate.getTime());
}

interface ChartMonth { key: string; label: string; amount: number; }

function buildMonthlyChart(periods: PayPeriod[]): ChartMonth[] {
  const map = new Map<string, ChartMonth>();
  for (const p of periods) {
    const d = p.billingDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { key, label: d.toLocaleDateString("en-US", { month: "short" }), amount: 0 });
    map.get(key)!.amount += p.amount;
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-8);
}

/* ── Chart bar ────────────────────────────────────────────────────────── */

function ChartBar({ d, isLast, chartMax, i }: { d: ChartMonth; isLast: boolean; chartMax: number; i: number }) {
  const [hovering, setHovering] = useState(false);
  const heightPct = chartMax > 0 ? (d.amount / chartMax) * 100 : 0;
  return (
    <div
      className="group relative flex flex-1 flex-col items-center"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovering && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full mb-1.5 z-10 min-w-[72px] rounded-xl border bg-white px-2.5 py-1.5 text-center shadow-lg"
            style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="text-[0.7rem] font-bold" style={{ color: "var(--ink)" }}>{formatCurrency(d.amount)}</div>
            <div className="text-[0.6rem]" style={{ color: "var(--ink-3)" }}>{d.label}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bar wrapper */}
      <div className="flex w-full items-end justify-center" style={{ height: 48 }}>
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(heightPct * 0.48, heightPct > 0 ? 3 : 0)}px` }}
          transition={{ duration: 0.55, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[22px] rounded-t-md transition-all duration-150"
          style={{
            background: isLast
              ? "linear-gradient(180deg, #d61b17 0%, #c01511 100%)"
              : hovering
                ? "rgba(214,27,23,0.4)"
                : "rgba(214,27,23,0.2)",
          }}
        />
      </div>

      {/* Label */}
      <span className="mt-1.5 text-[0.58rem]" style={{ color: isLast ? "var(--ink-2)" : "var(--ink-3)" }}>
        {d.label}
      </span>
    </div>
  );
}

/* ── Billing contact card ─────────────────────────────────────────────── */

function BillingContactCard({ client, onUpdate }: { client: Client; onUpdate: (patch: Partial<Client>) => void }) {
  const [editing, setEditing] = useState(false);
  const [email,   setEmail]   = useState(client.email);
  const [address, setAddress] = useState(client.billing_address ?? "");
  const [zip,     setZip]     = useState(client.billing_zip ?? "");
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saved,   setSaved]   = useState(false);

  function reset() {
    setEmail(client.email);
    setAddress(client.billing_address ?? "");
    setZip(client.billing_zip ?? "");
    setSaveErr("");
  }

  async function handleSave() {
    setSaveErr("");
    if (!email.trim()) { setSaveErr("Billing email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setSaveErr("Invalid email address."); return; }
    setSaving(true);
    const res = await fetch("/api/portal/billing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), billing_address: address.trim() || null, billing_zip: zip.trim() || null }),
    });
    const data = await res.json() as { error?: string };
    setSaving(false);
    if (!res.ok) { setSaveErr(data.error ?? "Failed to save."); return; }
    onUpdate({ email: email.trim(), billing_address: address.trim() || null, billing_zip: zip.trim() || null });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-3)" }}>Billing contact</div>
            <div className="text-base font-bold tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
              {client.company_name ?? client.full_name}
            </div>
            <div className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>{client.full_name}</div>
          </div>
          <button
            type="button"
            onClick={() => editing ? (reset(), setEditing(false)) : setEditing(true)}
            className="press flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              borderColor: editing ? "rgba(214,27,23,0.3)" : "var(--line)",
              color:       editing ? "#d61b17"             : "var(--ink-2)",
              background:  editing ? "rgba(214,27,23,0.04)" : "var(--surface-alt)",
            }}
          >
            {editing ? (
              <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Cancel</>
            ) : (
              <><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>Edit</>
            )}
          </button>
        </div>

        <div className="my-4" style={{ borderTop: "1px solid var(--line)" }} />

        <AnimatePresence mode="wait" initial={false}>
          {!editing ? (
            <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-5">
                {[
                  { label: "Billing email", value: client.email },
                  { label: "Address",       value: client.billing_address },
                  { label: "ZIP code",      value: client.billing_zip },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{label}</div>
                    <div className="text-sm font-medium" style={{ color: value ? "var(--ink)" : "var(--ink-4)" }}>{value ?? "—"}</div>
                  </div>
                ))}
              </div>
              {saved && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#059669" }}>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Changes saved
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-2)" }}>Billing email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-brand"
                    style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-2)" }}>Billing address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address"
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-brand"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-2)" }}>ZIP code</label>
                    <input type="text" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="10001" inputMode="numeric"
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-brand"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }} />
                  </div>
                </div>
                {saveErr && <p className="text-xs" style={{ color: "var(--error)" }}>{saveErr}</p>}
                <button type="button" onClick={handleSave} disabled={saving}
                  className="press rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: "var(--brand)" }}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Invoice modal ────────────────────────────────────────────────────── */

function InvoiceModal({ doc, onClose }: { doc: ClientDocument; onClose: () => void }) {
  async function handleOpen() {
    const { createClient: cc } = await import("@/lib/supabase/client");
    const { data } = await cc().storage.from("client-documents").createSignedUrl(doc.storage_path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-sm rounded-2xl bg-white p-6"
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(214,27,23,0.07)" }}>
          <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <p className="font-semibold" style={{ color: "var(--ink)" }}>{doc.name}</p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
          {formatDate(doc.created_at)}{doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={handleOpen}
            className="press flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: "var(--brand)" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </button>
          <button onClick={onClose}
            className="press rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:border-line-strong"
            style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function BillingPage() {
  const { activeClientId } = usePortalContext();
  const [client,         setClient]         = useState<Client | null>(null);
  const [invoiceDocs,    setInvoiceDocs]    = useState<ClientDocument[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<Array<{ period_key: string; amount: number; status: string; paid_at: string | null }>>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeModal,    setActiveModal]    = useState<ClientDocument | null>(null);
  const [advisor,        setAdvisor]        = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    Promise.all([
      fetch("/api/portal/client").then((r) => r.ok ? r.json() : null) as Promise<Client | null>,
      fetch("/api/portal/documents").then((r) => r.ok ? r.json() : { folders: [], documents: [] }) as Promise<{ folders: Array<{ id: string; name: string; parent_id: string | null }>; documents: ClientDocument[] }>,
      fetch("/api/portal/payments").then((r) => r.ok ? r.json() : []) as Promise<Array<{ period_key: string; amount: number; status: string; paid_at: string | null }>>,
      fetch("/api/portal/advisor").then((r) => r.ok ? r.json() : null) as Promise<{ name: string; email: string } | null>,
    ]).then(([clientRes, docsRes, pr, advisorRes]) => {
      if (clientRes) setClient(clientRes);
      const invFolder = (docsRes.folders ?? []).find((f) => f.name === "Sparing Invoices" && !f.parent_id);
      setInvoiceDocs((docsRes.documents ?? []).filter((d) => invFolder && d.folder_id === invFolder.id));
      setPaymentRecords(Array.isArray(pr) ? pr : []);
      if (advisorRes) setAdvisor(advisorRes);
      setLoading(false);
    });
  }, [activeClientId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--line-strong)", borderTopColor: "transparent" }} />
    </div>
  );
  if (!client) return <div className="px-6 py-8 text-sm" style={{ color: "var(--ink-3)" }}>No billing data found.</div>;

  const periods    = buildPayPeriods(client);
  const recMap     = new Map(paymentRecords.map((r) => [r.period_key, r]));
  const chartData  = buildMonthlyChart(periods);
  const chartMax   = chartData.length ? Math.max(...chartData.map((d) => d.amount)) : 1;
  const nextDate   = nextBillingDate(client.payment_schedule);
  const nextAmount = client.payment_schedule === "semi-monthly" ? Math.round(client.monthly_price / 2) : client.monthly_price;
  const totalPaid  = periods.reduce((s, p) => s + p.amount, 0);
  const thisYear   = periods.filter((p) => p.billingDate.getFullYear() === new Date().getFullYear()).reduce((s, p) => s + p.amount, 0);

  const STATUS_STYLE = {
    paid:    { bg: "rgba(5,150,105,0.09)",  color: "#059669", label: "Paid"    },
    pending: { bg: "rgba(245,158,11,0.09)", color: "#d97706", label: "Pending" },
    overdue: { bg: "rgba(239,68,68,0.09)",  color: "#dc2626", label: "Overdue" },
  } as const;

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-7">
        <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "var(--ink)" }}>Billing</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>Your plan, contact information, and payment history</p>
      </motion.div>

      <div className="mx-auto max-w-3xl space-y-6">

        {/* ── Billing contact ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.04 }}>
          <BillingContactCard client={client} onUpdate={(p) => setClient((prev) => prev ? { ...prev, ...p } : prev)} />
        </motion.div>

        {/* ── Payment methods ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}>
            <div className="border-b px-6 py-4" style={{ borderColor: "var(--line)" }}>
              <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Payment Methods</h2>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Manage cards on file. At least one card is required.</p>
            </div>
            <div className="p-6"><CardManagement /></div>
          </div>
        </motion.div>

        {/* ── Subscription card ── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}
          className="overflow-hidden rounded-2xl border bg-white"
          style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}
        >
          {/* Gradient top bar */}
          <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg, #d61b17 0%, #ff6b6b 50%, #d61b17 100%)" }} />

          <div className="p-6">
            {/* Plan + next payment */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]"
                    style={{ background: "rgba(214,27,23,0.08)", color: "#d61b17" }}>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#d61b17" }} />
                    {client.service_track}
                  </span>
                  <span className="text-sm" style={{ color: "var(--ink-3)" }}>{planLabel(client.service_track)}</span>
                </div>
                <div className="mt-3 text-[1.7rem] font-bold tracking-[-0.03em]" style={{ color: "var(--ink)" }}>
                  {formatCurrency(client.monthly_price)}
                  <span className="ml-1 text-base font-normal" style={{ color: "var(--ink-3)" }}>/mo</span>
                </div>
                <p className="mt-0.5 text-sm" style={{ color: "var(--ink-2)" }}>{scheduleLabel(client.payment_schedule)}</p>
              </div>

              {/* Next payment box */}
              <div className="rounded-xl border p-4 text-right" style={{ borderColor: "var(--line)", background: "var(--surface-alt)", minWidth: 164 }}>
                <div className="text-[0.62rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-3)" }}>Next payment</div>
                <div className="mt-1 text-sm font-bold" style={{ color: "var(--ink)" }}>{formatDate(nextDate.toISOString())}</div>
                <div className="mt-0.5 text-xs font-semibold" style={{ color: "#d61b17" }}>{formatCurrency(nextAmount)}</div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-xl p-4" style={{ background: "var(--surface-alt)", border: "1px solid var(--line)" }}>
              {[
                { label: "Total paid",                    value: formatCurrency(totalPaid), icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
                { label: `${new Date().getFullYear()} YTD`, value: formatCurrency(thisYear),  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
                { label: "Member since",                  value: formatDate(client.signed_at), icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
              ].map(({ label, value, icon }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <svg className="h-3 w-3 shrink-0" style={{ color: "var(--ink-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                    <div className="text-[0.6rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{label}</div>
                  </div>
                  <div className="text-sm font-bold" style={{ color: "var(--ink)" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Advisor */}
            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t pt-4" style={{ borderColor: "var(--line)" }}>
              {[
                { label: "Advisor",       value: advisor?.name  ?? ADVISOR_NAME },
                { label: "Advisor email", value: advisor?.email ?? ADVISOR_EMAIL },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{label}</div>
                  <div className="mt-0.5 text-sm font-medium" style={{ color: "var(--ink)" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Monthly spend chart */}
            {chartData.length >= 2 && (
              <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                <div className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>
                  Monthly spend
                </div>
                <div className="flex items-end gap-1">
                  {chartData.map((d, i) => (
                    <ChartBar key={d.key} d={d} isLast={i === chartData.length - 1} chartMax={chartMax} i={i} />
                  ))}
                </div>
              </div>
            )}

            {/* View agreement */}
            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
              <Link
                href="/portal/contract"
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-brand"
                style={{ color: "var(--ink-3)" }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                View signed agreement
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── Invoices ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Invoices</h2>

          {invoiceDocs.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border bg-white py-12 text-center" style={{ borderColor: "var(--line)" }}>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(214,27,23,0.06)" }}>
                <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No invoices yet</p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>Your advisor will upload invoices here as they are issued.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Date", "Invoice", "Size", ""].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceDocs.map((doc, i) => (
                    <motion.tr key={doc.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.04 }}
                      className="group transition-colors hover:bg-[#fafafa]"
                      style={{ borderBottom: i < invoiceDocs.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <td className="px-5 py-4 text-sm" style={{ color: "var(--ink-2)" }}>{formatDate(doc.created_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          {/* Styled invoice icon */}
                          <div className="relative flex h-9 w-9 shrink-0 flex-col overflow-hidden rounded-lg" style={{ background: "rgba(214,27,23,0.08)" }}>
                            <div className="h-[5px] w-full" style={{ background: "#d61b17", opacity: 0.7 }} />
                            <div className="flex flex-1 flex-col justify-center gap-[3px] px-1.5 py-1">
                              <div className="h-[2px] w-full rounded-full" style={{ background: "#d61b17", opacity: 0.35 }} />
                              <div className="h-[2px] w-3/4 rounded-full" style={{ background: "#d61b17", opacity: 0.25 }} />
                            </div>
                          </div>
                          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: "var(--ink-3)" }}>{formatBytes(doc.size_bytes)}</td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setActiveModal(doc)}
                          className="press flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all hover:border-brand hover:text-brand"
                          style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ── Payment history ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }}>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>Payment history</h2>

          {periods.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border bg-white py-12 text-center" style={{ borderColor: "var(--line)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No payment history yet</p>
              <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>Your first billing date is {formatDate(nextDate.toISOString())}.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Date", "Period", "Amount", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, i) => {
                    const rec = recMap.get(p.key);
                    const status = rec?.status ?? "pending";
                    const s = STATUS_STYLE[status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending;
                    return (
                      <motion.tr key={p.key}
                        initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: i * 0.025 }}
                        className="transition-colors hover:bg-[#fafafa]"
                        style={{ borderBottom: i < periods.length - 1 ? "1px solid var(--line)" : "none" }}>
                        <td className="px-5 py-3.5 text-sm" style={{ color: "var(--ink-2)" }}>
                          {p.billingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3.5 text-sm font-medium" style={{ color: "var(--ink)" }}>{p.periodLabel}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{formatCurrency(p.amount)}</td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-semibold"
                            style={{ background: s.bg, color: s.color }}>
                            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                            {s.label}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

      </div>

      <AnimatePresence>
        {activeModal && <InvoiceModal doc={activeModal} onClose={() => setActiveModal(null)} />}
      </AnimatePresence>
    </div>
  );
}
