"use client";

import { useState } from "react";
import Sidebar from "@/components/portal/sidebar";
import { ToastProvider } from "@/components/portal/toast";
import { SessionGuard } from "@/components/portal/session-guard";
import { PortalProvider } from "@/components/portal/portal-context";
import { OnboardingProvider } from "@/components/portal/onboarding-context";
import { OnboardingOverlay } from "@/components/portal/onboarding-overlay";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
    <SessionGuard>
    <PortalProvider>
    <OnboardingProvider>
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
              <img src="/logo.png" alt="Sparing" className="h-6 w-6 shrink-0" />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Sparing</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto" style={{ background: "#f3f3f5" }}>
            {children}
          </main>
        </div>
      </div>

      {/* Onboarding lives above the portal chrome and is always dismissible */}
      <OnboardingOverlay />
    </OnboardingProvider>
    </PortalProvider>
    </SessionGuard>
    </ToastProvider>
  );
}
