"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useOnboarding } from "@/components/portal/onboarding-context";
import { ProgressRing } from "@/components/portal/progress-ring";
import { ONBOARDING_STEPS, type StepStatus } from "@/lib/onboarding";

function RowIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(5,150,105,0.1)" }}>
        <svg className="h-3.5 w-3.5" style={{ color: "var(--success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: "var(--line-strong)" }}>
        <span className="h-[1.5px] w-2.5 rounded-full" style={{ background: "var(--ink-4)" }} />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: "var(--line-strong)" }} />
  );
}

/**
 * Dashboard surface for onboarding. Reflects real derived state — a step ticks
 * itself as soon as the underlying data exists, wherever it was entered.
 *
 * Renders nothing once everything is resolved and acknowledged, so the
 * dashboard returns to its normal content.
 */
export function SetupCard() {
  const { state, open } = useOnboarding();
  const [expanded, setExpanded] = useState<boolean | null>(null);

  if (!state || !state.schemaReady) return null;
  if (state.progress.complete && state.celebratedAt) return null;

  /* Collapsed by default for someone who has already dismissed the overlay —
     they've seen it; a single line is enough of a reminder. */
  const isExpanded = expanded ?? !state.dismissedAt;
  const { resolved, total, percent, complete } = state.progress;
  const statusOf = (id: string): StepStatus =>
    state.steps.find((s) => s.id === id)?.status ?? "pending";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border bg-white"
      style={{ borderColor: "rgba(214,27,23,0.18)", boxShadow: "var(--shadow-card)" }}
    >
      {/* Header — doubles as the collapse toggle */}
      <div className="flex items-center gap-3.5 px-5 py-4">
        <ProgressRing percent={percent} size={40} stroke={3} trackColor="var(--line)">
          <span className="text-[0.58rem] font-bold tabular-nums" style={{ color: "var(--ink)" }}>
            {resolved}/{total}
          </span>
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
            {complete ? "Setup complete" : "Finish setting up your portal"}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>
            {complete
              ? "Nice work — review anything you'd like to change."
              : `${total - resolved} step${total - resolved === 1 ? "" : "s"} left · about ${Math.max(1, total - resolved)} min`}
          </p>
        </div>

        <button
          onClick={() => open()}
          className="press hidden shrink-0 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:block"
          style={{ background: "var(--brand)" }}
        >
          {complete ? "Review" : resolved > 0 ? "Resume" : "Start"}
        </button>

        <button
          onClick={() => setExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Hide steps" : "Show steps"}
          className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.04]"
          style={{ color: "var(--ink-3)" }}
        >
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.span>
        </button>
      </div>

      {/* Steps */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="divide-y border-t" style={{ borderColor: "var(--line)" }}>
              {ONBOARDING_STEPS.map((s, i) => {
                const status = statusOf(s.id);
                const isPending = status === "pending";
                return (
                  <motion.button
                    key={s.id}
                    onClick={() => open(s.id)}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.22, delay: i * 0.04, ease: "easeOut" }}
                    className="group flex w-full items-center gap-3.5 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-alt)]"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <RowIcon status={status} />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[0.83rem] font-medium"
                        style={{
                          color: isPending ? "var(--ink)" : "var(--ink-3)",
                          textDecoration: status !== "pending" ? "line-through" : undefined,
                        }}
                      >
                        {s.label}
                      </span>
                    </span>
                    {isPending ? (
                      <>
                        <span className="shrink-0 text-[0.65rem] font-medium tabular-nums" style={{ color: "var(--ink-4)" }}>
                          {s.eta}
                        </span>
                        <span
                          className="shrink-0 rounded-lg border px-2.5 py-1 text-[0.68rem] font-semibold transition-colors group-hover:border-brand group-hover:text-brand"
                          style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
                        >
                          Add
                        </span>
                      </>
                    ) : (
                      <span className="shrink-0 text-[0.68rem] font-medium opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--ink-3)" }}>
                        Edit
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Mobile CTA — the header button is desktop-only */}
            <div className="border-t px-5 py-3 sm:hidden" style={{ borderColor: "var(--line)" }}>
              <button
                onClick={() => open()}
                className="press w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                {complete ? "Review setup" : resolved > 0 ? "Resume setup" : "Start setup"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
