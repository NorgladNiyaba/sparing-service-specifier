"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useOnboarding } from "@/components/portal/onboarding-context";
import { StepPanel } from "@/components/portal/onboarding-panels";
import { ProgressRing } from "@/components/portal/progress-ring";
import { ONBOARDING_STEPS, STEP_BY_ID, nextStepId, type OnboardingStepId, type StepStatus } from "@/lib/onboarding";

/* ── Step icons ──────────────────────────────────────────────────────────── */

const STEP_ICON: Record<OnboardingStepId, React.ReactNode> = {
  logo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  business: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 21h18M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),
  preferences: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  ),
};

/* ── Status dot ──────────────────────────────────────────────────────────── */

function StatusDot({ status, active }: { status: StepStatus; active: boolean }) {
  if (status === "done") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(5,150,105,0.12)" }}
      >
        <svg className="h-3 w-3" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: "var(--line-strong)" }}
        title="Skipped"
      >
        <span className="h-[1.5px] w-2 rounded-full" style={{ background: "var(--ink-4)" }} />
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: active ? "var(--brand)" : "var(--line-strong)" }}
    >
      {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand)" }} />}
    </span>
  );
}

/* ── Desktop rail ────────────────────────────────────────────────────────── */

function StepRail({ activeStep }: { activeStep: OnboardingStepId | null }) {
  const { state, goToStep } = useOnboarding();
  if (!state) return null;

  const statusOf = (id: OnboardingStepId): StepStatus =>
    state.steps.find((s) => s.id === id)?.status ?? "pending";

  return (
    <aside
      className="hidden w-[248px] shrink-0 flex-col border-r sm:flex"
      style={{ borderColor: "var(--line)", background: "var(--surface-alt)" }}
    >
      {/* Progress header */}
      <div className="px-5 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <ProgressRing
            percent={state.progress.percent}
            size={42}
            stroke={3}
            trackColor="var(--line)"
          >
            <span className="text-[0.6rem] font-bold tabular-nums" style={{ color: "var(--ink)" }}>
              {state.progress.percent}%
            </span>
          </ProgressRing>
          <div>
            <p className="text-[0.82rem] font-bold tracking-[-0.02em]" style={{ color: "var(--ink)" }}>
              Get started
            </p>
            <p className="mt-0.5 text-[0.7rem] tabular-nums" style={{ color: "var(--ink-3)" }}>
              {state.progress.resolved} of {state.progress.total} complete
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 mb-2" style={{ borderTop: "1px solid var(--line)" }} />

      {/* Steps */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {ONBOARDING_STEPS.map((s, i) => {
          const status = statusOf(s.id);
          const active = activeStep === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goToStep(s.id)}
              aria-current={active ? "step" : undefined}
              className="press group mb-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
              style={{ background: active ? "var(--surface)" : "transparent", boxShadow: active ? "var(--shadow-card)" : undefined }}
            >
              <StatusDot status={status} active={active} />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[0.8rem] font-semibold leading-tight"
                  style={{
                    color: active ? "var(--ink)" : status === "pending" ? "var(--ink-2)" : "var(--ink-3)",
                    textDecoration: status === "skipped" ? "line-through" : undefined,
                  }}
                >
                  {s.label}
                </span>
                <span className="mt-0.5 block text-[0.65rem]" style={{ color: "var(--ink-4)" }}>
                  {status === "done" ? "Done" : status === "skipped" ? "Skipped" : s.eta}
                </span>
              </span>
              <span
                className="shrink-0 transition-colors"
                style={{ color: active ? "var(--brand)" : "var(--ink-4)" }}
              >
                {STEP_ICON[s.id]}
              </span>
              <span className="sr-only">Step {i + 1}</span>
            </button>
          );
        })}
      </nav>

      {/* Advisor footer — a human, not a progress bar */}
      <div className="px-5 pb-5 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--ink-4)" }}>
          Stuck on anything?
        </p>
        <a
          href={`mailto:${state.advisor.email}`}
          className="mt-1 block text-[0.75rem] font-semibold transition-colors hover:text-brand"
          style={{ color: "var(--ink-2)" }}
        >
          {state.advisor.name}
        </a>
        <span className="text-[0.68rem]" style={{ color: "var(--ink-4)" }}>{state.advisor.title}</span>
      </div>
    </aside>
  );
}

/* ── Mobile progress strip ───────────────────────────────────────────────── */

function StepStrip({ activeStep }: { activeStep: OnboardingStepId | null }) {
  const { state, goToStep } = useOnboarding();
  if (!state) return null;

  return (
    <div className="shrink-0 border-b px-4 pb-3 pt-4 sm:hidden" style={{ borderColor: "var(--line)" }}>
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-[0.8rem] font-bold" style={{ color: "var(--ink)" }}>Get started</p>
        <p className="text-[0.7rem] font-medium tabular-nums" style={{ color: "var(--ink-3)" }}>
          {state.progress.resolved} of {state.progress.total}
        </p>
      </div>
      <div className="flex gap-1.5">
        {ONBOARDING_STEPS.map((s) => {
          const status = state.steps.find((x) => x.id === s.id)?.status ?? "pending";
          const active = activeStep === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goToStep(s.id)}
              aria-label={`${s.label} — ${status}`}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background:
                  status === "done"    ? "var(--success)"
                  : status === "skipped" ? "var(--ink-4)"
                  : active             ? "var(--brand)"
                  : "var(--line)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Welcome pane ────────────────────────────────────────────────────────── */

const PLAN_LABEL: Record<string, string> = {
  ECSS: "Growth Support",
  ICSS: "Independent Support",
  OHSS: "Office Hours Support",
};

function WelcomePane({ onStart }: { onStart: () => void }) {
  const { state, close } = useOnboarding();
  const reduce = useReducedMotion();
  if (!state) return null;

  const { client, advisor, progress } = state;
  const t = (delay: number) =>
    reduce ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: "linear-gradient(150deg, #0d0d0f 0%, #1c0a09 52%, #0d0d0f 100%)" }}
    >
      {/* Ambient brand glow, echoing the marketing pages */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 15% 0%, rgba(214,27,23,0.20) 0%, transparent 55%)," +
            "radial-gradient(ellipse at 90% 100%, rgba(214,27,23,0.10) 0%, transparent 45%)",
        }}
      />

      <div className="relative flex flex-1 flex-col justify-center px-7 py-10 sm:px-12">
        <div className="max-w-[520px]">
          {/* Lockup */}
          <motion.div
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={t(0.05)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-6 w-6" />
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.34)" }}>
              Sparing{client.companyName ? ` × ${client.companyName}` : ""}
            </span>
          </motion.div>

          <motion.h2
            id="onboarding-title"
            className="mt-6 text-[2rem] font-bold leading-[1.08] tracking-[-0.045em] text-white sm:text-[2.5rem]"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={t(0.12)}
          >
            Welcome{client.firstName ? `, ${client.firstName}` : ""}.
            <br />
            <span style={{ color: "rgba(255,255,255,0.42)" }}>Your portal is ready.</span>
          </motion.h2>

          <motion.p
            className="mt-4 max-w-[420px] text-[0.9rem] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)" }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={t(0.2)}
          >
            There are {progress.total} short first steps — your logo, who we should contact,
            and a few details about the business. About two minutes, and you can stop
            and come back at any point.
          </motion.p>

          {/* Plan + advisor */}
          <motion.div
            className="mt-7 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={t(0.28)}
          >
            {client.serviceTrack && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.63rem] font-bold uppercase tracking-[0.12em]"
                style={{ background: "rgba(214,27,23,0.18)", borderColor: "rgba(214,27,23,0.3)", color: "#f87171" }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#f87171" }} />
                {client.serviceTrack}
                {PLAN_LABEL[client.serviceTrack] ? ` · ${PLAN_LABEL[client.serviceTrack]}` : ""}
              </span>
            )}
            <span
              className="inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[0.58rem] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#e03432,#b91511)" }}
              >
                {advisor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </span>
              <span className="text-[0.72rem]" style={{ color: "rgba(255,255,255,0.5)" }}>
                <span className="font-semibold text-white/80">{advisor.name}</span> is your advisor
              </span>
            </span>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={t(0.36)}
          >
            <button
              type="button"
              onClick={onStart}
              className="press inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#d61b17", boxShadow: "0 10px 30px rgba(214,27,23,0.32)" }}
            >
              Set up your profile
              <span className="text-[0.7rem] font-medium opacity-60">~2 min</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={close}
              className="focus-dark rounded-full px-5 py-3 text-sm font-medium transition-colors hover:text-white/70"
              style={{ color: "rgba(255,255,255,0.38)" }}
            >
              Explore the portal first
            </button>
          </motion.div>

          <motion.p
            className="mt-6 text-[0.68rem]"
            style={{ color: "rgba(255,255,255,0.22)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={t(0.46)}
          >
            You can pick this up any time from <span style={{ color: "rgba(255,255,255,0.4)" }}>Get started</span> in the sidebar.
          </motion.p>
        </div>
      </div>
    </div>
  );
}

/* ── Completion pane ─────────────────────────────────────────────────────── */

function CompletePane() {
  const { state, markCelebrated, close } = useOnboarding();
  const reduce = useReducedMotion();
  if (!state) return null;

  async function finish() {
    await markCelebrated();
    close();
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-7 py-12 text-center">
      <motion.div
        initial={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
        animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 18 }}
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "rgba(5,150,105,0.1)", animation: reduce ? undefined : "cta-celebrate 1.1s ease-out 0.25s" }}
      >
        <svg className="h-8 w-8" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <motion.h2
        id="onboarding-title"
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 text-[1.5rem] font-bold tracking-[-0.035em]"
        style={{ color: "var(--ink)" }}
      >
        You&apos;re all set{state.client.firstName ? `, ${state.client.firstName}` : ""}.
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mt-2.5 max-w-[400px] text-sm leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        {state.advisor.name} has everything needed to get started. You&apos;ll hear from
        them shortly — and anything new will show up in your portal.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 flex flex-col gap-2.5 sm:flex-row"
      >
        <button
          type="button"
          onClick={() => void finish()}
          className="press rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          Go to my portal
        </button>
        <a
          href="/portal/messages"
          onClick={() => void markCelebrated()}
          className="press rounded-xl border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand"
          style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
        >
          Message {state.advisor.name.split(" ")[0]}
        </a>
      </motion.div>
    </div>
  );
}

/* ── Overlay ─────────────────────────────────────────────────────────────── */

export function OnboardingOverlay() {
  const { state, isOpen, close, activeStep, goToStep, loading } = useOnboarding();
  const reduce    = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Escape, focus containment, scroll lock, focus restore. */
  useEffect(() => {
    if (!isOpen) return;
    const el = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;

    el?.focus({ preventScroll: true });

    function focusables(): HTMLElement[] {
      if (!el) return [];
      return Array.from(el.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      )).filter((n) => n.offsetParent !== null);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus({ preventScroll: true });
    };
  }, [isOpen, close]);

  if (loading || !state) return null;

  /* Which pane? Completion wins, then welcome, then the active step. */
  const showComplete = state.progress.complete && !state.celebratedAt;
  const mode: "welcome" | "complete" | "steps" =
    showComplete ? "complete" : activeStep === null ? "welcome" : "steps";

  function startSteps() {
    goToStep(nextStepId(state!.steps) ?? state!.steps[0].id);
  }

  /* Continue from a step: land on the next unresolved one, or fall through to
     the completion pane once everything is resolved. */
  function advanceFrom(step: OnboardingStepId) {
    const remaining = state!.steps.filter((s) => s.status === "pending" && s.id !== step);
    if (remaining.length > 0) {
      const order = ONBOARDING_STEPS.map((s) => s.id);
      const after = remaining.find((s) => order.indexOf(s.id) > order.indexOf(step));
      goToStep((after ?? remaining[0]).id);
    }
    /* Nothing left — the completion pane takes over on the next render. */
  }

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="onboarding-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="fixed inset-0 z-[180] flex items-end justify-center sm:items-center sm:p-6"
          style={{ background: "rgba(8,8,10,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0,  scale: 1 }}
            exit={reduce    ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: reduce ? 0.15 : 0.3, ease }}
            className="relative flex w-full max-w-[940px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
            style={{
              background: "var(--surface)",
              boxShadow: "0 32px 90px rgba(0,0,0,0.32)",
              height: "min(660px, 92vh)",
            }}
          >
            {/* Close — always available, no confirmation */}
            <button
              type="button"
              onClick={close}
              aria-label="Close setup"
              className={`press absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors sm:right-4 sm:top-4 ${
                mode === "welcome" ? "focus-dark hover:bg-white/10" : "hover:bg-black/5"
              }`}
              style={{ color: mode === "welcome" ? "rgba(255,255,255,0.45)" : "var(--ink-3)" }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait" initial={false}>
              {mode === "welcome" ? (
                <motion.div
                  key="welcome"
                  className="h-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
                  transition={{ duration: reduce ? 0.12 : 0.26, ease }}
                >
                  <WelcomePane onStart={startSteps} />
                </motion.div>
              ) : mode === "complete" ? (
                <motion.div
                  key="complete"
                  className="h-full"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0.12 : 0.26, ease }}
                >
                  <CompletePane />
                </motion.div>
              ) : (
                <motion.div
                  key="steps"
                  className="flex h-full min-h-0"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0.12 : 0.26, ease }}
                >
                  <StepRail activeStep={activeStep} />

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <StepStrip activeStep={activeStep} />
                    {/* Panel swap — direction-agnostic cross-fade with a slight lift */}
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={activeStep}
                        className="flex min-h-0 flex-1 flex-col"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                        exit={reduce    ? { opacity: 0 } : { opacity: 0, y: -4 }}
                        transition={{ duration: reduce ? 0.1 : 0.22, ease }}
                      >
                        {activeStep && (
                          <>
                            <h2 id="onboarding-title" className="sr-only">
                              {STEP_BY_ID[activeStep].title}
                            </h2>
                            <StepPanel step={activeStep} onDone={() => advanceFrom(activeStep)} />
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
