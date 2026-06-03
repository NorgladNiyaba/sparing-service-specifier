"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Step = "loading" | "error" | "email" | "ready" | "downloading";

export default function ShareTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [docName, setDocName] = useState("");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setStep("error"); return; }
        setStep("email");
      })
      .catch(() => { setError("Failed to load link."); setStep("error"); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) { setEmailError("Please enter your email address."); return; }
    setSubmitting(true);

    const res = await fetch(`/api/share/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setEmailError(data.error ?? "Something went wrong. Please try again.");
      return;
    }

    setDocName(data.name);
    setStep("ready");

    // Trigger download automatically after a brief moment
    setTimeout(() => {
      setStep("downloading");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = data.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 600);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f7] px-4 py-12">
      <div className="w-full max-w-sm">
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

          {step === "email" && (
            <motion.div key="email" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl bg-white p-8 shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.07)" }}>
                <svg className="h-6 w-6" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h1 className="text-center text-lg font-bold tracking-[-0.02em]" style={{ color: "#171717" }}>
                Your advisor shared a document
              </h1>
              <p className="mt-1.5 text-center text-sm" style={{ color: "#6b7280" }}>
                Enter your email address to verify your identity and download the file.
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  disabled={submitting}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#d61b17" }}
                >
                  {submitting ? "Verifying…" : "Access document"}
                </button>
              </form>
              <p className="mt-5 text-center text-[0.7rem]" style={{ color: "#d1d5db" }}>
                Secured by Sparing Consulting
              </p>
            </motion.div>
          )}

          {(step === "ready" || step === "downloading") && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-white p-8 text-center shadow-sm" style={{ border: "1px solid #ebecef" }}>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(5,150,105,0.1)" }}
              >
                <svg className="h-7 w-7" style={{ color: "#059669" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </motion.div>
              <p className="font-bold" style={{ color: "#171717" }}>
                {step === "ready" ? "Preparing your download…" : "Download started"}
              </p>
              <p className="mt-1.5 text-sm" style={{ color: "#9ca3af" }}>
                {docName}
              </p>
              {step === "downloading" && (
                <p className="mt-3 text-xs" style={{ color: "#9ca3af" }}>
                  If the download didn&apos;t start automatically, your browser may have blocked it.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
