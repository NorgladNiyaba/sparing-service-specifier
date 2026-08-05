"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SkeletonRows } from "@/components/admin/skeleton";

interface ClientSummary {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  service_track: string;
  monthly_price: number;
  payment_schedule: string;
  signed_at: string;
  advisor_id: string | null;
  advisor_name: string | null;
  unread_count: number;
  last_activity: string | null;
  is_dormant: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const TRACK_COLORS: Record<string, { bg: string; text: string }> = {
  OHSS: { bg: "rgba(245,158,11,0.1)",  text: "#d97706" },
  ECSS: { bg: "rgba(16,185,129,0.1)",  text: "#059669" },
  ICSS: { bg: "rgba(59,130,246,0.1)",  text: "#2563eb" },
};

type SortField = "full_name" | "monthly_price" | "signed_at" | "last_activity";

const ALL_COLUMNS = [
  { key: "client",   label: "Client" },
  { key: "plan",     label: "Plan" },
  { key: "fee",      label: "Monthly fee" },
  { key: "signed",   label: "Signed" },
  { key: "activity", label: "Last active" },
  { key: "advisor",  label: "Advisor" },
  { key: "unread",   label: "Activity" },
] as const;
type ColKey = typeof ALL_COLUMNS[number]["key"];

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
      }}
      title="Copy email"
      className="ml-1.5 opacity-0 transition-all group-hover:opacity-100 hover:opacity-80"
      style={{ color: copied ? "#059669" : "#9ca3af" }}
    >
      {copied ? (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
      <span className="text-xs" style={{ color: "#9ca3af" }}>
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-30 hover:bg-gray-100"
          style={{ background: "#f3f4f6", color: "#6b7280" }}>← Prev</button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
          return (
            <button key={p} onClick={() => onPage(p)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
              style={{ background: p === page ? "#1d4ed8" : "#f3f4f6", color: p === page ? "#fff" : "#6b7280" }}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPage(page + 1)} disabled={page === pages}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-30 hover:bg-gray-100"
          style={{ background: "#f3f4f6", color: "#6b7280" }}>Next →</button>
      </div>
    </div>
  );
}

/* ── Stat chip ───────────────────────────────────────────────────────── */

function StatChip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>{label}</div>
      <div className="mt-1 text-base font-bold tracking-[-0.02em]" style={{ color: "#171717" }}>{value}</div>
      {sub && <div className="mt-0.5 text-[0.65rem]" style={{ color: "#9ca3af" }}>{sub}</div>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function AdminClientsPage() {
  const [clients,       setClients]       = useState<ClientSummary[]>([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [trackFilter,   setTrackFilter]   = useState("");
  const [advisorFilter, setAdvisorFilter] = useState("");
  const [dormant,       setDormant]       = useState(false);
  const [advisorList,   setAdvisorList]   = useState<Array<{ id: string; name: string }>>([]);
  const [sortField,     setSortField]     = useState<SortField>("signed_at");
  const [sortDir,       setSortDir]       = useState<"asc" | "desc">("desc");
  const [page,          setPage]          = useState(1);
  const [visibleCols,   setVisibleCols]   = useState<Set<ColKey>>(new Set(ALL_COLUMNS.map((c) => c.key)));
  const [showColMenu,   setShowColMenu]   = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const LIMIT = 25;

  const fetchClients = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT), sortField, sortDir });
    if (search)      params.set("search", search);
    if (trackFilter) params.set("track", trackFilter);
    if (dormant)     params.set("dormant", "1");
    setLoading(true);
    fetch(`/api/admin/clients?${params}`)
      .then((r) => r.json())
      .then((d) => {
        let rows = Array.isArray(d.data) ? d.data : [];
        if      (advisorFilter === "unassigned") rows = rows.filter((c: ClientSummary) => !c.advisor_id);
        else if (advisorFilter)                   rows = rows.filter((c: ClientSummary) => c.advisor_id === advisorFilter);
        setClients(rows);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [page, sortField, sortDir, search, trackFilter, dormant, advisorFilter]);

  useEffect(() => {
    const id = setTimeout(() => { setPage(1); fetchClients(); }, search ? 350 : 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => {
    fetch("/api/admin/advisors")
      .then((r) => r.json())
      .then((d: Array<{ id: string; name: string; is_active: boolean }>) => {
        if (Array.isArray(d)) setAdvisorList(d.filter((a) => a.is_active));
      }).catch(() => {});
  }, []);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
    setPage(1);
  }
  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => { const next = new Set(prev); if (next.has(key)) { if (next.size > 2) next.delete(key); } else next.add(key); return next; });
  }
  function exportCSV() {
    const headers = ["Name", "Email", "Company", "Plan", "Monthly Fee", "Signed", "Last Active", "Unread"];
    const rows = clients.map((c) => [c.full_name, c.email, c.company_name ?? "", c.service_track, c.monthly_price, formatDate(c.signed_at), c.last_activity ? timeAgo(c.last_activity) : "never", c.unread_count]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clients.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const tracks = Array.from(new Set(clients.map((c) => c.service_track))).sort();
  const totalMrr = clients.reduce((s, c) => s + c.monthly_price, 0);
  const unreadTotal = clients.reduce((s, c) => s + c.unread_count, 0);
  const dormantCount = clients.filter((c) => c.is_dormant).length;

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return (
      <svg className="ml-1 h-3 w-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
    return (
      <svg className="ml-1 h-3 w-3" style={{ color: "#1d4ed8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={sortDir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
      </svg>
    );
  }

  const col = (key: ColKey) => visibleCols.has(key);
  const router = useRouter();

  return (
    <div className="px-6 py-8 sm:px-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Clients</h1>
          <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>{total} accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>

          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setShowColMenu((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition"
              style={{ borderColor: showColMenu ? "#1d4ed8" : "#ebecef", color: showColMenu ? "#1d4ed8" : "#6b7280" }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
              Columns
            </button>
            {showColMenu && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border bg-white py-1 shadow-lg" style={{ borderColor: "#ebecef" }}>
                {ALL_COLUMNS.map((c) => (
                  <button key={c.key} onClick={() => toggleCol(c.key)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition hover:bg-[#f8f8f9]"
                    style={{ color: visibleCols.has(c.key) ? "#171717" : "#9ca3af" }}>
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded" style={{ background: visibleCols.has(c.key) ? "#1d4ed8" : "#f3f4f6" }}>
                      {visibleCols.has(c.key) && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text" placeholder="Search clients…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none transition-all"
              style={{
                borderColor: searchFocused ? "#1d4ed8" : "#ebecef",
                background: "#ffffff",
                color: "#171717",
                width: searchFocused ? 260 : 220,
                boxShadow: searchFocused ? "0 0 0 3px rgba(29,78,216,0.08)" : "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Stat chips ── */}
      {!loading && clients.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatChip label="Visible MRR"  value={formatCurrency(totalMrr)} sub={`${clients.length} shown`} />
          <StatChip label="Total clients" value={String(total)} />
          <StatChip label="Unread msgs"  value={String(unreadTotal)} sub={unreadTotal > 0 ? "needs attention" : "all caught up"} />
          <StatChip label="Dormant"      value={String(dormantCount)} sub={dormantCount > 0 ? "inactive clients" : "none"} />
        </motion.div>
      )}

      {/* ── Filter pills ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => { setTrackFilter(""); setPage(1); }}
          className="rounded-full px-3 py-1 text-xs font-semibold transition"
          style={{ background: trackFilter === "" ? "#1d4ed8" : "#f3f4f6", color: trackFilter === "" ? "#fff" : "#6b7280" }}>
          All
        </button>
        {tracks.map((t) => {
          const colors = TRACK_COLORS[t] ?? { bg: "#f3f4f6", text: "#6b7280" };
          const active = trackFilter === t;
          return (
            <button key={t} onClick={() => { setTrackFilter(active ? "" : t); setPage(1); }}
              className="rounded-full px-3 py-1 text-xs font-semibold transition"
              style={{ background: active ? colors.text : colors.bg, color: active ? "#fff" : colors.text }}>
              {t}
            </button>
          );
        })}
        <button onClick={() => { setDormant((v) => !v); setPage(1); }}
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition"
          style={{ background: dormant ? "#7c3aed" : "rgba(124,58,237,0.08)", color: dormant ? "#fff" : "#7c3aed" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dormant ? "#fff" : "#7c3aed" }} />
          Dormant only
        </button>
        {advisorList.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#d1d5db" }}>Advisor:</span>
            <button onClick={() => { setAdvisorFilter(""); setPage(1); }}
              className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
              style={{ background: advisorFilter === "" ? "#171717" : "#f3f4f6", color: advisorFilter === "" ? "#fff" : "#6b7280" }}>
              All
            </button>
            {advisorList.map((a) => (
              <button key={a.id} onClick={() => { setAdvisorFilter(advisorFilter === a.id ? "" : a.id); setPage(1); }}
                className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                style={{ background: advisorFilter === a.id ? "#171717" : "#f3f4f6", color: advisorFilter === a.id ? "#fff" : "#6b7280" }}>
                {a.name.split(" ")[0]}
              </button>
            ))}
            <button onClick={() => { setAdvisorFilter("unassigned"); setPage(1); }}
              className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
              style={{ background: advisorFilter === "unassigned" ? "#171717" : "#f3f4f6", color: advisorFilter === "unassigned" ? "#fff" : "#9ca3af" }}>
              Unassigned
            </button>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #f0f1f3" }}>
              {col("client") && (
                <th className="px-5 py-3.5 text-left">
                  <button onClick={() => toggleSort("full_name")} className="flex items-center text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                    Client <SortIcon field="full_name" />
                  </button>
                </th>
              )}
              {col("plan") && <th className="px-5 py-3.5 text-left text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>Plan</th>}
              {col("fee") && (
                <th className="px-5 py-3.5 text-left">
                  <button onClick={() => toggleSort("monthly_price")} className="flex items-center text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                    Monthly fee <SortIcon field="monthly_price" />
                  </button>
                </th>
              )}
              {col("signed") && (
                <th className="px-5 py-3.5 text-left">
                  <button onClick={() => toggleSort("signed_at")} className="flex items-center text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                    Signed <SortIcon field="signed_at" />
                  </button>
                </th>
              )}
              {col("activity") && (
                <th className="px-5 py-3.5 text-left">
                  <button onClick={() => toggleSort("last_activity")} className="flex items-center text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>
                    Last active <SortIcon field="last_activity" />
                  </button>
                </th>
              )}
              {col("advisor") && <th className="px-5 py-3.5 text-left text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>Advisor</th>}
              {col("unread") && <th className="px-5 py-3.5 text-left text-[0.67rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>Unread</th>}
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows count={8} cols={visibleCols.size + 1} />
            ) : clients.length === 0 ? (
              <tr><td colSpan={visibleCols.size + 1} className="px-5 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>No clients found.</td></tr>
            ) : clients.map((client, i) => {
              const colors = TRACK_COLORS[client.service_track] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280" };
              return (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.3) }}
                  className="group cursor-pointer transition-colors hover:bg-[#f3f7ff]"
                  style={{ borderBottom: i < clients.length - 1 ? "1px solid #f3f4f6" : "none" }}
                  onClick={() => router.push(`/admin/clients/${client.id}`)}
                >
                  {col("client") && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Avatar circle */}
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
                          style={{ background: colors.text }}
                        >
                          {client.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: "#171717" }}>{client.full_name}</span>
                            {client.is_dormant && (
                              <span className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide" style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>dormant</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center text-xs" style={{ color: "#9ca3af" }}>
                            {client.company_name ?? client.email}
                            <CopyEmailButton email={client.email} />
                          </div>
                        </div>
                      </div>
                    </td>
                  )}
                  {col("plan") && (
                    <td className="px-5 py-4">
                      <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em]"
                        style={{ background: colors.bg, color: colors.text }}>
                        {client.service_track}
                      </span>
                    </td>
                  )}
                  {col("fee") && (
                    <td className="px-5 py-4 text-sm font-semibold tabular-nums" style={{ color: "#171717" }}>
                      {formatCurrency(client.monthly_price)}/mo
                    </td>
                  )}
                  {col("signed") && (
                    <td className="px-5 py-4 text-sm" style={{ color: "#6b7280" }}>{formatDate(client.signed_at)}</td>
                  )}
                  {col("activity") && (
                    <td className="px-5 py-4 text-sm" style={{ color: client.is_dormant ? "#7c3aed" : "#6b7280" }}>
                      {client.last_activity ? timeAgo(client.last_activity) : <span style={{ color: "#d1d5db" }}>never</span>}
                    </td>
                  )}
                  {col("advisor") && (
                    <td className="px-5 py-4 text-sm" style={{ color: client.advisor_name ? "#171717" : "#d1d5db" }}>
                      {client.advisor_name ?? "—"}
                    </td>
                  )}
                  {col("unread") && (
                    <td className="px-5 py-4">
                      {client.unread_count > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-bold text-white"
                          style={{ background: "#1d4ed8" }}>
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                          {client.unread_count} new
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#d1d5db" }}>—</span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className="rounded-xl border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                      style={{ borderColor: "#ebecef", background: "#f8f8f9", color: "#70757f" }}
                    >
                      Manage →
                    </Link>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} total={total} limit={LIMIT} onPage={(p) => setPage(p)} />
      </div>
    </div>
  );
}
