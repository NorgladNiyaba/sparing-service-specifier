"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, Fragment } from "react";
import { SkeletonDocRow, SkeletonFolderCard } from "@/components/portal/portal-skeleton";
import { EmptyState } from "@/components/portal/empty-state";
import { DocPreviewModal } from "@/components/portal/doc-preview-modal";
import { usePortalContext } from "@/components/portal/portal-context";
import { getFolderBreadcrumbs } from "@/lib/folder-utils";
import type { ClientDocument, ClientFolder } from "@/lib/supabase/types";

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  Contract:   { bg: "rgba(214,27,23,0.08)",   text: "#d61b17" },
  Onboarding: { bg: "rgba(16,185,129,0.09)",  text: "#059669" },
  Report:     { bg: "rgba(245,158,11,0.09)",  text: "#d97706" },
  Invoice:    { bg: "rgba(59,130,246,0.09)",  text: "#2563eb" },
  Upload:     { bg: "rgba(139,92,246,0.09)",  text: "#7c3aed" },
};

export default function DocumentsPage() {
  const { activeClientId } = usePortalContext();
  const [folders,    setFolders]    = useState<ClientFolder[]>([]);
  const [documents,  setDocuments]  = useState<ClientDocument[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [previewDoc,      setPreviewDoc]      = useState<ClientDocument | null>(null);

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

  const docsInFolder   = (folderId: string) => documents.filter((d) => d.folder_id === folderId);
  const newInFolder    = (folderId: string) => docsInFolder(folderId).filter((d) => !d.is_seen).length;
  const childFolders   = (parentId: string | null) => folders.filter((f) => f.parent_id === parentId);
  const breadcrumbs    = currentFolderId ? getFolderBreadcrumbs(currentFolderId, folders) : [];
  const currentChildren = childFolders(currentFolderId);
  const currentDocs     = currentFolderId ? docsInFolder(currentFolderId) : [];

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      <AnimatePresence mode="wait">
        {currentFolderId ? (
          <motion.div
            key={currentFolderId}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
          >
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setCurrentFolderId(null)}
                className="flex items-center gap-1.5 text-sm transition-colors"
                style={{ color: "#9ca3af" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#d61b17")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                All folders
              </button>
              {breadcrumbs.map((bc, i) => (
                <Fragment key={bc.id}>
                  <span style={{ color: "#d8dbe1" }}>/</span>
                  {i < breadcrumbs.length - 1 ? (
                    <button onClick={() => setCurrentFolderId(bc.id)} className="text-sm transition-colors" style={{ color: "#6b7280" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#d61b17")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}>{bc.name}</button>
                  ) : (
                    <h1 className="text-sm font-semibold" style={{ color: "#171717" }}>{bc.name}</h1>
                  )}
                </Fragment>
              ))}
            </div>

            {/* Subfolders */}
            {currentChildren.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {currentChildren.map((subfolder) => {
                  const count = docsInFolder(subfolder.id).length;
                  const newCount = newInFolder(subfolder.id);
                  return (
                    <button key={subfolder.id} onClick={() => setCurrentFolderId(subfolder.id)}
                      className="group flex flex-col rounded-2xl border bg-white p-4 text-left transition hover:border-[#d8dbe1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                      style={{ borderColor: newCount > 0 ? "rgba(214,27,23,0.25)" : "#ebecef" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:bg-[rgba(214,27,23,0.1)]" style={{ background: "rgba(214,27,23,0.06)" }}>
                          <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                        </div>
                        {newCount > 0 && <span className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold leading-none text-white" style={{ background: "#d61b17" }}>{newCount}</span>}
                      </div>
                      <p className="text-[0.82rem] font-semibold leading-snug" style={{ color: "#171717" }}>{subfolder.name}</p>
                      <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>{count === 0 ? "Empty" : `${count} file${count !== 1 ? "s" : ""}`}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {currentDocs.length === 0 && currentChildren.length === 0 ? (
              <EmptyState
                illustration="documents"
                title="This folder is empty"
                body={breadcrumbs[0]?.name === "Collection Files"
                  ? "Files you send via the Uploads page will appear here."
                  : "Your advisor will upload files here when ready."}
              />
            ) : currentDocs.length > 0 ? (
              <div className="space-y-2">
                {currentDocs.map((doc, i) => {
                  const colors = TYPE_STYLE[doc.type] ?? { bg: "rgba(0,0,0,0.05)", text: "#6b7280" };
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="flex items-center gap-4 rounded-xl border bg-white px-4 py-4 sm:px-5"
                      style={{ borderColor: doc.is_seen ? "#ebecef" : "rgba(214,27,23,0.18)", boxShadow: doc.is_seen ? "0 1px 3px rgba(0,0,0,0.04)" : "0 0 0 1px rgba(214,27,23,0.1)" }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(214,27,23,0.07)" }}>
                        <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em]" style={{ color: "#d61b17" }}>PDF</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => void openDoc(doc)}
                            className="text-sm font-semibold transition-colors hover:underline"
                            style={{ color: "#171717" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#d61b17")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#171717")}
                          >
                            {doc.name}
                          </button>
                          <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.07em]" style={{ background: colors.bg, color: colors.text }}>
                            {doc.type}
                          </span>
                          {!doc.is_seen && (
                            <span className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.07em] text-white" style={{ background: "#d61b17" }}>New</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
                          {formatDate(doc.created_at)}{doc.size_bytes ? ` · ${formatBytes(doc.size_bytes)}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => void openDoc(doc)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:border-[#d8dbe1] sm:px-3.5"
                        style={{ borderColor: "#ebecef", background: "#f8f8f9", color: "#70757f" }}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">{doc.storage_path === "__contract__" ? "View" : "Download"}</span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="folder-grid"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-6">
              <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Documents</h1>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>Files shared by your Sparing advisor</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <SkeletonFolderCard key={i} />)}
              </div>
            ) : childFolders(null).length === 0 ? (
              <EmptyState
                illustration="folder"
                title="No folders yet"
                body="Your advisor will set these up for you shortly. Check back soon."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {childFolders(null).map((folder, i) => {
                  const count = docsInFolder(folder.id).length;
                  const newCount = newInFolder(folder.id);
                  return (
                    <motion.button
                      key={folder.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.025 }}
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="group flex flex-col rounded-2xl border bg-white p-4 text-left transition hover:border-[#d8dbe1] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                      style={{ borderColor: newCount > 0 ? "rgba(214,27,23,0.25)" : "#ebecef" }}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:bg-[rgba(214,27,23,0.1)]" style={{ background: "rgba(214,27,23,0.06)" }}>
                          <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                          </svg>
                        </div>
                        {newCount > 0 && (
                          <span className="rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold leading-none text-white" style={{ background: "#d61b17" }}>
                            {newCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.82rem] font-semibold leading-snug" style={{ color: "#171717" }}>{folder.name}</p>
                      <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                        {count === 0 ? "Empty" : `${count} file${count !== 1 ? "s" : ""}`}
                      </p>
                    </motion.button>
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
