"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOnboarding } from "@/components/portal/onboarding-context";
import { usePortalContext } from "@/components/portal/portal-context";
import { useToast } from "@/components/portal/toast";
import { getUploadCredentials, safeFileName, uploadToStorage } from "@/lib/storage-upload";
import {
  LOGO_ACCEPT, STEP_BY_ID, validateLogo,
  type FieldDef, type OnboardingStepId,
} from "@/lib/onboarding";

/* ── Save indicator ──────────────────────────────────────────────────────── */

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveBadge({ state }: { state: SaveState }) {
  return (
    <AnimatePresence mode="wait">
      {state === "saving" && (
        <motion.span
          key="saving"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-[0.68rem] font-medium"
          style={{ color: "var(--ink-3)" }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--ink-3)" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          Saving
        </motion.span>
      )}
      {state === "saved" && (
        <motion.span
          key="saved"
          initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-1 text-[0.68rem] font-semibold"
          style={{ color: "var(--success)" }}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ── Field primitives ────────────────────────────────────────────────────── */

const FIELD_BASE =
  "w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-colors";

function fieldStyle(invalid: boolean): React.CSSProperties {
  return {
    borderColor: invalid ? "var(--error)" : "var(--line)",
    background:  "var(--surface)",
    color:       "var(--ink)",
  };
}

function FieldLabel({ def }: { def: FieldDef }) {
  return (
    <span className="mb-1.5 flex items-baseline gap-1.5">
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>
        {def.label}
      </span>
      {!def.required && (
        <span className="text-[0.62rem] font-medium" style={{ color: "var(--ink-4)" }}>Optional</span>
      )}
    </span>
  );
}

interface FieldProps {
  def:      FieldDef;
  value:    string;
  invalid:  boolean;
  /** Local edit — does not persist. */
  onChange: (v: string) => void;
  /**
   * Persist the step. Controls that change in one gesture (select, radio) must
   * pass the new value, because React state has not applied yet when the
   * handler runs and the closed-over draft would still hold the old value.
   */
  onCommit: (v?: string) => void;
}

function TextField({ def, value, invalid, onChange, onCommit }: FieldProps) {
  return (
    <label className="block">
      <FieldLabel def={def} />
      <input
        type={def.kind === "email" ? "email" : def.kind === "tel" ? "tel" : "text"}
        value={value}
        placeholder={def.placeholder}
        autoComplete={def.autoComplete}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => onCommit()}
        className={`${FIELD_BASE} focus:border-brand`}
        style={fieldStyle(invalid)}
      />
      {def.hint && (
        <span className="mt-1 block text-[0.68rem]" style={{ color: "var(--ink-3)" }}>{def.hint}</span>
      )}
    </label>
  );
}

function SelectField({ def, value, invalid, onChange, onCommit }: FieldProps) {
  return (
    <label className="block">
      <FieldLabel def={def} />
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => { onChange(e.target.value); onCommit(e.target.value); }}
          className={`${FIELD_BASE} appearance-none pr-9 focus:border-brand`}
          style={{ ...fieldStyle(invalid), color: value ? "var(--ink)" : "var(--ink-4)" }}
        >
          <option value="">Select…</option>
          {def.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
          style={{ color: "var(--ink-3)" }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      {def.hint && (
        <span className="mt-1 block text-[0.68rem]" style={{ color: "var(--ink-3)" }}>{def.hint}</span>
      )}
    </label>
  );
}

function RadioField({ def, value, onChange, onCommit }: FieldProps) {
  return (
    <div>
      <FieldLabel def={def} />
      <div className="flex flex-wrap gap-2">
        {def.options?.map((o) => {
          const active = value === o;
          return (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(o); onCommit(o); }}
              aria-pressed={active}
              className="press rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: active ? "var(--brand)" : "var(--line)",
                background:  active ? "var(--brand-soft)" : "var(--surface)",
                color:       active ? "var(--brand)" : "var(--ink-2)",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Form step (contact / business / preferences) ─────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function FormStep({ step, onDone }: { step: OnboardingStepId; onDone: () => void }) {
  const { state, saveStep, error } = useOnboarding();
  const def    = STEP_BY_ID[step];
  const fields = def.fields;

  const initial = useMemo(() => {
    const out: Record<string, string> = {};
    for (const f of fields) out[f.key] = state?.values[f.key] ?? "";
    return out;
  }, [fields, state?.values]);

  /* Seeded once from the server payload — the overlay only mounts a panel after
     state has loaded, and the panel remounts on every rail navigation, so there
     is no need to re-sync. Syncing on every save would clobber whatever the
     client typed into the next field while the previous one was in flight. */
  const [draft,     setDraft]     = useState<Record<string, string>>(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [touched,   setTouched]   = useState<Set<string>>(new Set());
  const [advancing, setAdvancing] = useState(false);

  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  /* Persist the whole step. Called on blur and on select/radio change, so work
     is never lost when the overlay is closed mid-step. */
  const persist = useCallback(async (values: Record<string, string>) => {
    /* Don't round-trip a half-typed email — it would 422. */
    const payload = { ...values };
    for (const f of fields) {
      if (f.kind === "email" && payload[f.key] && !EMAIL_RE.test(payload[f.key])) {
        delete payload[f.key];
      }
    }
    setSaveState("saving");
    const ok = await saveStep(step, payload);
    setSaveState(ok ? "saved" : "error");
    if (ok) {
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaveState("idle"), 2000);
    }
    return ok;
  }, [fields, saveStep, step]);

  const dirty = useRef(false);

  function setValue(key: string, v: string) {
    dirty.current = true;
    setDraft((p) => ({ ...p, [key]: v }));
  }

  function commit(key: string, explicit?: string) {
    setTouched((p) => new Set(p).add(key));
    /* An explicit value means a one-gesture control fired; always persist it. */
    if (explicit === undefined && !dirty.current) return;
    dirty.current = false;
    void persist(explicit === undefined ? { ...draft } : { ...draft, [key]: explicit });
  }

  const missing = fields.filter((f) => f.required && !draft[f.key]?.trim());
  const badEmail = fields.filter(
    (f) => f.kind === "email" && draft[f.key]?.trim() && !EMAIL_RE.test(draft[f.key].trim()),
  );
  const canContinue = missing.length === 0 && badEmail.length === 0;

  async function handleContinue() {
    setAdvancing(true);
    const ok = await persist({ ...draft });
    setAdvancing(false);
    if (ok) onDone();
  }

  /* "Same as me" — only offered on the contact step, and only while empty. */
  const suggestion = state?.suggestions;
  const showSameAsMe =
    step === "contact" && !!suggestion?.primary_contact_email &&
    !draft.primary_contact_name && !draft.primary_contact_email;

  function applySameAsMe() {
    if (!suggestion) return;
    const next = {
      ...draft,
      primary_contact_name:  suggestion.primary_contact_name,
      primary_contact_email: suggestion.primary_contact_email,
      primary_contact_title: draft.primary_contact_title || suggestion.primary_contact_title,
    };
    setDraft(next);
    dirty.current = false;
    void persist(next);
  }

  return (
    <div className="flex h-full flex-col">
      <StepHeader step={step} saveState={saveState} />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
        {showSameAsMe && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onClick={applySameAsMe}
            className="press mb-4 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors hover:border-brand/40"
            style={{ borderColor: "var(--line)", background: "var(--surface-alt)" }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.62rem] font-bold text-white"
              style={{ background: "linear-gradient(135deg,#e03432,#b91511)" }}
            >
              {suggestion!.primary_contact_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
                That&apos;s me — use my details
              </span>
              <span className="block truncate text-xs" style={{ color: "var(--ink-3)" }}>
                {suggestion!.primary_contact_name} · {suggestion!.primary_contact_email}
              </span>
            </span>
            <svg className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--ink-3)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </motion.button>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const invalid =
              touched.has(f.key) &&
              ((f.required && !draft[f.key]?.trim()) ||
               (f.kind === "email" && !!draft[f.key]?.trim() && !EMAIL_RE.test(draft[f.key].trim())));
            const props: FieldProps = {
              def:      f,
              value:    draft[f.key] ?? "",
              invalid,
              onChange: (v) => setValue(f.key, v),
              onCommit: (v) => commit(f.key, v),
            };
            return (
              <div key={f.key} className={f.half ? "sm:col-span-1" : "sm:col-span-2"}>
                {f.kind === "select" ? <SelectField {...props} />
                  : f.kind === "radio" ? <RadioField {...props} />
                  : <TextField {...props} />}
              </div>
            );
          })}
        </div>

        <p className="mt-5 flex items-start gap-2 text-[0.72rem] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8h.01M11 12h1v4h1" />
          </svg>
          {def.rationale}
        </p>
      </div>

      <StepFooter
        step={step}
        error={error}
        hint={
          badEmail.length > 0 ? "Check the email address."
            : missing.length > 0 ? `${missing.map((f) => f.label).join(" and ")} needed to continue.`
            : null
        }
        canContinue={canContinue}
        busy={advancing}
        onContinue={handleContinue}
      />
    </div>
  );
}

/* ── Logo step ───────────────────────────────────────────────────────────── */

/**
 * Animates the uploaded logo from the dropzone into the sidebar's company slot.
 * A fixed-position clone is measured against `[data-logo-slot]` rather than
 * using layoutId, because both the preview and the sidebar logo stay mounted.
 */
function useLogoFlight() {
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<{
    url: string; from: DOMRect; to: DOMRect;
  } | null>(null);

  const fly = useCallback((url: string, fromEl: HTMLElement | null) => {
    if (reduce || !fromEl) return;
    const target = document.querySelector<HTMLElement>("[data-logo-slot]");
    if (!target) return;                       // sidebar collapsed (mobile)
    setFlight({ url, from: fromEl.getBoundingClientRect(), to: target.getBoundingClientRect() });
    window.setTimeout(() => setFlight(null), 900);
  }, [reduce]);

  const node = flight ? (
    <motion.img
      src={flight.url}
      alt=""
      aria-hidden
      className="pointer-events-none fixed z-[400] rounded-lg object-contain"
      style={{ background: "#fff", padding: 2 }}
      initial={{
        top: flight.from.top, left: flight.from.left,
        width: flight.from.width, height: flight.from.height,
        opacity: 1, borderRadius: 12,
      }}
      animate={{
        top: flight.to.top, left: flight.to.left,
        width: flight.to.width, height: flight.to.height,
        opacity: 0.85, borderRadius: 8,
      }}
      transition={{ duration: 0.62, ease: [0.32, 0.72, 0, 1] }}
    />
  ) : null;

  return { fly, node };
}

function LogoStep({ onDone }: { onDone: () => void }) {
  const { state, saveStep, skipStep, error } = useOnboarding();
  const { activeClientId } = usePortalContext();
  const { toast } = useToast();
  const def = STEP_BY_ID.logo;

  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { fly, node: flightNode } = useLogoFlight();

  /* Revoke the object URL when it is replaced or the step unmounts. */
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  const shownUrl = localUrl ?? state?.logoUrl ?? null;

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file || !activeClientId) return;
    setLocalErr(null);

    const invalid = validateLogo(file.name, file.size);
    if (invalid) { setLocalErr(invalid); return; }

    const creds = await getUploadCredentials();
    if (!creds) { setLocalErr("Your session expired — please sign in again."); return; }

    const ext  = file.name.split(".").pop()!.toLowerCase();
    const path = `${activeClientId}/branding/${Date.now()}-logo.${ext}`;
    const objectUrl = URL.createObjectURL(file);

    setLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
    setProgress(0);

    try {
      await uploadToStorage(file, path, creds.accessToken, creds.supabaseUrl, setProgress);
      const ok = await saveStep("logo", { logo_path: path });
      setProgress(null);
      if (!ok) { setLocalErr("Uploaded, but we couldn't save it. Try again."); return; }

      fly(objectUrl, previewRef.current);
      toast("Logo added — it's now on your portal.", "success");
    } catch {
      setProgress(null);
      setLocalErr("Upload failed. Please try again.");
    }
  }, [activeClientId, saveStep, fly, toast]);

  async function handleRemove() {
    setLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    await saveStep("logo", { logo_path: "" });
  }

  const uploading = progress !== null;

  return (
    <div className="flex h-full flex-col">
      {flightNode}
      <StepHeader step="logo" saveState={uploading ? "saving" : "idle"} />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />

        <AnimatePresence mode="wait">
          {shownUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border p-5"
              style={{ borderColor: "var(--line)", background: "var(--surface-alt)" }}
            >
              <div className="flex items-center gap-4">
                {/* Checkerboard reveals transparent edges — useful for PNG logos */}
                <div
                  ref={previewRef}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
                  style={{
                    borderColor: "var(--line)",
                    background:
                      "repeating-conic-gradient(#f4f4f6 0% 25%, #ffffff 0% 50%) 50% / 12px 12px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shownUrl} alt="Your company logo" className="max-h-[72px] max-w-[72px] object-contain" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--ink)" }}>
                    <svg className="h-4 w-4" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Logo added
                  </p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                    Shown in your portal sidebar and on documents we prepare for you.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="press rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-brand hover:text-brand"
                      style={{ borderColor: "var(--line)", color: "var(--ink-2)", background: "var(--surface)" }}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove()}
                      className="press rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-70"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="press flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-11 transition-colors"
                style={{
                  borderColor: dragging ? "var(--brand)" : "var(--line-strong)",
                  background:  dragging ? "var(--brand-soft)" : "var(--surface-alt)",
                }}
              >
                <motion.span
                  animate={dragging ? { scale: 1.12, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 360, damping: 22 }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "var(--brand-soft)" }}
                >
                  <svg className="h-6 w-6" style={{ color: "var(--brand)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </motion.span>
                <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {uploading ? "Uploading…" : dragging ? "Drop it here" : "Drop your logo, or click to browse"}
                </span>
                <span className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
                  PNG, JPG, WEBP or SVG · up to 4 MB
                </span>

                {uploading && (
                  <span className="mt-4 block h-1 w-40 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: "var(--brand)" }}
                      animate={{ width: `${progress ?? 0}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {localErr && (
          <p className="mt-3 text-xs font-medium" style={{ color: "var(--error)" }}>{localErr}</p>
        )}

        <p className="mt-5 flex items-start gap-2 text-[0.72rem] leading-relaxed" style={{ color: "var(--ink-3)" }}>
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8h.01M11 12h1v4h1" />
          </svg>
          {def.rationale}
        </p>
      </div>

      <StepFooter
        step="logo"
        error={error}
        hint={null}
        canContinue={!!shownUrl && !uploading}
        busy={uploading}
        onContinue={onDone}
        onSkip={async () => { await skipStep("logo"); onDone(); }}
      />
    </div>
  );
}

/* ── Documents step ──────────────────────────────────────────────────────── */

const SUGGESTED_DOCS = [
  "Most recent bank statement",
  "Signed W-9",
  "Last filed tax return",
  "Payroll summary",
];

function DocumentsStep({ onDone }: { onDone: () => void }) {
  const { state, skipStep, refresh, error } = useOnboarding();
  const { activeClientId } = usePortalContext();
  const { toast } = useToast();

  const [dragging, setDragging] = useState(false);
  const [queue,    setQueue]    = useState<Array<{ id: string; name: string; progress: number; failed?: boolean }>>([]);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploaded = state?.uploadCount ?? 0;

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !activeClientId) return;
    setLocalErr(null);

    const creds = await getUploadCredentials();
    if (!creds) { setLocalErr("Your session expired — please sign in again."); return; }

    for (const file of Array.from(files)) {
      const check = await fetch("/api/portal/validate-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ filename: file.name, sizeBytes: file.size }),
      });
      if (!check.ok) {
        const { error: msg } = await check.json().catch(() => ({ error: null })) as { error: string | null };
        setLocalErr(msg ?? `"${file.name}" can't be uploaded.`);
        continue;
      }

      const id   = crypto.randomUUID();
      const path = `${activeClientId}/${Date.now()}_${safeFileName(file.name)}`;
      setQueue((p) => [...p, { id, name: file.name, progress: 0 }]);

      try {
        await uploadToStorage(file, path, creds.accessToken, creds.supabaseUrl, (pct) =>
          setQueue((p) => p.map((q) => q.id === id ? { ...q, progress: pct } : q)));

        const res = await fetch("/api/portal/uploads", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: file.name, storage_path: path, size_bytes: file.size }),
        });
        if (!res.ok) throw new Error("register failed");

        setQueue((p) => p.map((q) => q.id === id ? { ...q, progress: 100 } : q));
        toast(`"${file.name}" sent to your advisor.`, "success");
      } catch {
        setQueue((p) => p.map((q) => q.id === id ? { ...q, failed: true } : q));
      }
    }

    await refresh();
  }, [activeClientId, refresh, toast]);

  const done = queue.filter((q) => q.progress === 100 && !q.failed).length;

  return (
    <div className="flex h-full flex-col">
      <StepHeader step="documents" saveState="idle" />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-7">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => { void handleFiles(e.target.files); e.target.value = ""; }}
        />

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFiles(e.dataTransfer.files); }}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="press flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 transition-colors"
            style={{
              borderColor: dragging ? "var(--brand)" : "var(--line-strong)",
              background:  dragging ? "var(--brand-soft)" : "var(--surface-alt)",
            }}
          >
            <motion.span
              animate={dragging ? { scale: 1.12, y: -2 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 22 }}
              className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: "var(--brand-soft)" }}
            >
              <svg className="h-5 w-5" style={{ color: "var(--brand)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </motion.span>
            <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {dragging ? "Drop your files here" : "Drop files, or click to browse"}
            </span>
            <span className="mt-1 text-xs" style={{ color: "var(--ink-3)" }}>
              PDF, Word, Excel, images · up to 50 MB each
            </span>
          </button>
        </div>

        {/* Live queue */}
        <AnimatePresence>
          {queue.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-1.5 overflow-hidden"
            >
              {queue.map((q) => (
                <motion.li
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
                  style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium" style={{ color: "var(--ink)" }}>
                    {q.name}
                  </span>
                  {q.failed ? (
                    <span className="text-[0.68rem] font-semibold" style={{ color: "var(--error)" }}>Failed</span>
                  ) : q.progress === 100 ? (
                    <svg className="h-4 w-4 shrink-0 badge-pop" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="block h-1 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "var(--line)" }}>
                      <motion.span
                        className="block h-full rounded-full"
                        style={{ background: "var(--brand)" }}
                        animate={{ width: `${q.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </span>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {localErr && <p className="mt-3 text-xs font-medium" style={{ color: "var(--error)" }}>{localErr}</p>}

        {/* Checklist of what's useful — makes "what do I send?" answerable */}
        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: "var(--line)" }}>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--ink-3)" }}>
            Helpful to have
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {SUGGESTED_DOCS.map((d) => (
              <li key={d} className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--ink-4)" }} />
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.7rem] leading-relaxed" style={{ color: "var(--ink-3)" }}>
            Send what you have now — you can always add more from Uploads.
          </p>
        </div>
      </div>

      <StepFooter
        step="documents"
        error={error}
        hint={uploaded + done > 0 ? null : "Add at least one file, or leave this for later."}
        canContinue={uploaded + done > 0}
        busy={queue.some((q) => q.progress < 100 && !q.failed)}
        onContinue={onDone}
        onSkip={async () => { await skipStep("documents"); onDone(); }}
      />
    </div>
  );
}

/* ── Shared chrome ───────────────────────────────────────────────────────── */

function StepHeader({ step, saveState }: { step: OnboardingStepId; saveState: SaveState }) {
  const def = STEP_BY_ID[step];
  return (
    <div className="shrink-0 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[1.15rem] font-bold leading-tight tracking-[-0.03em]" style={{ color: "var(--ink)" }}>
            {def.title}
          </h2>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {def.blurb}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[0.62rem] font-semibold tabular-nums"
            style={{ background: "var(--surface-alt)", color: "var(--ink-3)" }}
          >
            {def.eta}
          </span>
          <SaveBadge state={saveState} />
        </div>
      </div>
    </div>
  );
}

function StepFooter({
  step, error, hint, canContinue, busy, onContinue, onSkip,
}: {
  step:        OnboardingStepId;
  error:       string | null;
  hint:        string | null;
  canContinue: boolean;
  busy:        boolean;
  onContinue:  () => void;
  onSkip?:     () => Promise<void>;
}) {
  const { close } = useOnboarding();
  const def = STEP_BY_ID[step];
  const [skipping, setSkipping] = useState(false);

  return (
    <div
      className="shrink-0 border-t px-5 py-4 sm:px-7"
      style={{ borderColor: "var(--line)", background: "var(--surface)" }}
    >
      {error && <p className="mb-2.5 text-xs font-medium" style={{ color: "var(--error)" }}>{error}</p>}

      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          <button
            type="button"
            onClick={close}
            className="text-xs font-semibold transition-colors hover:opacity-70"
            style={{ color: "var(--ink-3)" }}
          >
            Finish later
          </button>
          {def.skippable && onSkip && (
            <button
              type="button"
              disabled={skipping}
              onClick={async () => { setSkipping(true); await onSkip(); setSkipping(false); }}
              className="text-xs font-medium transition-colors hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--ink-3)" }}
            >
              {def.skipLabel}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <AnimatePresence>
            {hint && !canContinue && (
              <motion.span
                initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="hidden text-[0.7rem] font-medium sm:block"
                style={{ color: "var(--ink-3)" }}
              >
                {hint}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue || busy}
            className="press w-full rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
            style={{ background: "var(--brand)" }}
          >
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dispatcher ──────────────────────────────────────────────────────────── */

export function StepPanel({ step, onDone }: { step: OnboardingStepId; onDone: () => void }) {
  if (step === "logo")      return <LogoStep onDone={onDone} />;
  if (step === "documents") return <DocumentsStep onDone={onDone} />;
  return <FormStep step={step} onDone={onDone} />;
}
