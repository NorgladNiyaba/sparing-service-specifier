"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { usePortalContext } from "@/components/portal/portal-context";
import {
  computeProgress, nextStepId,
  type OnboardingProgress, type OnboardingStepId, type ResolvedStep, type WritableField,
} from "@/lib/onboarding";

/* ── Payload ─────────────────────────────────────────────────────────────── */

export interface OnboardingState {
  schemaReady:  boolean;
  steps:        ResolvedStep[];
  progress:     OnboardingProgress;
  values:       Partial<Record<WritableField, string>>;
  suggestions:  { primary_contact_name: string; primary_contact_email: string; primary_contact_title: string };
  logoUrl:      string | null;
  welcomedAt:   string | null;
  dismissedAt:  string | null;
  completedAt:  string | null;
  celebratedAt: string | null;
  lastStep:     OnboardingStepId | null;
  client:  { firstName: string; fullName: string; companyName: string; serviceTrack: string; signedAt: string | null };
  advisor: { name: string; email: string; title: string };
  uploadCount: number;
}

interface OnboardingContextValue {
  state:    OnboardingState | null;
  loading:  boolean;
  /** Overlay visibility. */
  isOpen:   boolean;
  open:     (step?: OnboardingStepId) => void;
  close:    () => void;
  /** Step the overlay should render. */
  activeStep: OnboardingStepId | null;
  goToStep: (step: OnboardingStepId) => void;
  /** Persist one step's fields. Resolves true on success. */
  saveStep: (step: OnboardingStepId, values: Record<string, string>) => Promise<boolean>;
  skipStep: (step: OnboardingStepId) => Promise<void>;
  markCelebrated: () => Promise<void>;
  refresh:  () => Promise<void>;
  /** Last write error, surfaced inline by the panels. */
  error:    string | null;
}

const noop = async () => {};

const OnboardingContext = createContext<OnboardingContextValue>({
  state: null, loading: true, isOpen: false,
  open: () => {}, close: () => {}, activeStep: null, goToStep: () => {},
  saveStep: async () => false, skipStep: noop, markCelebrated: noop, refresh: noop,
  error: null,
});

export function useOnboarding() { return useContext(OnboardingContext); }

/* ── Provider ────────────────────────────────────────────────────────────── */

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { activeClientId } = usePortalContext();
  const [state,      setState]      = useState<OnboardingState | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [isOpen,     setIsOpen]     = useState(false);
  const [activeStep, setActiveStep] = useState<OnboardingStepId | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  /* Auto-open runs once per client — reopening after a manual close would make
     the overlay feel like it's fighting the user. */
  const autoOpened = useRef<string | null>(null);
  /* Latest state, readable from callbacks without re-creating them. */
  const stateRef = useRef<OnboardingState | null>(null);
  stateRef.current = state;

  const load = useCallback(async (): Promise<OnboardingState | null> => {
    try {
      const res = await fetch("/api/portal/onboarding");
      if (!res.ok) return null;
      const data = await res.json() as OnboardingState;
      setState(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  /* Initial fetch + auto-open decision. */
  useEffect(() => {
    if (!activeClientId) return;
    let cancelled = false;

    setLoading(true);
    void load().then((data) => {
      if (cancelled) return;
      setLoading(false);
      if (!data) return;

      /* Show the welcome pane to a client who has never seen it, and only when
         there is still something to do. */
      const shouldAutoOpen =
        !data.welcomedAt && !data.dismissedAt && !data.progress.complete;

      if (shouldAutoOpen && autoOpened.current !== activeClientId) {
        autoOpened.current = activeClientId;
        setActiveStep(null);            // null = welcome pane
        setIsOpen(true);
      }
    });

    return () => { cancelled = true; };
  }, [activeClientId, load]);

  /* Reset when switching companies — a second business has its own state. */
  useEffect(() => {
    setIsOpen(false);
    setActiveStep(null);
    setError(null);
  }, [activeClientId]);

  const refresh = useCallback(async () => { await load(); }, [load]);

  const post = useCallback(async (action: string, step?: OnboardingStepId) => {
    try {
      const res = await fetch("/api/portal/onboarding", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, step }),
      });
      if (res.ok) setState(await res.json() as OnboardingState);
      else {
        const { error: msg } = await res.json().catch(() => ({ error: null })) as { error: string | null };
        if (msg) setError(msg);
      }
    } catch { /* offline — local state already reflects the intent */ }
  }, []);

  const open = useCallback((step?: OnboardingStepId) => {
    const current = stateRef.current;
    setError(null);

    if (step) {
      setActiveStep(step);
    } else if (current) {
      /* Someone who has never seen the welcome pane gets it; everyone else
         lands on their first unfinished step. */
      setActiveStep(current.welcomedAt ? nextStepId(current.steps) ?? current.steps[0].id : null);
    }
    setIsOpen(true);

    /* Clear a stale dismissal so the sidebar reflects an active session. */
    if (current?.dismissedAt) void post("reopen");
  }, [post]);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    void post("dismiss");
  }, [post]);

  const goToStep = useCallback((step: OnboardingStepId) => {
    setError(null);
    setActiveStep(step);
  }, []);

  const saveStep = useCallback(async (step: OnboardingStepId, values: Record<string, string>) => {
    setError(null);
    try {
      const res = await fetch("/api/portal/onboarding", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ step, values }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: null })) as { error: string | null };
        setError(msg ?? "Couldn't save that — please try again.");
        return false;
      }
      setState(await res.json() as OnboardingState);
      return true;
    } catch {
      setError("Couldn't reach the server — check your connection.");
      return false;
    }
  }, []);

  const skipStep = useCallback(async (step: OnboardingStepId) => {
    /* Optimistic: flip the row immediately, the server confirms. */
    setState((prev) => {
      if (!prev) return prev;
      const steps = prev.steps.map((s) =>
        s.id === step && s.status === "pending" ? { ...s, status: "skipped" as const } : s);
      return { ...prev, steps, progress: computeProgress(steps) };
    });
    await post("skip", step);
  }, [post]);

  const markCelebrated = useCallback(async () => { await post("celebrated"); }, [post]);

  const value = useMemo<OnboardingContextValue>(() => ({
    state, loading, isOpen, open, close, activeStep, goToStep,
    saveStep, skipStep, markCelebrated, refresh, error,
  }), [state, loading, isOpen, open, close, activeStep, goToStep,
       saveStep, skipStep, markCelebrated, refresh, error]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
