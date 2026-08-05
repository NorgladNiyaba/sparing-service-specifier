"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SkeletonStatCard, SkeletonDocRow, SkeletonWelcomeBanner } from "@/components/portal/portal-skeleton";
import { DocPreviewModal } from "@/components/portal/doc-preview-modal";
import { usePortalContext } from "@/components/portal/portal-context";
import { useOnboarding } from "@/components/portal/onboarding-context";
import { SetupCard } from "@/components/portal/setup-card";
import type { Client, ClientDocument } from "@/lib/supabase/types";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  ===1) return "Yesterday";
  if (days  <  7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPlan(track: string) {
  if (track === "ECSS") return "Growth Support";
  if (track === "ICSS") return "Independent Support";
  if (track === "OHSS") return "Office Hours Support";
  return track;
}
function formatSchedule(s: string) {
  if (s === "monthly-1st")  return "Monthly · 1st";
  if (s === "monthly-16th") return "Monthly · 16th";
  if (s === "semi-monthly") return "Semi-monthly";
  return s;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Contract:   { bg: "rgba(214,27,23,0.08)",  text: "#d61b17" },
  Onboarding: { bg: "rgba(16,185,129,0.09)", text: "#059669" },
  Report:     { bg: "rgba(245,158,11,0.09)", text: "#d97706" },
  Invoice:    { bg: "rgba(59,130,246,0.09)", text: "#2563eb" },
};

/* ── Sub-components ──────────────────────────────────────────────────── */

function StatCard({ label, value, sub, delay = 0 }: { label: string; value: React.ReactNode; sub?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="rounded-2xl bg-white px-5 py-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="text-[0.64rem] font-semibold uppercase tracking-[0.13em]" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="mt-2 text-[1.22rem] font-bold leading-snug tracking-[-0.025em]" style={{ color: "var(--ink)" }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>{sub}</div>}
    </motion.div>
  );
}

/* Quick-action pill */
function QuickAction({
  href, onClick, icon, label, sub, color, delay,
}: {
  href?: string; onClick?: () => void;
  icon: React.ReactNode; label: string; sub: string;
  color: string; delay: number;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="press group flex items-center gap-3.5 rounded-2xl border bg-white px-4 py-3.5 text-left transition-shadow hover:shadow-md"
      style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110"
        style={{ background: `${color}14` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-none" style={{ color: "var(--ink)" }}>{label}</p>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>{sub}</p>
      </div>
      <svg className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--ink-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </motion.div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return <button onClick={onClick} className="w-full text-left">{inner}</button>;
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { activeClientId } = usePortalContext();
  const { state: onboarding } = useOnboarding();
  const [client,      setClient]      = useState<Client | null>(null);
  const [allDocs,     setAllDocs]     = useState<ClientDocument[]>([]);
  const [newDocCount, setNewDocCount] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [previewDoc,  setPreviewDoc]  = useState<ClientDocument | null>(null);
  const [advisor,     setAdvisor]     = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    Promise.all([
      fetch("/api/portal/client").then((r) => r.ok ? r.json() : null) as Promise<Client | null>,
      fetch("/api/portal/documents").then((r) => r.ok ? r.json() : { folders: [], documents: [] }) as Promise<{
        folders: Array<{ id: string; name: string; parent_id: string | null }>;
        documents: ClientDocument[];
      }>,
      fetch("/api/portal/advisor").then((r) => r.ok ? r.json() : null) as Promise<{ name: string; email: string } | null>,
    ]).then(([clientRes, docsRes, advisorRes]) => {
      if (clientRes) setClient(clientRes);
      const docs = docsRes.documents ?? [];
      const colFolder = (docsRes.folders ?? []).find((f) => f.name === "Collection Files" && !f.parent_id);
      setAllDocs(docs);
      setNewDocCount(docs.filter((d) => !d.is_seen).length);
      setUploadCount(colFolder ? docs.filter((d) => d.folder_id === colFolder.id).length : 0);
      if (advisorRes) setAdvisor(advisorRes);
      setLoading(false);
    });
  }, [activeClientId]);

  const recentDocs   = allDocs.slice(0, 3);
  const contractDoc  = allDocs.find((d) => d.storage_path === "__contract__") ?? null;
  const firstName    = client?.full_name?.split(" ")[0] ?? "";

  /* Onboarding is the headline while any step is outstanding — derived from
     real state by the provider, so it clears itself as steps are finished. */
  const showSetup = !loading && !!onboarding &&
    onboarding.schemaReady && !(onboarding.progress.complete && onboarding.celebratedAt);

  function openDoc(doc: ClientDocument) { setPreviewDoc(doc); }

  return (
    <div className="min-h-full">
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      {/* ── Welcome banner ────────────────────────────────────────── */}
      {loading ? (
        <SkeletonWelcomeBanner />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-4 mt-6 overflow-hidden rounded-2xl px-6 py-7 sm:mx-6 sm:px-8"
          style={{ background: "linear-gradient(135deg, #0f0f11 0%, #1c0a09 55%, #0f0f11 100%)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.28)" }}>
                {getGreeting()}
              </p>
              <h1 className="mt-1 text-[1.4rem] font-bold tracking-[-0.03em] sm:text-[1.6rem]" style={{ color: "#ffffff" }}>
                {firstName ? `${firstName}.` : "Welcome."}
              </h1>
              {client && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.63rem] font-bold uppercase tracking-[0.13em]"
                    style={{ background: "rgba(214,27,23,0.18)", borderColor: "rgba(214,27,23,0.28)", color: "#f87171" }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#f87171" }} />
                    {client.service_track} · {formatPlan(client.service_track)}
                  </span>
                  {client.company_name && (
                    <span className="text-[0.75rem]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {client.company_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Advisor card */}
            <div className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 sm:flex-col sm:items-end sm:gap-1 sm:px-0 sm:py-0 sm:text-right"
              style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14 }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white sm:hidden"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                {(advisor?.name ?? ADVISOR_NAME).split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-[0.63rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.28)" }}>Your advisor</div>
                <div className="mt-0.5 text-sm font-semibold" style={{ color: "#ffffff" }}>{advisor?.name ?? ADVISOR_NAME}</div>
                <a
                  href={`mailto:${advisor?.email ?? ADVISOR_EMAIL}`}
                  className="mt-0.5 block text-xs transition-colors hover:text-white/60"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {advisor?.email ?? ADVISOR_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-5 px-4 py-5 sm:px-6">

        {/* ── Quick actions ─────────────────────────────────────────── */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickAction
              href="/portal/uploads"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
              label="Upload files"
              sub="Send to your advisor"
              color="#d61b17"
              delay={0.06}
            />
            <QuickAction
              href="/portal/messages"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>}
              label="Messages"
              sub="Chat with your advisor"
              color="#2563eb"
              delay={0.1}
            />
            <QuickAction
              onClick={contractDoc ? () => openDoc(contractDoc) : undefined}
              href={contractDoc ? undefined : "/portal/documents"}
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              label="Contract"
              sub="View your agreement"
              color="#059669"
              delay={0.14}
            />
            <QuickAction
              href="/portal/billing"
              icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
              label="Billing"
              sub="Invoices & payments"
              color="#d97706"
              delay={0.18}
            />
          </div>
        )}

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading ? (
            [1, 2, 3].map((i) => <SkeletonStatCard key={i} />)
          ) : client ? (
            <>
              <StatCard
                label="Active Plan"
                delay={0.08}
                value={
                  <span className="flex items-baseline gap-1.5">
                    <span style={{ color: "#d61b17" }}>{client.service_track}</span>
                    <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>{formatPlan(client.service_track)}</span>
                  </span>
                }
                sub={`Engaged since ${new Date(client.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
              />
              <StatCard
                label="Monthly billing"
                delay={0.13}
                value={
                  <span>
                    <span style={{ color: "var(--ink)" }}>${client.monthly_price.toLocaleString()}</span>
                    <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>/mo</span>
                  </span>
                }
                sub={formatSchedule(client.payment_schedule)}
              />
              <StatCard
                label="Documents"
                delay={0.18}
                value={
                  <span className="flex items-center gap-2">
                    <span>{allDocs.length}</span>
                    <AnimatePresence>
                      {newDocCount > 0 && (
                        <motion.span
                          key="newbadge"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                          style={{ background: "#d61b17" }}
                        >
                          {newDocCount} new
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                }
                sub={`${uploadCount} upload${uploadCount !== 1 ? "s" : ""} on record`}
              />
            </>
          ) : null}
        </div>

        {/* ── First steps ───────────────────────────────────────────────
            Sits above the document list rather than replacing it, so a new
            client can still see their contract while setup is outstanding. */}
        <AnimatePresence>
          {showSetup && (
            <motion.div key="setup" exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <SetupCard />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Recent documents ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" exit={{ opacity: 0 }} className="space-y-2">
                {[1, 2, 3].map((i) => <SkeletonDocRow key={i} />)}
              </motion.div>
            ) : (
              <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Recent Documents</h2>
                  <Link
                    href="/portal/documents"
                    className="text-xs font-medium transition-colors hover:text-brand"
                    style={{ color: "var(--ink-3)" }}
                  >
                    View all →
                  </Link>
                </div>
                {recentDocs.length > 0 ? (
                  <div className="space-y-2">
                    {recentDocs.map((doc, i) => {
                      const colors = TYPE_COLORS[doc.type] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280" };
                      return (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: 0.24 + i * 0.05, ease: "easeOut" }}
                          className="group flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 transition-shadow hover:shadow-md"
                          style={{
                            borderColor: doc.is_seen ? "var(--line)" : "rgba(214,27,23,0.2)",
                            boxShadow: doc.is_seen ? "var(--shadow-card)" : "0 0 0 1px rgba(214,27,23,0.08), var(--shadow-card)",
                          }}
                        >
                          {/* Doc type icon */}
                          <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg" style={{ background: colors.bg }}>
                            <div className="h-0.5 w-4 rounded-full opacity-60" style={{ background: colors.text }} />
                            <div className="h-0.5 w-4 rounded-full opacity-40" style={{ background: colors.text }} />
                            <div className="h-0.5 w-2.5 rounded-full opacity-30" style={{ background: colors.text }} />
                            <span className="mt-0.5 text-[0.48rem] font-bold uppercase tracking-wider" style={{ color: colors.text }}>
                              {doc.type.slice(0, 3)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => void openDoc(doc)}
                                className="truncate text-sm font-semibold transition-colors hover:text-brand"
                                style={{ color: "var(--ink)" }}
                              >
                                {doc.name}
                              </button>
                              <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.07em]"
                                style={{ background: colors.bg, color: colors.text }}>
                                {doc.type}
                              </span>
                              <AnimatePresence>
                                {!doc.is_seen && (
                                  <motion.span
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1,   opacity: 1 }}
                                    exit={  { scale: 0.7, opacity: 0 }}
                                    className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.07em] text-white"
                                    style={{ background: "#d61b17" }}
                                  >
                                    New
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            {/* Relative timestamp */}
                            <div className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
                              {formatRelative(doc.created_at)}
                            </div>
                          </div>

                          <button
                            onClick={() => void openDoc(doc)}
                            className="press shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:border-line-strong"
                            style={{ borderColor: "var(--line)", background: "var(--surface-alt)", color: "var(--ink-2)" }}
                          >
                            {doc.storage_path === "__contract__" ? "View" : "Download"}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-white px-6 py-10 text-center" style={{ borderColor: "var(--line)" }}>
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(214,27,23,0.07)" }}>
                      <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No documents yet</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>Your advisor will share files here as your engagement progresses.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Upload nudge — suppressed while the setup card is nudging ── */}
        {!loading && !showSetup && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.38, ease: "easeOut" }}
          >
            <Link href="/portal/uploads" className="group block">
              <div
                className="press rounded-2xl border-2 border-dashed bg-white px-7 py-6 text-center transition-all hover:border-brand/40 hover:shadow-md"
                style={{ borderColor: "var(--line-strong)" }}
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-110"
                  style={{ background: "rgba(214,27,23,0.07)" }}>
                  <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Upload documents for your advisor</p>
                <p className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>W-9, bank statements, or any file your advisor has requested</p>
                <span className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity group-hover:opacity-90"
                  style={{ background: "#171717" }}>
                  Go to Uploads
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </Link>
          </motion.div>
        )}

      </div>
    </div>
  );
}
