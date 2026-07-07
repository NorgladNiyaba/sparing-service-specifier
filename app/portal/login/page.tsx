"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicMode, setMagicMode] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  // If already authenticated, skip to dashboard
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/portal/dashboard");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/portal/dashboard");
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal/dashboard` },
    });
    setMagicSent(true);
    setMagicLoading(false);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #0d0d0f 0%, #1a0808 45%, #0d0d0f 100%)" }}
    >
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.4), transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Sparing" className="h-9 w-9 shrink-0" />
          <div>
            <div className="text-[0.95rem] font-bold leading-none tracking-[-0.01em] text-white">Sparing</div>
            <div className="mt-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Client Portal
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h1 className="mb-1 text-xl font-bold tracking-[-0.025em] text-white">
            {magicMode ? "Sign in with a link" : "Sign in"}
          </h1>
          <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            {magicMode ? "We'll email you a one-click link — no password needed." : "Access your documents and account details."}
          </p>

          {magicSent ? (
            <div className="rounded-xl px-4 py-5 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <svg className="mx-auto mb-3 h-8 w-8" style={{ color: "#4ade80" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <p className="text-sm font-semibold text-white">Check your inbox</p>
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>We sent a sign-in link to <span style={{ color: "rgba(255,255,255,0.65)" }}>{email}</span></p>
              <button onClick={() => { setMagicSent(false); setMagicMode(false); }} className="mt-4 text-xs transition" style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                Back to sign in
              </button>
            </div>
          ) : magicMode ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-[rgba(255,255,255,0.2)]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(214,27,23,0.6)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              <button
                type="submit"
                disabled={magicLoading}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "#d61b17", boxShadow: "0 4px 16px rgba(214,27,23,0.3)" }}
              >
                {magicLoading ? "Sending…" : "Send sign-in link"}
              </button>
              <button type="button" onClick={() => setMagicMode(false)} className="w-full text-center text-xs transition" style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                Sign in with password instead
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-[rgba(255,255,255,0.2)]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(214,27,23,0.6)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition placeholder:text-[rgba(255,255,255,0.2)]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(214,27,23,0.6)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs" style={{ color: "#f87171" }}>
                  {error}
                </motion.p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "#d61b17", boxShadow: "0 4px 16px rgba(214,27,23,0.3)" }}
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
              <button type="button" onClick={() => { setMagicMode(true); setError(""); }} className="w-full text-center text-xs transition" style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
              >
                No password? Sign in with an email link instead
              </button>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Don&apos;t have a password yet?{" "}
          <a
            href="mailto:hello@sparingconsulting.com"
            className="underline underline-offset-2 transition hover:text-white/50"
          >
            Contact your advisor
          </a>
        </p>
      </motion.div>
    </div>
  );
}
