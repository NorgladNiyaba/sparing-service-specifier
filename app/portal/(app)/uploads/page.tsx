"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadToStorage } from "@/lib/storage-upload";
import { useToast } from "@/components/portal/toast";
import { SkeletonUploadRow } from "@/components/portal/portal-skeleton";
import { usePortalContext } from "@/components/portal/portal-context";
import type { ClientDocument } from "@/lib/supabase/types";

/* phase: uploading → processing → (replaced by real doc) */
type LocalDoc = ClientDocument & { phase?: "uploading" | "processing"; progress?: number };

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

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

async function openUpload(doc: LocalDoc) {
  if (!doc.storage_path) return;
  const { data } = await createClient().storage
    .from("client-documents")
    .createSignedUrl(doc.storage_path, 600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}

/* Shared with the onboarding uploader — see lib/storage-upload.ts */
const uploadFileXHR = uploadToStorage;

/* ── File type icon ───────────────────────────────────────────────────── */

const EXT_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pdf:  { bg: "rgba(214,27,23,0.1)",   color: "#d61b17", label: "PDF" },
  doc:  { bg: "rgba(37,99,235,0.09)",  color: "#1d4ed8", label: "DOC" },
  docx: { bg: "rgba(37,99,235,0.09)",  color: "#1d4ed8", label: "DOC" },
  xls:  { bg: "rgba(5,150,105,0.09)",  color: "#059669", label: "XLS" },
  xlsx: { bg: "rgba(5,150,105,0.09)",  color: "#059669", label: "XLS" },
  png:  { bg: "rgba(139,92,246,0.09)", color: "#7c3aed", label: "IMG" },
  jpg:  { bg: "rgba(139,92,246,0.09)", color: "#7c3aed", label: "IMG" },
  jpeg: { bg: "rgba(139,92,246,0.09)", color: "#7c3aed", label: "IMG" },
  webp: { bg: "rgba(139,92,246,0.09)", color: "#7c3aed", label: "IMG" },
};

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const style = EXT_STYLE[ext] ?? { bg: "rgba(107,114,128,0.09)", color: "#6b7280", label: ext.toUpperCase().slice(0, 3) || "FILE" };
  return (
    <div className="relative flex h-10 w-10 shrink-0 flex-col overflow-hidden rounded-xl" style={{ background: style.bg }}>
      <div className="h-[5px] w-full" style={{ background: style.color, opacity: 0.65 }} />
      <div className="flex flex-1 flex-col justify-center gap-[3px] px-1.5 py-1">
        <div className="h-[2px] w-full rounded-full" style={{ background: style.color, opacity: 0.35 }} />
        <div className="h-[2px] w-full rounded-full" style={{ background: style.color, opacity: 0.25 }} />
        <div className="h-[2px] w-3/4 rounded-full" style={{ background: style.color, opacity: 0.18 }} />
      </div>
      <span className="absolute bottom-0.5 right-1 text-[0.4rem] font-bold uppercase tracking-wide" style={{ color: style.color }}>
        {style.label}
      </span>
    </div>
  );
}

/* ── Upload phase row ─────────────────────────────────────────────────── */

function UploadRow({
  file, onOpen, onDelete,
}: {
  file: LocalDoc;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const inProgress = file.phase === "uploading" || file.phase === "processing";
  const pct = file.progress ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center gap-4 overflow-hidden rounded-xl border bg-white px-4 py-3.5 transition-all duration-150"
      style={{
        borderColor: inProgress ? "rgba(214,27,23,0.15)" : "var(--line)",
        boxShadow:   inProgress ? "none" : "var(--shadow-card)",
      }}
    >
      <FileIcon name={file.name} />

      <div className="min-w-0 flex-1">
        <button
          onClick={() => !inProgress && onOpen()}
          className="block w-full truncate text-left text-sm font-medium transition-colors hover:text-brand"
          style={{ color: "var(--ink)", cursor: inProgress ? "default" : "pointer" }}
          disabled={inProgress}
        >
          {file.name}
        </button>

        {/* Upload phase indicator */}
        {file.phase === "uploading" && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[0.65rem] font-medium" style={{ color: "var(--ink-3)" }}>Uploading…</span>
              <span className="text-[0.65rem] font-semibold tabular-nums" style={{ color: "#d61b17" }}>{pct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #d61b17, #e84040)" }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.12 }}
              />
            </div>
          </div>
        )}

        {file.phase === "processing" && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <svg className="h-3 w-3 animate-spin" style={{ color: "#d61b17" }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="20 60" />
            </svg>
            <span className="text-[0.65rem]" style={{ color: "var(--ink-3)" }}>Processing…</span>
          </div>
        )}

        {!inProgress && (
          <div className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
            {[formatBytes(file.size_bytes), formatRelative(file.created_at)].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* Done state actions */}
      {!inProgress && (
        <div className="flex shrink-0 items-center gap-2">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1,   opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide"
            style={{ background: "rgba(5,150,105,0.09)", color: "#059669" }}
          >
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Sent
          </motion.span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="press flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:border-brand hover:text-brand"
            style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
            title="Open file"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="press flex h-8 w-8 items-center justify-center rounded-lg border transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}
            title="Delete upload"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function UploadsPage() {
  const { activeClientId } = usePortalContext();
  const [uploads,    setUploads]    = useState<LocalDoc[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [dragging,   setDragging]   = useState(false);
  const [search,     setSearch]     = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filtered = uploads
    .filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortNewest
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    fetch("/api/portal/uploads")
      .then((r) => r.json())
      .then((data: ClientDocument[]) => { setUploads(data ?? []); setLoading(false); });
  }, [activeClientId]);

  async function handleDelete(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    const res = await fetch("/api/portal/uploads", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast("Failed to delete file.", "error");
      fetch("/api/portal/uploads").then((r) => r.json()).then((d: LocalDoc[]) => setUploads(d ?? []));
    } else {
      toast("File deleted.", "success");
    }
  }

  const enqueue = useCallback(async (files: FileList | null) => {
    if (!files || !activeClientId) return;
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { toast("Not authenticated — please sign in again.", "error"); return; }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    for (const file of Array.from(files)) {
      const validateRes = await fetch("/api/portal/validate-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ filename: file.name, sizeBytes: file.size }),
      });
      if (!validateRes.ok) {
        const { error } = await validateRes.json() as { error: string };
        toast(error ?? `"${file.name}" cannot be uploaded.`, "error");
        continue;
      }

      const tempId    = crypto.randomUUID();
      const timestamp = Date.now();
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path      = `${activeClientId}/${timestamp}_${safeName}`;

      setUploads((prev) => [{
        id: tempId, client_id: activeClientId, name: file.name, type: "Upload",
        storage_path: path, size_bytes: file.size, is_seen: true,
        folder_id: null, created_at: new Date().toISOString(),
        phase: "uploading", progress: 0,
      } as LocalDoc, ...prev]);

      try {
        await uploadFileXHR(file, path, session.access_token, supabaseUrl, (pct) => {
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        });

        /* Phase 2: XHR done, registering in DB */
        setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, phase: "processing" as const, progress: 100 } : u));

        const insertRes = await fetch("/api/portal/uploads", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: file.name, storage_path: path, size_bytes: file.size }),
        });
        const inserted = insertRes.ok ? await insertRes.json() as ClientDocument : null;

        /* Phase 3: done — replace optimistic row with real doc */
        setUploads((prev) =>
          prev.map((u) => u.id === tempId ? { ...(inserted ?? { ...u, id: tempId }), phase: undefined, progress: undefined } : u)
        );
        toast(`"${file.name}" sent to your advisor.`, "success");
      } catch {
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
        toast(`Failed to upload "${file.name}". Please try again.`, "error");
      }
    }
  }, [activeClientId, toast]);

  /* Drag counter to avoid flicker on child elements */
  const dragCounter = useRef(0);

  return (
    <div
      className="min-h-full px-4 py-8 sm:px-6"
      onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setDragging(true); }}
      onDragLeave={() => { dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false); } }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); dragCounter.current = 0; setDragging(false); void enqueue(e.dataTransfer.files); }}
    >
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "var(--ink)" }}>Uploads</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>Send files securely to your Sparing advisor</p>
      </motion.div>

      {/* ── Drop zone ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        className="relative mt-6 cursor-pointer overflow-hidden rounded-2xl bg-white"
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: dragging ? "rgba(214,27,23,0.025)" : "#ffffff",
          boxShadow: dragging
            ? "0 0 0 2px #d61b17, 0 0 32px rgba(214,27,23,0.12)"
            : "var(--shadow-card)",
          transition: "background 0.18s, box-shadow 0.18s",
          minHeight: 160,
        }}
      >
        {/* Breathing dashed border overlay */}
        <div
          className={`pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed ${!dragging ? "dash-breathe" : ""}`}
          style={{ borderColor: dragging ? "#d61b17" : "#d8dbe1" }}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => void enqueue(e.target.files)}
        />


        {/* Content */}
        <div className="relative flex flex-col items-center justify-center px-8 py-10 text-center">
          <motion.div
            animate={{ scale: dragging ? 1.12 : 1, y: dragging ? -3 : 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: dragging ? "rgba(214,27,23,0.12)" : "rgba(214,27,23,0.07)" }}
          >
            <svg
              className="h-7 w-7"
              style={{ color: "#d61b17" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </motion.div>

          <p className="text-[0.95rem] font-semibold" style={{ color: dragging ? "#d61b17" : "var(--ink)" }}>
            {dragging ? "Release to send" : "Drop files here"}
          </p>
          <p className="mt-1.5 text-sm" style={{ color: "var(--ink-3)" }}>
            or{" "}
            <span className="font-medium" style={{ color: "#d61b17" }}>browse your computer</span>
          </p>
          <p className="mt-3 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}>
            PDF · Word · Excel · Images &mdash; up to 50 MB
          </p>
        </div>
      </motion.div>

      {/* ── File list ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.12 }}
        className="mt-8"
      >
        {loading ? (
          <div className="space-y-2">
            <div className="mb-4 h-8 w-full rounded-xl skeleton" />
            {[1, 2, 3].map((i) => <SkeletonUploadRow key={i} />)}
          </div>
        ) : (
          <>
            {/* Toolbar — always visible */}
            <div className="mb-4 flex items-center gap-3">
              <h2 className="shrink-0 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                {uploads.length > 0 ? `${uploads.length} file${uploads.length !== 1 ? "s" : ""}` : "Files"}
              </h2>

              {/* Search — always visible */}
              <div
                className="relative flex-1 transition-all duration-200"
                style={{ maxWidth: searchFocused ? "100%" : 240 }}
              >
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: "var(--ink-3)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search files…"
                  className="w-full rounded-xl border py-2 pl-9 pr-3 text-xs transition-all duration-200"
                  style={{
                    borderColor: searchFocused ? "var(--brand)" : "var(--line)",
                    background: searchFocused ? "#fff" : "var(--surface-alt)",
                    color: "var(--ink)",
                    outline: "none",
                    boxShadow: searchFocused ? "0 0 0 3px rgba(214,27,23,0.08)" : "none",
                  }}
                />
              </div>

              <button
                onClick={() => setSortNewest((s) => !s)}
                className="press flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all hover:border-line-strong"
                style={{ borderColor: "var(--line)", color: "var(--ink-2)", background: "var(--surface-alt)" }}
              >
                <svg
                  className="h-3 w-3 transition-transform duration-200"
                  style={{ transform: sortNewest ? "rotate(0deg)" : "rotate(180deg)", color: "var(--ink-3)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {sortNewest ? "Newest" : "Oldest"}
              </button>
            </div>

            {/* Rows or empty state */}
            {uploads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center rounded-2xl border bg-white py-16 text-center"
                style={{ borderColor: "var(--line)" }}
              >
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "rgba(214,27,23,0.06)" }}
                >
                  <svg className="h-7 w-7" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>No files uploaded yet</p>
                <p className="mt-1.5 max-w-[230px] text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                  Drop payroll reports, receipts, or any document your advisor needs — it lands here instantly.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Payroll", "Receipts", "Tax forms", "Reports"].map((label) => (
                    <span key={label} className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-3)" }}>
                      {label}
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
                No files match &ldquo;{search}&rdquo;
              </p>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {filtered.map((file) => (
                    <UploadRow
                      key={file.id}
                      file={file}
                      onOpen={() => void openUpload(file)}
                      onDelete={() => void handleDelete(file.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
