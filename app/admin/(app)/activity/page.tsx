"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SkeletonRows } from "@/components/admin/skeleton";

interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  name: string;
  folder: string | null;
  type: string;
  isSeen: boolean;
  sizeBytes: number | null;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function formatBytes(b: number | null) {
  if (!b) return "";
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
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
  return formatDate(iso);
}

const DOC_TYPES = ["Contract", "Invoice", "Report", "Onboarding", "Other"];

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
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-30"
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
        <button onClick={() => onPage(page + 1)} disabled={page === Math.ceil(total / limit)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-30"
          style={{ background: "#f3f4f6", color: "#6b7280" }}>Next →</button>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [items,        setItems]        = useState<ActivityItem[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [unseenOnly,   setUnseenOnly]   = useState(false);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [typeFilter,   setTypeFilter]   = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");
  const [page,         setPage]         = useState(1);
  const [marking,      setMarking]      = useState(false);

  const LIMIT = 25;

  const fetchItems = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (unseenOnly)   params.set("unseen", "1");
    if (clientFilter) params.set("clientId", clientFilter);
    if (typeFilter)   params.set("type", typeFilter);
    if (fromDate)     params.set("from", fromDate);
    if (toDate)       params.set("to", toDate);

    setLoading(true);
    fetch(`/api/admin/activity?${params}`)
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d.data) ? d.data : []); setTotal(d.total ?? 0); setLoading(false); });
  }, [page, unseenOnly, clientFilter, typeFilter, fromDate, toDate]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function markAllSeen() {
    setMarking(true);
    const body: Record<string, unknown> = { all: true };
    if (clientFilter) body.clientId = clientFilter;
    await fetch("/api/admin/activity", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMarking(false);
    fetchItems();
  }

  // Unique clients from current page for filter pills
  const uniqueClients = Array.from(
    new Map(items.map((i) => [i.clientId, { id: i.clientId, name: i.clientName }])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const newCount = items.filter((i) => !i.isSeen).length;

  return (
    <div className="px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Activity</h1>
            <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
              All document activity across clients
              {newCount > 0 && <span className="ml-2 rounded-full px-2 py-0.5 text-[0.62rem] font-bold text-white" style={{ background: "#1d4ed8" }}>{newCount} new</span>}
            </p>
          </div>
          {newCount > 0 && (
            <button
              onClick={markAllSeen} disabled={marking}
              className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition hover:border-[#059669] hover:text-[#059669] disabled:opacity-50"
              style={{ borderColor: "#ebecef", color: "#6b7280" }}
            >
              {marking ? "Marking…" : (
                <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Mark all seen</>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Filters row 1 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Unseen toggle */}
        <button
          onClick={() => { setUnseenOnly((v) => !v); setPage(1); }}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          style={{ background: unseenOnly ? "#1d4ed8" : "#f3f4f6", color: unseenOnly ? "#fff" : "#6b7280" }}
        >
          {unseenOnly ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <span className="h-2 w-2 rounded-full" style={{ background: "#1d4ed8" }} />
          )}
          New only
        </button>

        {/* Type filter */}
        <div className="flex items-center gap-1.5">
          {["", ...DOC_TYPES].map((t) => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
              style={{ background: typeFilter === t ? "#171717" : "#f3f4f6", color: typeFilter === t ? "#fff" : "#6b7280" }}>
              {t || "All types"}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row 2 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Client filter */}
        <button onClick={() => { setClientFilter(null); setPage(1); }}
          className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
          style={{ background: clientFilter === null ? "#171717" : "#f3f4f6", color: clientFilter === null ? "#fff" : "#6b7280" }}>
          All clients
        </button>
        {uniqueClients.map((c) => (
          <button key={c.id} onClick={() => { setClientFilter(clientFilter === c.id ? null : c.id); setPage(1); }}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition"
            style={{ background: clientFilter === c.id ? "#171717" : "#f3f4f6", color: clientFilter === c.id ? "#fff" : "#6b7280" }}>
            {c.name}
          </button>
        ))}

        {/* Date range */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs" style={{ color: "#9ca3af" }}>From</span>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="rounded-lg border px-2.5 py-1.5 text-xs outline-none transition"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
          <span className="text-xs" style={{ color: "#9ca3af" }}>To</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="rounded-lg border px-2.5 py-1.5 text-xs outline-none transition"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="text-xs transition" style={{ color: "#9ca3af" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {items.length === 0 && !loading ? (
        <div className="rounded-2xl border bg-white px-6 py-12 text-center" style={{ borderColor: "#ebecef" }}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "#f3f4f6" }}>
            <svg className="h-5 w-5" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "#6b7280" }}>No activity{unseenOnly ? " to review" : " found"}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                {["When", "Client", "Document", "Type", "Folder", "Size", ""].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={8} cols={7} />
              ) : items.map((item, i) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.015 }}
                  className="group transition-colors hover:bg-[#fafafa]"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid #f9f9fb" : "none" }}
                >
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-medium" style={{ color: "#171717" }}>{timeAgo(item.createdAt)}</div>
                    <div className="text-[0.65rem]" style={{ color: "#9ca3af" }}>
                      {formatDate(item.createdAt)} {formatTime(item.createdAt)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/clients/${item.clientId}`} className="text-sm font-medium hover:underline" style={{ color: "#171717" }}>
                      {item.clientName}
                    </Link>
                    {item.clientCompany && (
                      <div className="text-xs" style={{ color: "#9ca3af" }}>{item.clientCompany}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium" style={{ color: "#171717" }}>{item.name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    {item.type ? (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[0.62rem] font-semibold" style={{ background: "#f3f4f6", color: "#6b7280" }}>{item.type}</span>
                    ) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {item.folder ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.65rem] font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                        {item.folder}
                      </span>
                    ) : <span style={{ color: "#d1d5db" }}>—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-xs" style={{ color: "#9ca3af" }}>{formatBytes(item.sizeBytes)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {!item.isSeen && (
                      <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase text-white" style={{ background: "#1d4ed8" }}>New</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} total={total} limit={LIMIT} onPage={(p) => setPage(p)} />
        </div>
      )}
    </div>
  );
}
