"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePortalContext } from "@/components/portal/portal-context";
import type { Client } from "@/lib/supabase/types";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";
import { useToast } from "@/components/portal/toast";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatPlan(track: string) {
  if (track === "ECSS") return "Growth Support";
  if (track === "ICSS") return "Independent Support";
  if (track === "OHSS") return "Office Hours Support";
  return track;
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="w-full rounded-xl border px-4 py-3 text-sm" style={{ borderColor: "var(--line)", background: "var(--surface-alt)", color: "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",            test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const STRENGTH = [
  { label: "Weak",   color: "#ef4444" },
  { label: "Fair",   color: "#f97316" },
  { label: "Good",   color: "#eab308" },
  { label: "Strong", color: "#22c55e" },
];

function strengthScore(pw: string): number {
  return RULES.filter((r) => r.test(pw)).length;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordField({
  label, value, onChange, autoComplete,
}: { label: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>{label}</div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete ?? "new-password"}
          className="w-full rounded-xl border py-3 pl-4 pr-11 text-sm outline-none transition focus:border-brand"
          style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { activeClientId } = usePortalContext();
  const [client,       setClient]      = useState<Client | null>(null);
  const [currentPw,    setCurrentPw]   = useState("");
  const [newPw,        setNewPw]       = useState("");
  const [confirmPw,    setConfirmPw]   = useState("");
  const [advisor,      setAdvisor]     = useState<{ name: string; email: string } | null>(null);
  const [saving,       setSaving]      = useState(false);
  const [saved,        setSaved]       = useState(false);
  const [pwError,      setPwError]     = useState("");
  const [notifyDocs,   setNotifyDocs]  = useState(true);
  const [savingNotif,  setSavingNotif] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!activeClientId) return;
    fetch("/api/portal/client").then((r) => r.ok ? r.json() : null).then((d: Client | null) => { if (d) setClient(d); }).catch(() => {});
    fetch("/api/portal/advisor").then((r) => r.ok ? r.json() : null).then((d: { name: string; email: string } | null) => { if (d) setAdvisor(d); }).catch(() => {});
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data?.user?.user_metadata ?? {};
      setNotifyDocs(meta.notifications_new_documents !== false);
    });
  }, [activeClientId]);

  async function handleNotifToggle(enabled: boolean) {
    setNotifyDocs(enabled);
    setSavingNotif(true);
    const { error } = await createClient().auth.updateUser({ data: { notifications_new_documents: enabled } });
    setSavingNotif(false);
    if (error) {
      toast("Failed to save notification preference.", "error");
      setNotifyDocs(!enabled);
    } else {
      toast(enabled ? "Email notifications enabled." : "Email notifications disabled.", "success");
    }
  }

  const score = newPw ? strengthScore(newPw) : 0;
  const strength = newPw ? STRENGTH[score - 1] ?? STRENGTH[0] : null;
  const passwordsMatch   = confirmPw.length > 0 && newPw === confirmPw;
  const passwordsMismatch = confirmPw.length > 0 && newPw !== confirmPw;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    const failing = RULES.find((r) => !r.test(newPw));
    if (failing) { setPwError(failing.label + " — requirement not met."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    if (!currentPw.trim()) { setPwError("Please enter your current password."); return; }

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setPwError("Could not verify your identity."); setSaving(false); return; }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
    if (signInError) { setPwError("Current password is incorrect."); setSaving(false); return; }

    const { error } = await supabase.auth.updateUser({ password: newPw, data: { password_configured: true } });
    setSaving(false);
    if (error) { setPwError(error.message); return; }

    setSaved(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setSaved(false), 3500);
  }

  const card = "rounded-2xl border bg-white p-6";
  const cardStyle = { borderColor: "var(--line)", boxShadow: "var(--shadow-card)" };

  return (
    <div className="min-h-full px-4 py-8 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-7">
        <h1 className="text-[1.35rem] font-bold tracking-[-0.025em]" style={{ color: "var(--ink)" }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-3)" }}>Your account and plan details</p>
      </motion.div>

      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── Account ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }} className={card} style={cardStyle}>
          <h2 className="mb-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>Account</h2>
          <div className="space-y-4">
            <ReadField label="Full name" value={client?.full_name ?? "—"} />
            <ReadField label="Email"     value={client?.email ?? "—"} />
            <ReadField label="Company"   value={client?.company_name ?? "—"} />
          </div>
        </motion.div>

        {/* ── Plan & Advisor ── */}
        {client && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.11 }} className={card} style={cardStyle}>
            <h2 className="mb-5 text-sm font-semibold" style={{ color: "var(--ink)" }}>Plan &amp; Advisor</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>Active Plan</div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]"
                    style={{ background: "rgba(214,27,23,0.07)", borderColor: "rgba(214,27,23,0.18)", color: "#d61b17" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#d61b17" }} />
                    {client.service_track}
                  </span>
                  <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                    {formatPlan(client.service_track)} · Since {formatDate(client.signed_at)}
                  </span>
                </div>
              </div>
              <ReadField label="Advisor"       value={advisor?.name  ?? ADVISOR_NAME} />
              <ReadField label="Advisor email" value={advisor?.email ?? ADVISOR_EMAIL} />
            </div>
          </motion.div>
        )}

        {/* ── Password ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.16 }} className={card} style={cardStyle}>
          <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>Change password</h2>
          <p className="mb-5 text-xs" style={{ color: "var(--ink-3)" }}>
            You&apos;ll need your current password to confirm the change.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <PasswordField label="Current password" value={currentPw} onChange={setCurrentPw} autoComplete="current-password" />
            <PasswordField label="New password"     value={newPw}     onChange={setNewPw} />

            {/* Strength meter */}
            {newPw.length > 0 && (
              <div>
                <div className="flex gap-1.5">
                  {STRENGTH.map((s, i) => (
                    <div key={s.label} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: i < score ? strength!.color : "var(--line)" }} />
                  ))}
                </div>
                <p className="mt-1 text-[0.7rem] font-semibold" style={{ color: strength!.color }}>{strength!.label}</p>
              </div>
            )}

            {/* Requirements checklist */}
            {newPw.length > 0 && (
              <div className="space-y-1.5 rounded-xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--surface-alt)" }}>
                {RULES.map((rule) => {
                  const met = rule.test(newPw);
                  return (
                    <div key={rule.label} className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 shrink-0 transition-colors" style={{ color: met ? "#22c55e" : "var(--ink-4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[0.72rem]" style={{ color: met ? "var(--ink)" : "var(--ink-3)" }}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <PasswordField label="Confirm new password" value={confirmPw} onChange={setConfirmPw} />
              {passwordsMismatch && <p className="mt-1.5 text-[0.7rem]" style={{ color: "#ef4444" }}>Passwords don&apos;t match.</p>}
              {passwordsMatch   && (
                <p className="mt-1.5 flex items-center gap-1 text-[0.7rem]" style={{ color: "#22c55e" }}>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Passwords match
                </p>
              )}
            </div>

            {pwError && <p className="text-xs" style={{ color: "var(--error)" }}>{pwError}</p>}

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="press rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                style={{ background: "var(--brand)" }}>
                {saving ? "Saving…" : "Update password"}
              </button>
              {saved && (
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#059669" }}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Password updated
                </motion.span>
              )}
            </div>
          </form>
        </motion.div>

        {/* ── Notifications ── */}
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.22 }} className={card} style={cardStyle}>
          <h2 className="mb-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>Notifications</h2>
          <p className="mb-5 text-xs" style={{ color: "var(--ink-3)" }}>Control which emails Sparing sends to your account.</p>

          <div
            className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-line-strong"
            style={{ borderColor: "var(--line)", background: "var(--surface-alt)" }}
          >
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>New document shared</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
                Get an email when your advisor uploads a file.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={notifyDocs}
              disabled={savingNotif}
              onClick={() => void handleNotifToggle(!notifyDocs)}
              className="press relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 disabled:opacity-50"
              style={{ background: notifyDocs ? "var(--brand)" : "var(--ink-4)" }}
            >
              <span
                className="pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200"
                style={{ transform: notifyDocs ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
