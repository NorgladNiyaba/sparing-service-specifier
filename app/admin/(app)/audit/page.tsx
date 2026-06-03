"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useAdminUser } from "@/components/admin/user-context";

interface AuditEntry {
  id:           string;
  actor_email:  string;
  actor_role:   string;
  action:       string;
  entity_type:  string | null;
  entity_id:    string | null;
  entity_label: string | null;
  changes:      Record<string, unknown> | null;
  ip_address:   string | null;
  country:      string | null;
  city:         string | null;
  user_agent:   string | null;
  created_at:   string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFull(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const ACTION_STYLE: Record<string, { bg: string; text: string }> = {
  created:  { bg: "rgba(5,150,105,0.09)",  text: "#059669" },
  uploaded: { bg: "rgba(5,150,105,0.09)",  text: "#059669" },
  updated:  { bg: "rgba(29,78,216,0.09)",  text: "#1d4ed8" },
  assigned: { bg: "rgba(29,78,216,0.09)",  text: "#1d4ed8" },
  deleted:  { bg: "rgba(239,68,68,0.09)",  text: "#dc2626" },
  deactivated: { bg: "rgba(239,68,68,0.09)", text: "#dc2626" },
  sent:     { bg: "rgba(245,158,11,0.09)", text: "#d97706" },
};

function actionStyle(action: string) {
  const verb = action.split(".")[1] ?? action;
  return ACTION_STYLE[verb] ?? { bg: "rgba(107,114,128,0.09)", text: "#6b7280" };
}

function ChangesDisplay({ changes }: { changes: Record<string, unknown> }) {
  const entries = Object.entries(changes);
  if (!entries.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {entries.map(([key, val]) => {
        const v = val as { from?: unknown; to?: unknown } | unknown;
        const isFromTo = typeof v === "object" && v !== null && "from" in (v as object);
        return (
          <span key={key} className="rounded-md px-2 py-0.5 text-[0.62rem] font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>
            {key}:{" "}
            {isFromTo ? (
              <><span style={{ color: "#9ca3af" }}>{String((v as { from: unknown }).from ?? "—")}</span>
              {" → "}
              <span style={{ color: "#171717" }}>{String((v as { to: unknown }).to ?? "—")}</span></>
            ) : (
              <span style={{ color: "#171717" }}>{String(v)}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function Pagination({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
      <span className="text-xs" style={{ color: "#9ca3af" }}>{(page-1)*limit+1}–{Math.min(page*limit, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page-1)} disabled={page===1} className="rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-30" style={{ background: "#f3f4f6", color: "#6b7280" }}>← Prev</button>
        <button onClick={() => onPage(page+1)} disabled={page===pages} className="rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-30" style={{ background: "#f3f4f6", color: "#6b7280" }}>Next →</button>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { role, loading: roleLoading } = useAdminUser();
  const [entries,  setEntries]  = useState<AuditEntry[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Filters
  const [actorFilter,  setActorFilter]  = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [fromDate,     setFromDate]     = useState("");
  const [toDate,       setToDate]       = useState("");

  const LIMIT = 50;

  const fetchEntries = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (actorFilter)  params.set("actor",  actorFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (fromDate)     params.set("from",   fromDate);
    if (toDate)       params.set("to",     toDate);

    setLoading(true);
    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(Array.isArray(d.data) ? d.data : []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [page, actorFilter, actionFilter, fromDate, toDate]);

  useEffect(() => {
    if (!roleLoading && role !== "viewer") fetchEntries();
  }, [fetchEntries, role, roleLoading]);

  function toggleExpand(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  if (!roleLoading && role === "viewer") {
    return (
      <div className="flex items-center justify-center px-8 py-20 text-center">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#171717" }}>Access restricted</p>
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Viewers do not have access to the audit log.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Audit Log</h1>
        <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
          {role === "manager" ? "Your actions" : "All admin actions"} — who did what, when, and from where
        </p>
      </motion.div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {role === "super_admin" && (
          <input
            type="text" value={actorFilter} placeholder="Filter by email…"
            onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
            className="rounded-xl border px-3.5 py-2 text-sm outline-none transition"
            style={{ borderColor: "#ebecef", color: "#171717", width: 200 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
        )}
        <input
          type="text" value={actionFilter} placeholder="Filter by action…"
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-xl border px-3.5 py-2 text-sm outline-none transition"
          style={{ borderColor: "#ebecef", color: "#171717", width: 180 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "#9ca3af" }}>From</span>
          <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none transition"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
          <span className="text-xs" style={{ color: "#9ca3af" }}>To</span>
          <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="rounded-xl border px-2.5 py-2 text-xs outline-none transition"
            style={{ borderColor: "#ebecef", color: "#6b7280" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#1d4ed8")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
          />
          {(fromDate || toDate || actorFilter || actionFilter) && (
            <button onClick={() => { setFromDate(""); setToDate(""); setActorFilter(""); setActionFilter(""); setPage(1); }}
              className="text-xs transition" style={{ color: "#9ca3af" }}>Clear</button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-3 w-24 rounded animate-pulse" style={{ background: "#f0f0f2" }} />
                <div className="h-3 w-32 rounded animate-pulse" style={{ background: "#f0f0f2" }} />
                <div className="h-5 w-24 rounded-full animate-pulse" style={{ background: "#f4f4f6" }} />
                <div className="flex-1 h-3 rounded animate-pulse" style={{ background: "#f4f4f6" }} />
                <div className="h-3 w-20 rounded animate-pulse" style={{ background: "#f4f4f6" }} />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm" style={{ color: "#9ca3af" }}>No audit events found.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
            {entries.map((entry, i) => {
              const s = actionStyle(entry.action);
              const isExpanded = expanded.has(entry.id);
              const location = [entry.city, entry.country].filter(Boolean).join(", ") || entry.ip_address || "—";
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.01 }}
                >
                  <button
                    onClick={() => toggleExpand(entry.id)}
                    className="w-full text-left transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                      {/* Time */}
                      <div className="w-20 shrink-0 text-xs" style={{ color: "#9ca3af" }} title={formatFull(entry.created_at)}>
                        {timeAgo(entry.created_at)}
                      </div>

                      {/* Actor */}
                      <div className="w-40 shrink-0 truncate text-xs font-medium" style={{ color: "#171717" }}>
                        {entry.actor_email}
                      </div>

                      {/* Action badge */}
                      <span className="rounded-full px-2.5 py-0.5 text-[0.62rem] font-semibold" style={{ background: s.bg, color: s.text }}>
                        {entry.action}
                      </span>

                      {/* Entity */}
                      <div className="min-w-0 flex-1 text-xs" style={{ color: "#6b7280" }}>
                        {entry.entity_label ?? entry.entity_id ?? ""}
                        {entry.entity_type && <span className="ml-1.5" style={{ color: "#d1d5db" }}>({entry.entity_type})</span>}
                      </div>

                      {/* Location */}
                      <div className="shrink-0 text-xs" style={{ color: "#9ca3af" }}>{location}</div>

                      {/* Expand chevron */}
                      <svg className="h-3.5 w-3.5 shrink-0 transition-transform" style={{ color: "#d1d5db", transform: isExpanded ? "rotate(180deg)" : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-5 py-3" style={{ borderColor: "#f9f9fb", background: "#fafafa" }}>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
                        <div>
                          <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Time</div>
                          <div style={{ color: "#171717" }}>{formatFull(entry.created_at)}</div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>IP Address</div>
                          <div style={{ color: "#171717" }}>{entry.ip_address ?? "—"}</div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Location</div>
                          <div style={{ color: "#171717" }}>{location}</div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Browser / OS</div>
                          <div style={{ color: "#171717" }}>{entry.user_agent ?? "—"}</div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Role at time</div>
                          <div style={{ color: "#171717" }}>{entry.actor_role}</div>
                        </div>
                        {entry.entity_id && (
                          <div>
                            <div className="font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Record ID</div>
                            <div className="font-mono" style={{ color: "#6b7280", fontSize: "0.65rem" }}>{entry.entity_id}</div>
                          </div>
                        )}
                      </div>
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <div className="mt-3">
                          <div className="mb-1.5 font-semibold uppercase tracking-[0.08em]" style={{ color: "#9ca3af", fontSize: "0.6rem" }}>Changes</div>
                          <ChangesDisplay changes={entry.changes as Record<string, unknown>} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        <Pagination page={page} total={total} limit={LIMIT} onPage={(p) => setPage(p)} />
      </div>
    </div>
  );
}
