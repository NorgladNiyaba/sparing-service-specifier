"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Advisor } from "@/lib/supabase/types";
import { SkeletonAdvisorRow } from "@/components/admin/skeleton";

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold text-white" style={{ background: "#1d4ed8" }}>
      {initials}
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", title: "Advisor", microsoft_email: "" };

export default function AdvisorsPage() {
  const [advisors,   setAdvisors]   = useState<Advisor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Advisor | null>(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");

  useEffect(() => {
    fetch("/api/admin/advisors")
      .then((r) => r.json())
      .then((d: Advisor[]) => { setAdvisors(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(a: Advisor) {
    setEditing(a);
    setForm({ name: a.name, email: a.email, title: a.title, microsoft_email: a.microsoft_email ?? "" });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.name.trim())  { setFormError("Name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }

    setSaving(true);
    const url    = editing ? `/api/admin/advisors/${editing.id}` : "/api/admin/advisors";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:            form.name.trim(),
        email:           form.email.trim(),
        title:           form.title.trim() || "Advisor",
        microsoft_email: form.microsoft_email.trim() || null,
      }),
    });
    const data = await res.json() as Advisor & { error?: string };
    setSaving(false);

    if (!res.ok) { setFormError(data.error ?? "Failed to save."); return; }

    if (editing) {
      setAdvisors((prev) => prev.map((a) => a.id === editing.id ? data : a));
    } else {
      setAdvisors((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setShowModal(false);
  }

  async function handleToggleActive(advisor: Advisor) {
    const res = await fetch(`/api/admin/advisors/${advisor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !advisor.is_active }),
    });
    if (res.ok) {
      const data = await res.json() as Advisor;
      setAdvisors((prev) => prev.map((a) => a.id === advisor.id ? data : a));
    }
  }

  const active   = advisors.filter((a) => a.is_active);
  const inactive = advisors.filter((a) => !a.is_active);

  const inputClass = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:border-[#1d4ed8]";
  const inputStyle = { borderColor: "#ebecef", color: "#171717", background: "#ffffff" };

  return (
    <div className="px-8 py-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-[1.4rem] font-bold tracking-[-0.025em]" style={{ color: "#171717" }}>Advisors</h1>
          <p className="mt-0.5 text-sm" style={{ color: "#9ca3af" }}>
            {active.length} active advisor{active.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-85"
          style={{ background: "#1d4ed8" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New advisor
        </button>
      </div>

      {loading ? (
        <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
          <div className="border-b px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
            <div className="h-2.5 w-10 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
          </div>
          {[1, 2, 3].map((i) => <SkeletonAdvisorRow key={i} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active */}
          {active.length > 0 && (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
              <div className="border-b px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#9ca3af" }}>Active</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
                {active.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    <Avatar name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: "#171717" }}>{a.name}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
                        {a.title} · {a.email}
                        {a.microsoft_email && a.microsoft_email !== a.email && (
                          <span style={{ color: "#d1d5db" }}> · {a.microsoft_email} (send-as)</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                        style={{ borderColor: "#ebecef", color: "#6b7280" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleToggleActive(a)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-red-300 hover:text-red-500"
                        style={{ borderColor: "#ebecef", color: "#9ca3af" }}
                      >
                        Deactivate
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive */}
          {inactive.length > 0 && (
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef", opacity: 0.7 }}>
              <div className="border-b px-5 py-3" style={{ borderColor: "#f3f4f6" }}>
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "#d1d5db" }}>Inactive</span>
              </div>
              <div className="divide-y" style={{ borderColor: "#f9f9fb" }}>
                {inactive.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                    <Avatar name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: "#9ca3af" }}>{a.name}</div>
                      <div className="mt-0.5 text-xs" style={{ color: "#d1d5db" }}>{a.title} · {a.email}</div>
                    </div>
                    <button
                      onClick={() => void handleToggleActive(a)}
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

          {advisors.length === 0 && (
            <div className="rounded-2xl border bg-white px-6 py-12 text-center" style={{ borderColor: "#ebecef" }}>
              <p className="text-sm font-medium" style={{ color: "#6b7280" }}>No advisors yet</p>
              <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Create your first advisor to start assigning clients.</p>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
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
              <h3 className="mb-5 text-base font-bold" style={{ color: "#171717" }}>
                {editing ? "Edit advisor" : "New advisor"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Full name</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Mireille Bakal" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Email (display)</label>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="advisor@sparingconsulting.com" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1.5 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>Title</label>
                  <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Senior Advisor" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.08em]" style={{ color: "#6b7280" }}>
                    Microsoft 365 send-as address <span style={{ color: "#d1d5db" }}>(email · optional)</span>
                  </label>
                  <input value={form.microsoft_email} onChange={(e) => setForm((f) => ({ ...f, microsoft_email: e.target.value }))}
                    placeholder="Same as display email if blank" className={inputClass} style={inputStyle} />
                  <p className="mt-1 text-[0.68rem]" style={{ color: "#9ca3af" }}>
                    The Microsoft 365 mailbox notifications will be sent from. Leave blank to use the display email.
                  </p>
                </div>

                {formError && <p className="text-xs" style={{ color: "#dc2626" }}>{formError}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => void handleSave()} disabled={saving}
                    className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-85 disabled:opacity-50"
                    style={{ background: "#1d4ed8" }}>
                    {saving ? "Saving…" : editing ? "Save changes" : "Create advisor"}
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
