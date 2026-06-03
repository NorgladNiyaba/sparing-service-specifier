"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/portal/toast";
import { SkeletonUploadRow } from "@/components/portal/portal-skeleton";
import { EmptyState } from "@/components/portal/empty-state";
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
  const [uploads,   setUploads]   = useState<LocalDoc[]>([]);
  const [clientId,  setClientId]  = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      (supabase.from("clients").select("id").maybeSingle() as unknown as Promise<{ data: { id: string } | null }>),
      (supabase.from("client_documents").select("*").eq("folder" as string, "Client Uploads").order("created_at", { ascending: false }) as unknown as Promise<{ data: ClientDocument[] | null }>),
    ]).then(([clientRes, docsRes]) => {
      if (clientRes.data) setClientId(clientRes.data.id);
      setUploads(docsRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const enqueue = useCallback(async (files: FileList | null) => {
    if (!files || !clientId) return;
    const supabase = createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { toast("Not authenticated — please sign in again.", "error"); return; }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

    for (const file of Array.from(files)) {
      // Server-side pre-flight validation
      const validateRes = await fetch("/api/portal/validate-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, sizeBytes: file.size }),
      });
      if (!validateRes.ok) {
        const { error } = await validateRes.json() as { error: string };
        toast(error ?? `"${file.name}" cannot be uploaded.`, "error");
        continue;
      }

      const tempId = crypto.randomUUID();
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${clientId}/${timestamp}_${safeName}`;

      const optimistic: LocalDoc = {
        id: tempId,
        client_id: clientId,
        name: file.name,
        type: "Upload",
        storage_path: path,
        size_bytes: file.size,
        is_seen: true,
        folder: "Client Uploads",
        created_at: new Date().toISOString(),
        uploading: true,
        progress: 0,
      };
      setUploads((prev) => [optimistic, ...prev]);

      try {
        await uploadFileWithProgress(file, path, session.access_token, supabaseUrl, (pct) => {
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        });

        const { data: inserted } = await (supabase
          .from("client_documents")
          .insert({
            client_id:    clientId,
            name:         file.name,
            type:         "Upload",
            storage_path: path,
            size_bytes:   file.size,
            folder:       "Client Uploads",
            is_seen:      true,
          } as Record<string, unknown>)
          .select()
          .single() as unknown as Promise<{ data: ClientDocument | null }>);

        setUploads((prev) =>
          prev.map((u) => u.id === tempId ? { ...(inserted ?? optimistic), uploading: false, progress: 100 } : u)
        );
        toast(`"${file.name}" uploaded successfully.`, "success");
      } catch {
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
        toast(`Failed to upload "${file.name}". Please try again.`, "error");
      }
    }
  }, [clientId, toast]);

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
            <h2 className="mb-3 text-sm font-semibold" style={{ color: "#171717" }}>Your uploads</h2>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {uploads.map((file) => (
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
                      <span className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold" style={{ background: "rgba(16,185,129,0.09)", color: "#059669" }}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Sent
                      </span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
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
