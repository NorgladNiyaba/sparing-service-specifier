"use client";

import { useState } from "react";
import Sidebar from "@/components/portal/sidebar";
import { ToastProvider } from "@/components/portal/toast";
import { SessionGuard } from "@/components/portal/session-guard";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
    <SessionGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <header
            className="flex h-14 shrink-0 items-center gap-3 border-b px-4 lg:hidden"
            style={{ background: "#0c0c0e", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition"
              style={{ color: "rgba(255,255,255,0.6)" }}
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: "#d61b17" }}>
                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Sparing</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto" style={{ background: "#f3f3f5" }}>
            {children}
          </main>
        </div>
      </div>
    </SessionGuard>
    </ToastProvider>
  );
}
