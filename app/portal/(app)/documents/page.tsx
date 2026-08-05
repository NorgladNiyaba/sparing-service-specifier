"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, Fragment } from "react";
import { SkeletonDocRow, SkeletonFolderCard } from "@/components/portal/portal-skeleton";
import { DocPreviewModal } from "@/components/portal/doc-preview-modal";
import { usePortalContext } from "@/components/portal/portal-context";
import { getFolderBreadcrumbs } from "@/lib/folder-utils";
import type { ClientDocument, ClientFolder } from "@/lib/supabase/types";

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatRelative(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  === 1) return "Yesterday";
  if (days  <  7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Contract:   { bg: "rgba(214,27,23,0.08)",  text: "#d61b17", dot: "#d61b17" },
  Onboarding: { bg: "rgba(16,185,129,0.09)", text: "#059669", dot: "#059669" },
  Report:     { bg: "rgba(245,158,11,0.09)", text: "#d97706", dot: "#d97706" },
  Invoice:    { bg: "rgba(59,130,246,0.09)", text: "#2563eb", dot: "#2563eb" },
  Upload:     { bg: "rgba(139,92,246,0.09)", text: "#7c3aed", dot: "#7c3aed" },
};

function fallbackStyle(type: string) {
  return TYPE_STYLE[type] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280", dot: "#9ca3af" };
}

/* Document type icon — styled page with colored header bar */
function DocTypeIcon({ type }: { type: string }) {
  const { bg, text } = fallbackStyle(type);
  return (
    <div className="relative flex h-10 w-10 shrink-0 flex-col overflow-hidden rounded-xl" style={{ background: bg }}>
      <div className="h-[6px] w-full" style={{ background: text, opacity: 0.7 }} />
      <div className="flex flex-1 flex-col justify-center gap-[3px] px-1.5 py-1">
        <div className="h-[2.5px] w-full rounded-full" style={{ background: text, opacity: 0.35 }} />
        <div className="h-[2.5px] w-full rounded-full" style={{ background: text, opacity: 0.25 }} />
        <div className="h-[2.5px] w-3/4 rounded-full" style={{ background: text, opacity: 0.18 }} />
      </div>
      <span className="absolute bottom-1 right-1 text-[0.42rem] font-bold uppercase tracking-wide" style={{ color: text }}>
        {type.slice(0, 3)}
      </span>
    </div>
  );
}

/* Folder card type-dot strip */
function FolderTypeDots({ docs }: { docs: ClientDocument[] }) {
  const types = [...new Set(docs.map((d) => d.type))].slice(0, 4);
  if (types.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {types.map((t) => (
        <div key={t} className="h-1.5 w-1.5 rounded-full" style={{ background: fallbackStyle(t).dot }} title={t} />
      ))}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function DocumentsPage() {
  const { activeClientId } = usePortalContext();
  const [folders,          setFolders]          = useState<ClientFolder[]>([]);
  const [documents,        setDocuments]        = useState<ClientDocument[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [currentFolderId,  setCurrentFolderId]  = useState<string | null>(null);
  const [previewDoc,       setPreviewDoc]       = useState<ClientDocument | null>(null);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    setCurrentFolderId(null);
    fetch("/api/portal/documents")
      .then((r) => r.json())
      .then((d: { folders: ClientFolder[]; documents: ClientDocument[] }) => {
        setFolders(d.folders ?? []);
        setDocuments(d.documents ?? []);
        setLoading(false);
      });
  }, [activeClientId]);

  function openDoc(doc: ClientDocument) {
    if (!doc.is_seen) {
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, is_seen: true } : d));
      void fetch("/api/portal/documents", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: doc.id }),
      });
    }
    setPreviewDoc(doc);
  }

  const docsInFolder    = (folderId: string) => documents.filter((d) => d.folder_id === folderId);
  const newInFolder     = (folderId: string) => docsInFolder(folderId).filter((d) => !d.is_seen).length;
  const childFolders    = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);
  const breadcrumbs     = currentFolderId ? getFolderBreadcrumbs(currentFolderId, folders) : [];
  const currentChildren = childFolders(currentFolderId);
  const currentDocs     = currentFolderId ? docsInFolder(currentFolderId) : [];

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      <AnimatePresence mode="wait">
        {/* ── Folder view (inside a folder) ───────────────────────── */}
        {currentFolderId ? (
          <motion.div
            key={currentFolderId}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="press flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium transition-colors hover:bg-black/5"
                style={{ color: "var(--ink-3)" }}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Documents
              </button>
              {breadcrumbs.map((bc, i) => (
                <Fragment key={bc.id}>
                  <svg className="h-3 w-3 shrink-0" style={{ color: "var(--line-strong)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                  </svg>
                  {i < breadcrumbs.length - 1 ? (
                    <button
                      onClick={() => setCurrentFolderId(bc.id)}
                      className="press rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/5"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {bc.name}
                    </button>
                  ) : (
                    <span className="rounded-lg px-2 py-1 text-sm font-semibold" style={{ color: "var(--ink)", background: "rgba(0,0,0,0.04)" }}>
                      {bc.name}
                    </span>
                  )}
                </Fragment>
              ))}
            </div>

            {/* Sub-folders */}
            {currentChildren.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {currentChildren.map((subfolder) => {
                  const count    = docsInFolder(subfolder.id).length;
                  const newCount = newInFolder(subfolder.id);
                  const docs     = docsInFolder(subfolder.id);
                  return (
                    <FolderCard
                      key={subfolder.id}
                      folder={subfolder}
                      count={count}
                      newCount={newCount}
                      docs={docs}
                      onClick={() => setCurrentFolderId(subfolder.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Empty folder */}
            {currentDocs.length === 0 && currentChildren.length === 0 && (
              <FolderEmptyState folderName={breadcrumbs[breadcrumbs.length - 1]?.name ?? ""} />
            )}

            {/* Document rows */}
            {currentDocs.length > 0 && (
              <div className="space-y-2">
                {currentDocs.map((doc, i) => (
                  <DocRow key={doc.id} doc={doc} index={i} onOpen={() => openDoc(doc)} />
                ))}
              </div>
            )}
          </motion.div>

        ) : (
        /* ── Root folder grid ──────────────────────────────────────── */
          <motion.div
            key="folder-grid"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6">
              <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "var(--ink)" }}>Documents</h1>
              <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>Files and folders shared by your Sparing advisor</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonFolderCard key={i} />)}
              </div>
            ) : childFolders(null).length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border bg-white py-16 text-center" style={{ borderColor: "var(--line)" }}>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.07)" }}>
                  <svg className="h-7 w-7" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No folders yet</p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                  Your advisor will set these up as your engagement progresses.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {childFolders(null).map((folder, i) => {
                  const count    = docsInFolder(folder.id).length;
                  const newCount = newInFolder(folder.id);
                  const docs     = docsInFolder(folder.id);
                  return (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      count={count}
                      newCount={newCount}
                      docs={docs}
                      delay={i * 0.025}
                      onClick={() => setCurrentFolderId(folder.id)}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Folder card ─────────────────────────────────────────────────────── */

function FolderCard({
  folder, count, newCount, docs, delay = 0, onClick,
}: {
  folder: ClientFolder; count: number; newCount: number;
  docs: ClientDocument[]; delay?: number; onClick: () => void;
}) {
  const hasNew = newCount > 0;
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
      onClick={onClick}
      className="press group relative flex flex-col rounded-2xl border bg-white p-4 text-left transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: hasNew ? "rgba(214,27,23,0.2)" : "var(--line)",
        boxShadow: hasNew ? "0 0 0 1px rgba(214,27,23,0.07)" : "var(--shadow-card)",
      }}
    >
      {/* Icon row */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ background: hasNew ? "rgba(214,27,23,0.1)" : "rgba(214,27,23,0.06)" }}
        >
          {count > 0 ? (
            /* Stacked pages icon for non-empty folders */
            <div className="relative h-5 w-5">
              <div className="absolute bottom-0 left-0.5 h-4 w-4 rounded-sm border" style={{ background: "#fff", borderColor: "rgba(214,27,23,0.3)" }} />
              <div className="absolute bottom-0.5 left-0 h-4 w-4 rounded-sm" style={{ background: "rgba(214,27,23,0.08)", border: "1px solid rgba(214,27,23,0.25)" }} />
            </div>
          ) : (
            <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          )}
        </div>

        {/* New badge with pulse */}
        {hasNew && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#d61b17" }} />
            <span className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold text-white" style={{ background: "#d61b17" }}>
              {newCount}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-[0.82rem] font-semibold leading-snug" style={{ color: "var(--ink)" }}>{folder.name}</p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {count === 0 ? "Empty" : `${count} file${count !== 1 ? "s" : ""}`}
        </p>
        <FolderTypeDots docs={docs} />
      </div>

      {/* Hover arrow */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <svg className="h-3.5 w-3.5" style={{ color: "var(--ink-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </motion.button>
  );
}

/* ── Document row ────────────────────────────────────────────────────── */

function DocRow({ doc, index, onOpen }: { doc: ClientDocument; index: number; onOpen: () => void }) {
  const style = fallbackStyle(doc.type);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className="group flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5 transition-all duration-150 hover:shadow-md"
      style={{
        borderColor: doc.is_seen ? "var(--line)" : "rgba(214,27,23,0.18)",
        boxShadow:   doc.is_seen ? "var(--shadow-card)" : "0 0 0 1px rgba(214,27,23,0.08), var(--shadow-card)",
      }}
    >
      <DocTypeIcon type={doc.type} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpen}
            className="truncate text-sm font-semibold transition-colors hover:text-brand"
            style={{ color: "var(--ink)" }}
          >
            {doc.name}
          </button>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.07em]"
            style={{ background: style.bg, color: style.text }}
          >
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
        <div className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
          {formatRelative(doc.created_at)}
          {doc.size_bytes ? ` · ${doc.size_bytes >= 1_048_576 ? `${(doc.size_bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(doc.size_bytes / 1024)} KB`}` : ""}
        </div>
      </div>

      {/* Action — always visible, lifts on hover */}
      <button
        onClick={onOpen}
        className="press flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all hover:border-brand hover:text-brand"
        style={{ borderColor: "var(--line)", background: "var(--surface-alt)", color: "var(--ink-2)" }}
      >
        {doc.storage_path === "__contract__" ? (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden sm:inline">View</span>
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </>
        )}
      </button>
    </motion.div>
  );
}

/* ── Empty folder state ──────────────────────────────────────────────── */

function FolderEmptyState({ folderName }: { folderName: string }) {
  const isCollection = folderName === "Collection Files";
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-white py-14 text-center" style={{ borderColor: "var(--line)" }}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.06)" }}>
        <svg className="h-6 w-6" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {isCollection ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          )}
        </svg>
      </div>
      <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
        {isCollection ? "No uploads yet" : "This folder is empty"}
      </p>
      <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
        {isCollection
          ? "Files you send via the Uploads page will appear here."
          : "Your advisor will upload files here when ready."}
      </p>
    </div>
  );
}
