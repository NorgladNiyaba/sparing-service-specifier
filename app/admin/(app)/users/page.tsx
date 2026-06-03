"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAdminUser } from "@/components/admin/user-context";
import type { AdminRole } from "@/lib/admin-auth";

interface AdminUserRow {
  id:         string;
  email:      string;
  role:       AdminRole;
  is_active:  boolean;
  created_by: string | null;
  created_at: string;
}

const ROLE_STYLE: Record<AdminRole, { bg: string; text: string; label: string }> = {
  super_admin: { bg: "rgba(29,78,216,0.1)",  text: "#1d4ed8", label: "Super Admin" },
  manager:     { bg: "rgba(5,150,105,0.1)",  text: "#059669", label: "Manager"     },
  viewer:      { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "Viewer"     },
};

const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin — full access + user management" },
  { value: "manager",     label: "Manager — manage clients, docs, payments, activity" },
  { value: "viewer",      label: "Viewer — read-only, Dashboard + Clients only" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function UsersPage() {
  const { role: myRole, email: myEmail } = useAdminUser();
  const [users,     setUsers]     = useState<AdminUserRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState({ email: "", role: "manager" as AdminRole });
  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (myRole !== "super_admin") return;
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d: AdminUserRow[]) => { setUsers(Array.isArray(d) ? d : []); setLoading(false); });
  }, [myRole]);

  async function handleCreate() {
    setFormError("");
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json() as AdminUserRow & { error?: string };
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "Failed."); return; }
    setUsers((prev) => [...prev, data]);
    setShowModal(false);
    setForm({ email: "", role: "manager" });
  }

  async function handleRoleChange(user: AdminUserRow, role: AdminRole) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const updated = await res.json() as AdminUserRow;
      setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u));
    }
  }

  async function handleToggleActive(user: AdminUserRow) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) {
      const updated = await res.json() as AdminUserRow;
      setUsers((prev) => prev.map((u) => u.id === user.id ? updated : u));
    }
  }

  if (myRole !== "super_admin") {
    return (
      <div className="flex items-center justify-center px-8 py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(29,78,216,0.08)" }}>
            <svg className="h-7 w-7" style={{ color: "#1d4ed8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: "#171717" }}>Access restricted</p>
          <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Only Super Admins can manage staff access.</p>
        </div>
      </div>
    );
  }

  const active   = users.filter((u) => u.is_active);
  const inactive = users.filter((u) => !u.is_active);

  return (
    <div className="px-8 py-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Staff Access</h1>
          <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
            {active.length} active user{active.length !== 1 ? "s" : ""} with admin access
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm({ email: "", role: "manager" }); setFormError(""); }}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-85"
          style={{ background: "#1d4ed8" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add user
        </button>
      </div>

      {/* Role legend */}
      <div className="mb-5 flex flex-wrap gap-3">
        {ROLE_OPTIONS.map((r) => {
          const s = ROLE_STYLE[r.value];
          return (
            <div key={r.value} className="flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5" style={{ borderColor: "#ebecef" }}>
              <span className="rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide" style={{ background: s.bg, color: s.text }}>{s.label}</span>
              <span className="text-xs" style={{ color: "#9ca3af" }}>{r.label.split(" — ")[1]}</span>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid #f9f9fb" }}>
              <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: "#f0f0f2" }} />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 rounded animate-pulse" style={{ background: "#f0f0f2" }} />
                <div className="h-2.5 w-32 rounded animate-pulse" style={{ background: "#f4f4f6" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active users */}
          <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
            <div className="border-b px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>Active</span>
            </div>
            {active.length === 0 ? (
              <p className="px-5 py-6 text-sm" style={{ color: "#9ca3af" }}>No active users.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
                {active.map((user, i) => {
                  const s = ROLE_STYLE[user.role];
                  const isMe = user.email === myEmail;
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.04 }}
                      className="flex flex-wrap items-center gap-4 px-5 py-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white" style={{ background: "#1d4ed8" }}>
                        {user.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold" style={{ color: "#171717" }}>{user.email}</span>
                          {isMe && <span className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold uppercase" style={{ background: "#f3f4f6", color: "#9ca3af" }}>you</span>}
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
                          Added {formatDate(user.created_at)}{user.created_by ? ` by ${user.created_by}` : ""}
                        </div>
                      </div>

                      {/* Role selector */}
                      <select
                        value={user.role}
                        disabled={isMe}
                        onChange={(e) => void handleRoleChange(user, e.target.value as AdminRole)}
                        className="rounded-xl border py-2 pl-3 pr-7 text-xs font-semibold outline-none transition"
                        style={{ borderColor: s.bg, background: s.bg, color: s.text, appearance: "none", cursor: isMe ? "default" : "pointer" }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>{ROLE_STYLE[r.value].label}</option>
                        ))}
                      </select>

                      {!isMe && (
                        <button
                          onClick={() => void handleToggleActive(user)}
                          className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-red-300 hover:text-red-500"
                          style={{ borderColor: "#ebecef", color: "#9ca3af" }}
                        >
                          Deactivate
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inactive users */}
          {inactive.length > 0 && (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef", opacity: 0.65 }}>
              <div className="border-b px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#d1d5db" }}>Deactivated</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
                {inactive.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold" style={{ background: "#f3f4f6", color: "#9ca3af" }}>
                      {user.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium line-through" style={{ color: "#9ca3af" }}>{user.email}</span>
                    </div>
                    <button
                      onClick={() => void handleToggleActive(user)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                      style={{ borderColor: "#ebecef", color: "#9ca3af" }}
                    >
                      Reactivate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add user modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="mb-1 text-base font-bold" style={{ color: "#171717" }}>Add staff member</h3>
              <p className="mb-5 text-xs" style={{ color: "#9ca3af" }}>
                The person must log in using this email at <strong>/admin/login</strong>. If they don't have a password yet, they can use the magic link option on that page.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Email address</label>
                  <input
                    type="email" value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="colleague@sparingconsulting.com"
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#1d4ed8]"
                    style={{ borderColor: "#ebecef", color: "#171717" }}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#1d4ed8]"
                    style={{ borderColor: "#ebecef", color: "#171717" }}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{ROLE_STYLE[r.value].label} — {r.label.split(" — ")[1]}</option>
                    ))}
                  </select>
                </div>
                {formError && <p className="text-xs" style={{ color: "#dc2626" }}>{formError}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => void handleCreate()} disabled={saving}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-50"
                    style={{ background: "#1d4ed8" }}>
                    {saving ? "Adding…" : "Add user"}
                  </button>
                  <button onClick={() => setShowModal(false)}
                    className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                    style={{ borderColor: "#ebecef", color: "#6b7280" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
