"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: string; message: string; type: ToastType; }

interface ToastCtx { toast: (message: string, type?: ToastType) => void; }
const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() { return useContext(Ctx); }

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STYLES: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: "#ffffff", text: "#171717", icon: "#059669" },
  error:   { bg: "#ffffff", text: "#171717", icon: "#d61b17" },
  info:    { bg: "#ffffff", text: "#171717", icon: "#1d4ed8" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  function dismiss(id: string) { setToasts((prev) => prev.filter((t) => t.id !== id)); }

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      {/* Toaster */}
      {/* z-index sits above the onboarding overlay (180) so its confirmations are
          visible, but below the session-expiry modal (200). */}
      <div className="fixed bottom-5 right-5 z-[190] flex flex-col gap-2.5" style={{ maxWidth: 360 }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const s = STYLES[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                style={{ background: s.bg, borderColor: "#f0f0f2" }}
              >
                <span style={{ color: s.icon }} className="mt-0.5">{ICONS[t.type]}</span>
                <p className="flex-1 text-sm font-medium leading-snug" style={{ color: s.text }}>{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="mt-0.5 shrink-0 transition-opacity hover:opacity-50"
                  style={{ color: "#9ca3af" }}
                  aria-label="Dismiss"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
