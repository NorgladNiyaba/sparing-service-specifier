"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClientDocument } from "@/lib/supabase/types";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const PDF_EXT    = "pdf";

function getExt(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

interface DocPreviewModalProps {
  doc: ClientDocument | null;
  onClose: () => void;
}

export function DocPreviewModal({ doc, onClose }: DocPreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(false);

  useEffect(() => {
    if (!doc) { setSignedUrl(null); return; }
    if (doc.storage_path === "__contract__") { setSignedUrl("__contract__"); return; }

    setLoading(true);
    setError(false);
    const supabase = createClient();
    supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.storage_path, 600)
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err || !data?.signedUrl) { setError(true); return; }
        setSignedUrl(data.signedUrl);
      });
  }, [doc?.id]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!doc) return null;

  const ext       = getExt(doc.name);
  const isPdf     = ext === PDF_EXT;
  const isImage   = IMAGE_EXTS.has(ext);
  const isContract = doc.storage_path === "__contract__";

  function openDownload() {
    if (signedUrl && signedUrl !== "__contract__") window.open(signedUrl, "_blank");
    else if (isContract) window.open("/portal/contract", "_blank");
  }

  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          key="preview-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] flex flex-col"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
        >
          {/* Top bar */}
          <div
            className="flex h-14 shrink-0 items-center justify-between gap-4 px-5"
            style={{ background: "rgba(15,15,17,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(214,27,23,0.18)" }}>
                <span className="text-[0.5rem] font-bold uppercase tracking-wide" style={{ color: "#f87171" }}>
                  {isContract ? "PDF" : ext.toUpperCase().slice(0, 4)}
                </span>
              </div>
              <span className="truncate text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{doc.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Download / open button */}
              {!isContract && signedUrl && (
                <a
                  href={signedUrl}
                  download={doc.name}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-white/20"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              )}
              {isContract && (
                <button
                  onClick={() => window.open("/portal/contract", "_blank")}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-white/20"
                  style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
                >
                  Open full page
                </button>
              )}
              {/* Close */}
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition"
                style={{ color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.9)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                aria-label="Close preview"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading preview…</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>Couldn't load preview.</p>
                <button onClick={onClose} className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Close</button>
              </div>
            )}

            {!loading && !error && signedUrl && (
              <>
                {/* PDF */}
                {(isPdf || isContract) && (
                  <iframe
                    src={isContract ? "/portal/contract" : signedUrl}
                    className="h-full w-full rounded-xl"
                    style={{ background: "#fff", maxWidth: 900, maxHeight: "calc(100vh - 100px)" }}
                    title={doc.name}
                  />
                )}

                {/* Image */}
                {isImage && (
                  <motion.img
                    src={signedUrl}
                    alt={doc.name}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22 }}
                    className="max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                  />
                )}

                {/* Unsupported — show download prompt */}
                {!isPdf && !isImage && !isContract && (
                  <div className="flex flex-col items-center gap-5 rounded-2xl border p-10 text-center"
                    style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.15)" }}>
                      <svg className="h-7 w-7" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {ext.toUpperCase()} files can't be previewed in the browser.
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Use the Download button above to open this file.</p>
                    </div>
                    <button
                      onClick={openDownload}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-85"
                      style={{ background: "#d61b17" }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download {doc.name}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
