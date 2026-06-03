"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { AdminRole } from "@/lib/admin-auth";

interface AdminUserCtx {
  email:   string;
  role:    AdminRole;
  loading: boolean;
}

const Ctx = createContext<AdminUserCtx>({ email: "", role: "viewer", loading: true });

export function useAdminUser() { return useContext(Ctx); }

export function AdminUserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdminUserCtx>({ email: "", role: "viewer", loading: true });

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { email: string; role: AdminRole } | null) => {
        if (d) setState({ email: d.email, role: d.role, loading: false });
        else   setState((s) => ({ ...s, loading: false }));
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

/** Returns true if role can perform writes (not a viewer). */
export function canWrite(role: AdminRole) { return role !== "viewer"; }

/** Returns true if role can access a given section. */
export function canAccess(role: AdminRole, section: "advisors" | "activity" | "audit" | "users") {
  if (role === "super_admin") return true;
  if (role === "manager")     return section === "activity" || section === "audit";
  return false; // viewer
}
