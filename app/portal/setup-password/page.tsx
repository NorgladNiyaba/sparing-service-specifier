"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",            test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Weak",   color: "#ef4444" },
  { label: "Fair",   color: "#f97316" },
  { label: "Good",   color: "#eab308" },
  { label: "Strong", color: "#22c55e" },
];

function strengthScore(pw: string) { return RULES.filter((r) => r.test(pw)).length; }

export default function SetupPasswordPage() {
  const router = useRouter();
  const [pw,        setPw]        = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const score    = pw ? strengthScore(pw) : 0;
  const strength = pw ? STRENGTH[score - 1] ?? STRENGTH[0] : null;
  const match    = confirm.length > 0 && pw === confirm;
  const mismatch = confirm.length > 0 && pw !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const failing = RULES.find((r) => !r.test(pw));
    if (failing) { setError(failing.label + " — not met."); return; }
    if (pw !== confirm) { setError("Passwords don't match."); return; }

    setSaving(true);
    const supabase = createClient();
    const { error: authErr } = await supabase.auth.updateUser({ password: pw, data: { password_configured: true } });
    setSaving(false);

    if (authErr) { setError(authErr.message); return; }
    router.push("/portal/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg, #0d0d0f 0%, #1a0808 40%, #0d0d0f 100%)" }}>

      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/logo.png" alt="Sparing" className="h-7 w-7" />
          <span className="text-sm font-bold text-white/90">Sparing</span>
        </div>

        <div className="rounded-2xl border border-white/10 p-7" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}>
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.12)" }}>
            <svg className="h-6 w-6" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>

          <h1 className="text-center text-lg font-bold text-white">Create your password</h1>
          <p className="mt-1.5 text-center text-xs text-white/35">Set a password so you can sign back in any time.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setError(""); }}
                placeholder="New password"
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(214,27,23,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {showPw ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>}
                </svg>
              </button>
            </div>

            {pw.length > 0 && (
              <>
                <div>
                  <div className="flex gap-1.5">
                    {STRENGTH.map((s, i) => (
                      <div key={s.label} className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{ background: i < score ? strength!.color : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <p className="mt-1 text-[0.7rem] font-semibold" style={{ color: strength!.color }}>{strength!.label}</p>
                </div>
                <div className="space-y-1 rounded-xl border border-white/8 p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {RULES.map((rule) => {
                    const met = rule.test(pw);
                    return (
                      <div key={rule.label} className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: met ? "#22c55e" : "rgba(255,255,255,0.15)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[0.72rem]" style={{ color: met ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}>{rule.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="relative">
              <input
                type={showConf ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                placeholder="Confirm password"
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-white/20"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(214,27,23,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConf((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 transition hover:text-white/50">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  {showConf ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                    : <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>}
                </svg>
              </button>
            </div>

            {mismatch && <p className="text-[0.7rem]" style={{ color: "#ef4444" }}>Passwords don&apos;t match.</p>}
            {match && (
              <p className="flex items-center gap-1 text-[0.7rem]" style={{ color: "#22c55e" }}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Passwords match
              </p>
            )}

            {error && <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>}

            <button
              type="submit"
              disabled={saving || !pw || !confirm}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              style={{ background: "#d61b17" }}
            >
              {saving ? "Setting up…" : "Create password & enter portal"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[0.65rem] text-white/20">Secured by Sparing Consulting</p>
      </motion.div>
    </div>
  );
}
