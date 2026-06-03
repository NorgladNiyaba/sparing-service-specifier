"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Step = "loading" | "error" | "email" | "upload" | "done";

interface TokenInfo { label: string; targetFolder: string; remaining: number; maxFiles: number; }
interface UploadedFile { name: string; size: number }

function formatBytes(b: number) {
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(b / 1024)} KB`;
}

export default function UploadTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [remaining, setRemaining] = useState(0);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/upload/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setStep("error"); return; }
        setInfo(d); setRemaining(d.remaining); setStep("email");
      })
      .catch(() => { setError("Failed to load link."); setStep("error"); });
  }, [token]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) { setEmailError("Please enter your email address."); return; }
    setEmailLoading(true);
    // Light pre-check: attempt a dummy POST with no file to verify email
    // We do the real check on actual file upload; this just provides early feedback
    const fd = new FormData();
    fd.append("email", email.trim().toLowerCase());
    const res = await fetch(`/api/upload/${token}`, { method: "POST", body: fd });
    const data = await res.json();
    setEmailLoading(false);
    if (res.status === 403) { setEmailError(data.error ?? "Email not recognised."); return; }
    // 400 (missing file) is expected here — email passed, proceed to upload
    if (res.status === 400 || res.ok) { setStep("upload"); return; }
    setEmailError(data.error ?? "Something went wrong. Please try again.");
  }

  async function handleFiles(files: FileList | null) {
    if (!files || remaining <= 0) return;
    setUploadError("");
    setUploading(true);

    for (const file of Array.from(files)) {
      if (remaining - uploaded.length <= 0) break;
      const fd = new FormData();
      fd.append("email", email.trim().toLowerCase());
      fd.append("file", file);
      const res = await fetch(`/api/upload/${token}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Upload failed."); setUploading(false); return; }
      setUploaded((prev) => [...prev, { name: file.name, size: file.size }]);
      setRemaining(data.remaining ?? 0);
    }

    setUploading(false);
    if (remaining - uploaded.length <= 0) setStep("done");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f7] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "#d61b17" }}>
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-[0.9rem] font-bold tracking-[-0.01em]" style={{ color: "#171717" }}>Sparing Consulting</span>
        </div>

        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <p className="text-sm" style={{ color: "#9ca3af" }}>Loading…</p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(214,27,23,0.08)" }}>
                <svg className="h-5 w-5" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="font-semibold" style={{ color: "#171717" }}>Link unavailable</p>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>{error}</p>
            </motion.div>
          )}

          {step === "email" && info && (
            <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl bg-white p-8 shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <h1 className="text-lg font-bold tracking-[-0.02em]" style={{ color: "#171717" }}>Secure file upload</h1>
              <p className="mt-1.5 text-sm" style={{ color: "#6b7280" }}>{info.label}</p>
              <p className="mt-4 text-xs" style={{ color: "#9ca3af" }}>
                Up to {info.maxFiles} file{info.maxFiles !== 1 ? "s" : ""} · max 20 MB each · PDF, Word, Excel, PowerPoint, JPG, PNG
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#6b7280" }}>
                    Your email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                    style={{ borderColor: "#d1d5db", color: "#171717" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#d61b17")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                  />
                  {emailError && <p className="mt-1.5 text-xs" style={{ color: "#d61b17" }}>{emailError}</p>}
                </div>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#d61b17" }}
                >
                  {emailLoading ? "Verifying…" : "Continue"}
                </button>
              </form>
              <p className="mt-5 text-center text-[0.7rem]" style={{ color: "#d1d5db" }}>
                Secured by Sparing Consulting · Files are encrypted in transit
              </p>
            </motion.div>
          )}

          {step === "upload" && info && (
            <motion.div key="upload" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl bg-white p-8 shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <div className="mb-5">
                <h1 className="text-lg font-bold tracking-[-0.02em]" style={{ color: "#171717" }}>Upload files</h1>
                <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>{info.label}</p>
                <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>
                  {remaining} slot{remaining !== 1 ? "s" : ""} remaining · max 20 MB per file
                </p>
              </div>

              {/* Accepted file types */}
              <div className="mb-4 flex flex-wrap gap-1.5">
                {["PDF", "Word (.docx)", "Excel (.xlsx)", "PowerPoint (.pptx)", "JPG / PNG"].map((t) => (
                  <span key={t} className="rounded-md px-2 py-1 text-[0.65rem] font-semibold"
                    style={{ background: "rgba(214,27,23,0.07)", color: "#b91c1c" }}>
                    {t}
                  </span>
                ))}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
                onClick={() => !uploading && fileRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all"
                style={{ borderColor: dragging ? "#d61b17" : "#d8dbe1", background: dragging ? "rgba(214,27,23,0.03)" : "#fafafa",
                  cursor: uploading ? "default" : "pointer" }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => void handleFiles(e.target.files)}
                />
                <svg className="mx-auto mb-3 h-7 w-7" style={{ color: uploading ? "#9ca3af" : "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 5.75 5.75 0 011.025 11.095H6.75z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: uploading ? "#9ca3af" : "#171717" }}>
                  {uploading ? "Uploading…" : "Drop files here or click to browse"}
                </p>
              </div>

              {uploadError && <p className="mt-3 text-xs" style={{ color: "#d61b17" }}>{uploadError}</p>}

              {uploaded.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploaded.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: "#ebecef" }}>
                      <svg className="h-4 w-4 shrink-0" style={{ color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: "#171717" }}>{f.name}</span>
                      <span className="shrink-0 text-xs" style={{ color: "#9ca3af" }}>{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              {uploaded.length > 0 && !uploading && (
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setStep("done")}
                  className="mt-5 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: "#171717" }}
                >
                  Done — I&apos;m finished uploading
                </motion.button>
              )}
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(5,150,105,0.1)" }}>
                <svg className="h-7 w-7" style={{ color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold" style={{ color: "#171717" }}>All done!</p>
              <p className="mt-1.5 text-sm" style={{ color: "#9ca3af" }}>
                Your file{uploaded.length !== 1 ? "s have" : " has"} been sent to your Sparing advisor. You may close this page.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
