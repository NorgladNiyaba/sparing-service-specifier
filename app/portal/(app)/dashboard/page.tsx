"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SkeletonStatCard, SkeletonDocRow, SkeletonWelcomeBanner } from "@/components/portal/portal-skeleton";
import { EmptyState } from "@/components/portal/empty-state";
import { DocPreviewModal } from "@/components/portal/doc-preview-modal";
import type { Client, ClientDocument } from "@/lib/supabase/types";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";



const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Contract:   { bg: "rgba(214,27,23,0.08)",  text: "#d61b17" },
  Onboarding: { bg: "rgba(16,185,129,0.09)", text: "#059669" },
  Report:     { bg: "rgba(245,158,11,0.09)", text: "#d97706" },
  Invoice:    { bg: "rgba(59,130,246,0.09)", text: "#2563eb" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatPlan(track: string) {
  if (track === "ECSS") return "Growth Support";
  if (track === "ICSS") return "Independent Support";
  if (track === "OHSS") return "Office Hours Support";
  return track;
}
function formatSchedule(schedule: string) {
  if (schedule === "monthly-1st") return "Monthly · 1st";
  if (schedule === "monthly-16th") return "Monthly · 16th";
  if (schedule === "semi-monthly") return "Semi-monthly";
  return schedule;
}

function StatCard({ label, value, sub, delay = 0 }: { label: string; value: React.ReactNode; sub?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_14px_rgba(0,0,0,0.04)]"
    >
      <div className="text-[0.66rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "#9ca3af" }}>{label}</div>
      <div className="mt-2 text-[1.25rem] font-bold leading-snug tracking-[-0.025em]" style={{ color: "#171717" }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const [client,       setClient]       = useState<Client | null>(null);
  const [recentDocs,   setRecentDocs]   = useState<ClientDocument[]>([]);
  const [newDocCount,  setNewDocCount]  = useState(0);
  const [uploadCount,  setUploadCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [previewDoc, setPreviewDoc] = useState<ClientDocument | null>(null);
  const [advisor,    setAdvisor]    = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("clients").select("*").maybeSingle(),
      supabase.from("client_documents").select("*").order("created_at", { ascending: false }).limit(3),
      supabase.from("client_documents").select("id").eq("is_seen" as string, false),
      supabase.from("client_documents").select("id").eq("folder" as string, "Client Uploads"),
      fetch("/api/portal/advisor").then((r) => r.ok ? r.json() : null) as Promise<{ name: string; email: string } | null>,
    ]).then(([clientRes, docsRes, newRes, uploadsRes, advisorRes]) => {
      if (clientRes.data) setClient(clientRes.data as unknown as Client);
      setRecentDocs((docsRes.data ?? []) as unknown as ClientDocument[]);
      setNewDocCount(newRes.data?.length ?? 0);
      setUploadCount(uploadsRes.data?.length ?? 0);
      if (advisorRes) setAdvisor(advisorRes);
      setLoading(false);
    });
  }, []);

  function openDoc(doc: ClientDocument) { setPreviewDoc(doc); }

  const firstName = client?.full_name?.split(" ")[0] ?? "—";

  return (
    <div className="min-h-full">
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      {/* Welcome banner */}
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
              <p className="text-[0.67rem] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                Client Portal
              </p>
              <h1 className="mt-1.5 text-[1.4rem] font-bold tracking-[-0.03em] sm:text-[1.6rem]" style={{ color: "#ffffff" }}>
                Welcome back, {firstName}.
              </h1>
              {client && (
                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.63rem] font-bold uppercase tracking-[0.13em]"
                    style={{ background: "rgba(214,27,23,0.18)", borderColor: "rgba(214,27,23,0.28)", color: "#f87171" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#f87171" }} />
                    {client.service_track}
                  </span>
                  <span className="text-[0.75rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {client.company_name}
                  </span>
                </div>
              )}
            </div>
            <div className="shrink-0 sm:text-right">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Your advisor
              </div>
              <div className="mt-1.5 text-sm font-semibold" style={{ color: "#ffffff" }}>{advisor?.name ?? ADVISOR_NAME}</div>
              <a
                href={`mailto:${advisor?.email ?? ADVISOR_EMAIL}`}
                className="mt-0.5 block text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.32)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.32)")}
              >
                {advisor?.email ?? ADVISOR_EMAIL}
              </a>
            </div>
          </div>
        </motion.div>
      )}

      <div className="space-y-6 px-4 py-6 sm:px-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                    <span className="text-sm font-normal" style={{ color: "#9ca3af" }}>{formatPlan(client.service_track)}</span>
                  </span>
                }
                sub={`Since ${formatDate(client.signed_at)}`}
              />
              <StatCard
                label="Billing"
                delay={0.13}
                value={`$${client.monthly_price.toLocaleString()}/mo`}
                sub={formatSchedule(client.payment_schedule)}
              />
              <StatCard
                label="Documents"
                delay={0.18}
                value={
                  <span className="flex items-center gap-2">
                    {recentDocs.length}
                    {newDocCount > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: "#d61b17" }}>
                        {newDocCount} new
                      </span>
                    )}
                  </span>
                }
                sub={`${uploadCount} upload${uploadCount !== 1 ? "s" : ""} on record`}
              />
            </>
          ) : null}
        </div>

        {/* Recent documents */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22, ease: "easeOut" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Recent Documents</h2>
            <Link
              href="/portal/documents"
              className="text-xs font-medium transition-colors"
              style={{ color: "#9ca3af" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d61b17")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
            >
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <SkeletonDocRow key={i} />)}
            </div>
          ) : recentDocs.length > 0 ? (
            <div className="space-y-2">
              {recentDocs.map((doc, i) => {
                const colors = TYPE_COLORS[doc.type] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280" };
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.24 + i * 0.05, ease: "easeOut" }}
                    className="flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5"
                    style={{ borderColor: "#ebecef" }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(214,27,23,0.07)" }}>
                      <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em]" style={{ color: "#d61b17" }}>PDF</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void openDoc(doc)}
                          className="truncate text-sm font-semibold transition-colors hover:underline"
                          style={{ color: "#171717" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#d61b17")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#171717")}
                        >
                          {doc.name}
                        </button>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.07em]" style={{ background: colors.bg, color: colors.text }}>
                          {doc.type}
                        </span>
                        {!doc.is_seen && (
                          <span className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.07em] text-white" style={{ background: "#d61b17" }}>
                            New
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>{formatDate(doc.created_at)}</div>
                    </div>
                    <button
                      onClick={() => void openDoc(doc)}
                      className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#d8dbe1]"
                      style={{ borderColor: "#ebecef", background: "#f8f8f9", color: "#70757f" }}
                    >
                      {doc.storage_path === "__contract__" ? "View" : "Download"}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border bg-white" style={{ borderColor: "#ebecef" }}>
              <EmptyState
                illustration="documents"
                title="No documents yet"
                body="Your advisor will share files here as your engagement progresses."
              />
            </div>
          )}
        </motion.div>

        {/* Upload nudge */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38, ease: "easeOut" }}
          className="rounded-2xl border-2 border-dashed bg-white p-7 text-center"
          style={{ borderColor: "#d8dbe1" }}
        >
          <div className="mx-auto mb-3.5 flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(214,27,23,0.07)" }}>
            <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "#171717" }}>Upload documents for your advisor</p>
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>W-9, bank statements, or any file your advisor has requested</p>
          <Link
            href="/portal/uploads"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-85"
            style={{ background: "#171717" }}
          >
            Go to Uploads
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
