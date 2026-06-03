"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/admin/clients");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError } = await createClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Incorrect credentials.");
      setLoading(false);
      return;
    }
    router.push("/admin/clients");
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #0d0d0f 0%, #080d1a 50%, #0d0d0f 100%)" }}
    >
      <div className="pointer-events-none fixed inset-0" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#1d4ed8" }}>
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-[0.95rem] font-bold leading-none tracking-[-0.01em] text-white">Sparing</div>
            <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Admin Portal
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", backdropFilter: "blur(20px)" }}>
          <h1 className="mb-1 text-xl font-bold tracking-[-0.025em] text-white">Admin sign in</h1>
          <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>Restricted access — Sparing staff only.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {["Email", "Password"].map((label) => (
              <div key={label}>
                <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</label>
                <input
                  type={label === "Password" ? "password" : "email"}
                  value={label === "Password" ? password : email}
                  onChange={(e) => label === "Password" ? setPassword(e.target.value) : setEmail(e.target.value)}
                  required
                  autoComplete={label === "Password" ? "current-password" : "email"}
                  placeholder={label === "Password" ? "••••••••" : "admin@sparingconsulting.com"}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-[rgba(255,255,255,0.2)]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(29,78,216,0.7)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
            ))}

            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs" style={{ color: "#f87171" }}>
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "#1d4ed8", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
