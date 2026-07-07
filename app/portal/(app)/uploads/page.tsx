"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/portal/toast";
import { SkeletonUploadRow } from "@/components/portal/portal-skeleton";
import { EmptyState } from "@/components/portal/empty-state";
import { usePortalContext } from "@/components/portal/portal-context";
import type { ClientDocument } from "@/lib/supabase/types";

type LocalDoc = ClientDocument & { uploading?: boolean; progress?: number };

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function openUpload(doc: LocalDoc) {
  if (!doc.storage_path) return;
  const supabase = createClient();
  const { data } = await supabase.storage.from("client-documents").createSignedUrl(doc.storage_path, 600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
}

async function uploadFileWithProgress(
  file: File,
  path: string,
  accessToken: string,
  supabaseUrl: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${supabaseUrl}/storage/v1/object/client-documents/${path}`;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(file);
  });
}

export default function UploadsPage() {
  const { activeClientId } = usePortalContext();
  const [uploads,  setUploads]  = useState<LocalDoc[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dragging, setDragging] = useState(false);
  const [search,   setSearch]   = useState("");
  const [sortNewest, setSortNewest] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const filtered = uploads.filter((f) =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => sortNewest
    ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  async function handleDelete(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    const res = await fetch("/api/portal/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      toast("Failed to delete file.", "error");
      fetch("/api/portal/uploads").then((r) => r.json()).then((d: LocalDoc[]) => setUploads(d ?? []));
    } else {
      toast("File deleted.", "success");
    }
  }

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
    fetch("/api/portal/uploads")
      .then((r) => r.json())
      .then((data: ClientDocument[]) => { setUploads(data ?? []); setLoading(false); });
  }, [activeClientId]);

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

      const optimistic: LocalDoc = {
        id: tempId, client_id: activeClientId, name: file.name, type: "Upload",
        storage_path: path, size_bytes: file.size, is_seen: true,
        folder: "Collection Files", created_at: new Date().toISOString(),
        uploading: true, progress: 0,
      };
      setUploads((prev) => [optimistic, ...prev]);

      try {
        await uploadFileWithProgress(file, path, session.access_token, supabaseUrl, (pct) => {
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        });

        const insertRes = await fetch("/api/portal/uploads", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: file.name, storage_path: path, size_bytes: file.size }),
        });
        const inserted = insertRes.ok ? await insertRes.json() as ClientDocument : null;

        setUploads((prev) =>
          prev.map((u) => u.id === tempId ? { ...(inserted ?? optimistic), uploading: false, progress: 100 } : u)
        );
        toast(`"${file.name}" uploaded successfully.`, "success");
      } catch {
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
        toast(`Failed to upload "${file.name}". Please try again.`, "error");
      }
    }
  }, [activeClientId, toast]);

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }} className="mb-6">
        <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Uploads</h1>
        <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>Send files to your Sparing advisor</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.06 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void enqueue(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="mb-7 cursor-pointer select-none rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200"
        style={{ borderColor: dragging ? "#d61b17" : "#d8dbe1", background: dragging ? "rgba(214,27,23,0.04)" : "#ffffff" }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => void enqueue(e.target.files)}
        />
        <motion.div
          animate={{ scale: dragging ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          style={{ background: dragging ? "rgba(214,27,23,0.13)" : "rgba(214,27,23,0.07)" }}
        >
          <svg className="h-6 w-6" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </motion.div>
        <p className="text-sm font-semibold" style={{ color: dragging ? "#d61b17" : "#171717" }}>
          {dragging ? "Release to upload" : "Drop files here, or click to browse"}
        </p>
        <p className="mt-1.5 text-xs" style={{ color: "#9ca3af" }}>PDF, Word, Excel, images — up to 50 MB each</p>
      </motion.div>

      {/* File list */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
        {loading ? (
          <div className="space-y-2">
            <div className="mb-3 h-4 w-28 animate-pulse rounded-md" style={{ background: "#ebebed" }} />
            {[1, 2, 3].map((i) => <SkeletonUploadRow key={i} />)}
          </div>
        ) : uploads.length > 0 ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="shrink-0 text-sm font-semibold" style={{ color: "#171717" }}>Your uploads</h2>
              <div className="relative flex-1">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search files…"
                  className="w-full rounded-lg border py-1.5 pl-9 pr-3 text-xs outline-none transition"
                  style={{ borderColor: "#ebecef", color: "#171717" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#d61b17")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#ebecef")}
                />
              </div>
              <button
                onClick={() => setSortNewest((s) => !s)}
                className="flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[0.65rem] font-medium transition hover:border-[#d8dbe1]"
                style={{ borderColor: "#ebecef", color: "#6b7280" }}
              >
                <svg className="h-3 w-3" style={{ transform: sortNewest ? undefined : "rotate(180deg)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                {sortNewest ? "Newest" : "Oldest"}
              </button>
            </div>
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm" style={{ color: "#9ca3af" }}>No files match &quot;{search}&quot;</p>
            ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28 }}
                    className="flex items-center gap-4 overflow-hidden rounded-xl border bg-white px-5 py-3.5"
                    style={{ borderColor: "#ebecef" }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "#f8f8f9" }}>
                      <svg className="h-4 w-4" style={{ color: "#9ca3af" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => !file.uploading && void openUpload(file)}
                        className="block w-full truncate text-left text-sm font-medium transition-colors"
                        style={{ color: "#171717", cursor: file.uploading ? "default" : "pointer" }}
                        onMouseEnter={(e) => { if (!file.uploading) e.currentTarget.style.color = "#d61b17"; }}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#171717")}
                      >{file.name}</button>
                      {file.uploading ? (
                        <div className="mt-1.5">
                          <div className="h-1 overflow-hidden rounded-full" style={{ background: "#f0f0f2" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "#d61b17" }}
                              animate={{ width: `${file.progress ?? 0}%` }}
                              transition={{ duration: 0.15 }}
                            />
                          </div>
                          <span className="mt-0.5 block text-[0.65rem]" style={{ color: "#9ca3af" }}>
                            {file.progress ?? 0}% uploaded…
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
                          {formatBytes(file.size_bytes)}{file.size_bytes && file.created_at ? " · " : ""}{formatDate(file.created_at)}
                        </div>
                      )}
                    </div>
                    {!file.uploading && (
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold" style={{ background: "rgba(16,185,129,0.09)", color: "#059669" }}>
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Sent
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); void handleDelete(file.id); }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: "#9ca3af" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                          title="Delete upload"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
            <EmptyState
              illustration="uploads"
              title="No uploads yet"
              body="Drop files in the area above to send them securely to your advisor."
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
