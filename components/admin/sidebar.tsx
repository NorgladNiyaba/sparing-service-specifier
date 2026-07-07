"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminUser, canAccess } from "@/components/admin/user-context";

const ALL_NAV = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    section: null,
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/clients",
    label: "Clients",
    section: null,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/advisors",
    label: "Advisors",
    section: "advisors" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/admin/activity",
    label: "Activity",
    section: "activity" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    label: "Audit",
    section: "audit" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Staff",
    section: "users" as const,
    exact: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-[1.05rem] w-[1.05rem]">
        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
] as const;

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { role, email, loading } = useAdminUser();

  async function handleSignOut() {
    await createClient().auth.signOut();
    router.push("/admin/login");
  }

  const nav = ALL_NAV.filter((item) => {
    if (!item.section) return true;
    return canAccess(role, item.section);
  });

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col" style={{ background: "#080c18", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 pb-5 pt-7">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Sparing" className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-[0.82rem] font-semibold leading-none tracking-[0.01em]" style={{ color: "rgba(255,255,255,0.9)" }}>Sparing</div>
            <div className="mt-0.5 text-[0.62rem] font-medium tracking-[0.06em]" style={{ color: "rgba(255,255,255,0.3)" }}>ADMIN</div>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      <nav className="flex-1 px-3">
        {nav.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150"
              style={{
                background:  active ? "rgba(29,78,216,0.15)" : "transparent",
                borderLeft:  `2px solid ${active ? "#3b82f6" : "transparent"}`,
                color:       active ? "#ffffff" : "rgba(255,255,255,0.42)",
              }}
            >
              <span style={{ color: active ? "#3b82f6" : "rgba(255,255,255,0.28)" }}>{item.icon}</span>
              <span className="font-medium tracking-[-0.01em]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Role badge */}
        {!loading && role && (
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide"
              style={{
                background: role === "super_admin" ? "rgba(29,78,216,0.25)" : role === "manager" ? "rgba(5,150,105,0.2)" : "rgba(107,114,128,0.2)",
                color:      role === "super_admin" ? "#93c5fd"              : role === "manager" ? "#6ee7b7"             : "rgba(255,255,255,0.4)",
              }}>
              {role === "super_admin" ? "Super Admin" : role === "manager" ? "Manager" : "Viewer"}
            </span>
            <span className="truncate text-[0.68rem]" style={{ color: "rgba(255,255,255,0.28)" }}>{email}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="text-[0.72rem] font-medium transition-colors"
          style={{ color: "rgba(255,255,255,0.28)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
