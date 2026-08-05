"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { usePortalContext } from "@/components/portal/portal-context";
import { useOnboarding } from "@/components/portal/onboarding-context";
import { ProgressRing } from "@/components/portal/progress-ring";

const NAV = [
  {
    href: "/portal/dashboard",
    label: "Dashboard",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/portal/documents",
    label: "Documents",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    href: "/portal/uploads",
    label: "Uploads",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: "/portal/messages",
    label: "Messages",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/portal/billing",
    label: "Billing",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    href: "/portal/settings",
    label: "Settings",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Persistent re-entry point for onboarding. This is what earns the overlay the
 * right to be dismissible — closing it never buries the remaining steps.
 * Disappears once every step is resolved and the completion pane has been seen.
 */
function GetStartedItem({ onNavigate }: { onNavigate: () => void }) {
  const { state, open, isOpen } = useOnboarding();

  if (!state || !state.schemaReady) return null;
  if (state.progress.complete && state.celebratedAt) return null;

  const { resolved, total, percent } = state.progress;

  return (
    <div className="mx-2.5 mb-1.5">
      <button
        onClick={() => { open(); onNavigate(); }}
        aria-expanded={isOpen}
        className="focus-dark press group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
        style={{
          background: "rgba(214,27,23,0.10)",
          border:     "1px solid rgba(214,27,23,0.22)",
        }}
      >
        <ProgressRing
          percent={percent}
          size={26}
          stroke={2.5}
          color="#f87171"
          trackColor="rgba(255,255,255,0.14)"
        >
          {state.progress.complete ? (
            <svg className="h-3 w-3" style={{ color: "#f87171" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-[0.52rem] font-bold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
              {resolved}
            </span>
          )}
        </ProgressRing>

        <span className="min-w-0 flex-1">
          <span className="block text-[0.8rem] font-semibold leading-none" style={{ color: "rgba(255,255,255,0.9)" }}>
            Get started
          </span>
          <span className="mt-1 block text-[0.62rem] tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>
            {state.progress.complete ? "All steps done" : `${resolved} of ${total} steps`}
          </span>
        </span>

        <svg
          className="h-3 w-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
          style={{ color: "rgba(255,255,255,0.35)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { activeClientId, availableClients, switchCompany } = usePortalContext();
  const { state: onboarding } = useOnboarding();
  const logoUrl = onboarding?.logoUrl ?? null;
  const [newDocCount,  setNewDocCount]  = useState(0);
  const [newMsgCount,  setNewMsgCount]  = useState(0);
  const [switchOpen,   setSwitchOpen]   = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeClientId) return;
    fetch("/api/portal/documents")
      .then((r) => r.json())
      .then((d: { documents?: Array<{ is_seen: boolean }> }) => {
        setNewDocCount(d.documents?.filter((doc) => !doc.is_seen).length ?? 0);
      })
      .catch(() => {});
  }, [activeClientId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) setSwitchOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSwitch(clientId: string) {
    setSwitchOpen(false);
    if (clientId === activeClientId) return;
    await switchCompany(clientId);
  }

  const activeCompany = availableClients.find((c) => c.clientId === activeClientId);

  useEffect(() => {
    if (!activeClientId) return;
    function fetchUnreadCount() {
      fetch("/api/portal/messages/unread-count")
        .then((r) => r.json())
        .then((data: { count: number }) => {
          setNewMsgCount(data.count ?? 0);
        })
        .catch(() => {});
    }
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(id);
  }, [activeClientId]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "https://sparingconsulting.com";
  }

  const companyLabel = activeCompany?.companyName ?? activeCompany?.fullName ?? "—";
  const companyInitials = companyLabel.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const userInitials = activeCompany?.fullName
    ? activeCompany.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "…";

  return (
    <div className="flex h-full flex-col" style={{ background: "#0c0c0e" }}>

      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-5 pb-5 pt-7">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Sparing" className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-[0.82rem] font-semibold leading-none tracking-[0.01em]" style={{ color: "rgba(255,255,255,0.9)" }}>Sparing</div>
            <div className="mt-0.5 text-[0.6rem] font-semibold tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>Client Portal</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="focus-dark press flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10 lg:hidden"
          style={{ color: "rgba(255,255,255,0.4)" }}
          aria-label="Close menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mx-5 mb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      {/* ── Company switcher ── */}
      <div ref={switchRef} className="relative mx-3 mb-3">
        <button
          onClick={() => setSwitchOpen((o) => !o)}
          className="focus-dark press group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]"
          style={{ background: "rgba(255,255,255,0.045)" }}
        >
          {/* Company avatar — the client's own logo once they've added one.
              data-logo-slot is the flight target for the onboarding upload. */}
          <div
            data-logo-slot
            className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[0.58rem] font-bold text-white shadow-sm"
            style={{ background: logoUrl ? "#ffffff" : "linear-gradient(135deg, #e03432, #b91511)" }}
          >
            {logoUrl ? (
              <motion.img
                key={logoUrl}
                src={logoUrl}
                alt=""
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className="max-h-[26px] max-w-[26px] object-contain p-[2px]"
              />
            ) : (
              companyInitials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.76rem] font-semibold leading-none" style={{ color: "rgba(255,255,255,0.88)" }}>
              {companyLabel}
            </p>
            {availableClients.length > 1 && (
              <p className="mt-0.5 text-[0.6rem]" style={{ color: "rgba(255,255,255,0.3)" }}>Switch company</p>
            )}
          </div>
          {availableClients.length > 1 && (
            <motion.div
              animate={{ rotate: switchOpen ? 180 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          )}
        </button>

        <AnimatePresence>
          {switchOpen && availableClients.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={  { opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl py-1.5 shadow-xl"
              style={{ background: "#161618", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              {availableClients.map((co) => {
                const isActive = co.clientId === activeClientId;
                const coInitials = (co.companyName ?? co.fullName).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={co.clientId}
                    onClick={() => void handleSwitch(co.clientId)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.52rem] font-bold text-white"
                      style={{ background: isActive ? "linear-gradient(135deg,#e03432,#b91511)" : "rgba(255,255,255,0.1)" }}
                    >
                      {coInitials}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[0.76rem] font-medium" style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.55)" }}>
                      {co.companyName ?? co.fullName}
                    </span>
                    {isActive && (
                      <svg className="h-3 w-3 shrink-0" style={{ color: "#d61b17" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-5 mb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />

      {/* ── Onboarding re-entry ── */}
      <GetStartedItem onNavigate={onClose} />

      {/* ── Nav ── */}
      <nav className="flex-1 px-2.5">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const badge =
            item.href === "/portal/documents" && newDocCount > 0 ? newDocCount :
            item.href === "/portal/messages"  && newMsgCount > 0 ? newMsgCount :
            null;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-[-0.01em] transition-all duration-150 ${
                active
                  ? "bg-white/[0.09] text-white"
                  : "text-white/40 hover:bg-white/[0.05] hover:text-white/70"
              }`}
            >
              {/* Icon with glow when active */}
              <span
                className="shrink-0 transition-all duration-150"
                style={{
                  color:  active ? "#d61b17" : "rgba(255,255,255,0.28)",
                  filter: active ? "drop-shadow(0 0 6px rgba(214,27,23,0.5))" : undefined,
                }}
              >
                {item.icon(active)}
              </span>

              <span className="flex-1">{item.label}</span>

              {/* Badge — pops in with spring animation */}
              <AnimatePresence>
                {badge ? (
                  <motion.span
                    key={`badge-${item.href}-${badge}`}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1,   opacity: 1 }}
                    exit={  { scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold leading-none text-white"
                    style={{ background: "#d61b17", boxShadow: "0 0 8px rgba(214,27,23,0.45)" }}
                  >
                    {badge}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* ── User identity + sign out ── */}
      <div className="px-4 pb-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.68rem] font-bold text-white shadow-sm"
            style={{ background: "linear-gradient(135deg, #e03432, #b91511)" }}
          >
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.79rem] font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
              {companyLabel}
            </div>
            <button
              onClick={handleSignOut}
              className="focus-dark mt-0.5 text-[0.68rem] font-medium transition-colors hover:text-white/60"
              style={{ color: "rgba(255,255,255,0.28)" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  useEffect(() => { onClose(); }, [pathname, onClose]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-[220px] shrink-0 flex-col lg:flex" style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        <SidebarContent onClose={onClose} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={onClose}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] lg:hidden"
              style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
            >
              <SidebarContent onClose={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
