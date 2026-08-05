"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const WARN_BEFORE_S = 5 * 60;

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown,   setCountdown]   = useState(WARN_BEFORE_S);
  const [extending,   setExtending]   = useState(false);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoRefreshBlocked = useRef(false);

  const init = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.expires_at) return;

    const expiresInMs = session.expires_at * 1000 - Date.now();
    if (expiresInMs <= 0) {
      await supabase.auth.signOut();
      window.location.href = "/portal/login";
      return;
    }

    const msUntilWarn = expiresInMs - WARN_BEFORE_S * 1000;

    if (msUntilWarn <= 0) {
      const remaining = Math.max(0, Math.floor(expiresInMs / 1000));
      setCountdown(remaining);
      setShowWarning(true);
      autoRefreshBlocked.current = true;
    } else {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = setTimeout(() => {
        setCountdown(WARN_BEFORE_S);
        setShowWarning(true);
        autoRefreshBlocked.current = true;
      }, msUntilWarn);
    }
  }, []);

  useEffect(() => {
    void init();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" && autoRefreshBlocked.current) {
        supabase.auth.signOut().then(() => {
          window.location.href = "/portal/login";
        });
      }
    });

    return () => {
      clearTimeout(warnTimerRef.current);
      subscription.unsubscribe();
    };
  }, [init]);

  useEffect(() => {
    if (!showWarning) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          const supabase = createClient();
          supabase.auth.signOut().then(() => {
            window.location.href = "/portal/login";
          });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [showWarning]);

  async function extendSession() {
    setExtending(true);
    autoRefreshBlocked.current = false;
    const supabase = createClient();
    const { error } = await supabase.auth.refreshSession();
    if (error) {
      await supabase.auth.signOut();
      window.location.href = "/portal/login";
      return;
    }
    setShowWarning(false);
    setExtending(false);
    void init();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  }

  const minutes = Math.floor(countdown / 60);
  const seconds  = countdown % 60;

  return (
    <>
      {children}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            key="session-warning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
              style={{ boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}
            >
              <div className="h-1 w-full" style={{ background: "#f3f4f6" }}>
                <motion.div
                  className="h-full"
                  style={{ background: countdown > 120 ? "#eab308" : "#ef4444" }}
                  initial={{ width: "100%" }}
                  animate={{ width: `${(countdown / WARN_BEFORE_S) * 100}%` }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </div>

              <div className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <svg className="h-6 w-6" style={{ color: "#d97706" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold" style={{ color: "#171717" }}>Session expiring soon</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  For your security, you will be signed out in{" "}
                  <span className="font-bold tabular-nums" style={{ color: countdown <= 120 ? "#ef4444" : "#d97706" }}>
                    {minutes}:{String(seconds).padStart(2, "0")}
                  </span>.
                  Would you like to stay signed in?
                </p>
                <div className="mt-5 flex gap-2.5">
                  <button
                    onClick={extendSession}
                    disabled={extending}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    style={{ background: "#d61b17" }}
                  >
                    {extending ? "Extending…" : "Stay signed in"}
                  </button>
                  <button
                    onClick={signOut}
                    className="flex-1 rounded-xl border py-2.5 text-sm font-semibold transition hover:bg-[#f8f8f9]"
                    style={{ borderColor: "#ebecef", color: "#6b7280" }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
