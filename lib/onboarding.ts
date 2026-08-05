/**
 * Portal onboarding — single source of truth for the first-steps flow.
 *
 * Imported by both the API route and the client components, so it must stay
 * free of JSX and server-only imports.
 *
 * The central idea: a step's completion is **derived** from whether the data
 * exists, never stored as a boolean. If an advisor fills in the primary
 * contact from the admin side, or the client edits it in Settings, the step
 * ticks itself. The only thing persisted per step is an explicit "skipped"
 * override, in client_onboarding.steps.
 */

/* ── Field vocabulary ────────────────────────────────────────────────────── */

export const ENTITY_TYPES = [
  "Sole proprietorship",
  "Single-member LLC",
  "Multi-member LLC",
  "S corporation",
  "C corporation",
  "Partnership",
  "Nonprofit",
  "Other",
] as const;

export const INDUSTRIES = [
  "Professional services",
  "Construction & trades",
  "Healthcare",
  "Real estate",
  "Retail & e-commerce",
  "Food & beverage",
  "Technology",
  "Transportation & logistics",
  "Manufacturing",
  "Education",
  "Nonprofit",
  "Other",
] as const;

export const EMPLOYEE_RANGES = [
  "Just me",
  "2–5",
  "6–10",
  "11–25",
  "26–50",
  "51+",
] as const;

export const FISCAL_MONTHS = [
  "Dec", "Jan", "Feb", "Mar", "Apr", "May",
  "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
] as const;

export const CONTACT_METHODS = ["Email", "Phone", "Portal messages"] as const;

export const TIME_WINDOWS = [
  "Morning (8am–12pm)",
  "Midday (12pm–3pm)",
  "Afternoon (3pm–6pm)",
  "Any time during business hours",
] as const;

export const TIMEZONES = [
  "Eastern (ET)",
  "Central (CT)",
  "Mountain (MT)",
  "Mountain – Arizona (MST)",
  "Pacific (PT)",
  "Alaska (AKT)",
  "Hawaii (HST)",
] as const;

/* ── Fields ──────────────────────────────────────────────────────────────── */

/** Columns on `clients` this flow is allowed to write. */
export const WRITABLE_FIELDS = [
  "logo_path",
  "primary_contact_name",
  "primary_contact_title",
  "primary_contact_email",
  "primary_contact_phone",
  "entity_type",
  "industry",
  "employee_range",
  "fiscal_year_end",
  "preferred_contact_method",
  "best_time_to_reach",
  "client_timezone",
] as const;

export type WritableField = (typeof WRITABLE_FIELDS)[number];

export type FieldKind = "text" | "email" | "tel" | "select" | "radio";

export interface FieldDef {
  key:           WritableField;
  label:         string;
  kind:          FieldKind;
  placeholder?:  string;
  options?:      readonly string[];
  required?:     boolean;
  autoComplete?: string;
  /** Render at half width on desktop. */
  half?:         boolean;
  hint?:         string;
}

/* ── Steps ───────────────────────────────────────────────────────────────── */

export const STEP_IDS = ["logo", "contact", "business", "preferences", "documents"] as const;
export type OnboardingStepId = (typeof STEP_IDS)[number];

export type StepStatus = "done" | "skipped" | "pending";

export interface StepDef {
  id:        OnboardingStepId;
  /** Rail label — terse. */
  label:     string;
  /** Panel heading. */
  title:     string;
  /** One-line panel subheading. */
  blurb:     string;
  /** Honest time estimate; shown in the panel. */
  eta:       string;
  /** Why this matters — reduces "why are you asking me this". */
  rationale: string;
  fields:    readonly FieldDef[];
  /** Can be dismissed as not-applicable. */
  skippable:  boolean;
  skipLabel?: string;
}

export const ONBOARDING_STEPS: readonly StepDef[] = [
  {
    id:        "logo",
    label:     "Company logo",
    title:     "Add your company logo",
    blurb:     "It appears across your portal and on the documents we prepare for you.",
    eta:       "~20 sec",
    rationale: "We use it on statements, reports and filings so everything we send looks like yours.",
    fields:    [],
    skippable:  true,
    skipLabel:  "We don't have a logo yet",
  },
  {
    id:        "contact",
    label:     "Primary contact",
    title:     "Who should we reach first?",
    blurb:     "The person we contact about deadlines, filings and questions.",
    eta:       "~40 sec",
    rationale: "Time-sensitive items go to this person, so getting it right avoids missed deadlines.",
    fields: [
      { key: "primary_contact_name",  label: "Full name", kind: "text",  placeholder: "Jordan Reyes",        required: true, autoComplete: "name",         half: true },
      { key: "primary_contact_title", label: "Title",     kind: "text",  placeholder: "Operations Manager",                  autoComplete: "organization-title", half: true },
      { key: "primary_contact_email", label: "Email",     kind: "email", placeholder: "jordan@company.com",  required: true, autoComplete: "email",        half: true },
      { key: "primary_contact_phone", label: "Phone",     kind: "tel",   placeholder: "(555) 012-3456",                      autoComplete: "tel",          half: true },
    ],
    skippable: false,
  },
  {
    id:        "business",
    label:     "Business profile",
    title:     "Tell us about the business",
    blurb:     "A few details that shape how we handle your accounting and filings.",
    eta:       "~40 sec",
    rationale: "Entity type and fiscal year end determine which filings apply and when they're due.",
    fields: [
      { key: "entity_type",     label: "Legal entity type", kind: "select", options: ENTITY_TYPES,     required: true, half: true },
      { key: "industry",        label: "Industry",          kind: "select", options: INDUSTRIES,       required: true, half: true },
      { key: "employee_range",  label: "Team size",         kind: "select", options: EMPLOYEE_RANGES,                  half: true },
      { key: "fiscal_year_end", label: "Fiscal year ends",  kind: "select", options: FISCAL_MONTHS,    required: true, half: true, hint: "Most businesses use December." },
    ],
    skippable: false,
  },
  {
    id:        "preferences",
    label:     "How we reach you",
    title:     "Set your communication preferences",
    blurb:     "So we contact you the way you actually want to be contacted.",
    eta:       "~20 sec",
    rationale: "Your advisor follows this for anything that isn't urgent.",
    fields: [
      { key: "preferred_contact_method", label: "Preferred method", kind: "radio",  options: CONTACT_METHODS, required: true },
      { key: "best_time_to_reach",       label: "Best time to reach you", kind: "select", options: TIME_WINDOWS, half: true },
      { key: "client_timezone",          label: "Time zone",        kind: "select", options: TIMEZONES,       half: true },
    ],
    skippable: false,
  },
  {
    id:        "documents",
    label:     "First documents",
    title:     "Send over your first documents",
    blurb:     "Bank statements, a W-9, last year's return — whatever you have on hand.",
    eta:       "~2 min",
    rationale: "This is what your advisor needs to start work, and it's the one step you may want to leave for later.",
    fields:    [],
    skippable:  true,
    skipLabel:  "I'll do this later",
  },
];

export const STEP_BY_ID: Record<OnboardingStepId, StepDef> = Object.fromEntries(
  ONBOARDING_STEPS.map((s) => [s.id, s]),
) as Record<OnboardingStepId, StepDef>;

/** Every field this flow can write, flattened — used as the API whitelist. */
export const FIELD_BY_KEY: Record<WritableField, FieldDef | undefined> = Object.fromEntries(
  ONBOARDING_STEPS.flatMap((s) => s.fields).map((f) => [f.key, f]),
) as Record<WritableField, FieldDef | undefined>;

/* ── Derivation ──────────────────────────────────────────────────────────── */

/**
 * The subset of client state that determines step completion. Kept explicit so
 * the same function runs on the server (from the DB row) and in the browser
 * (from the API payload) without drifting.
 */
export interface OnboardingSignals {
  logo_path:                string | null;
  primary_contact_name:     string | null;
  primary_contact_email:    string | null;
  entity_type:              string | null;
  industry:                 string | null;
  fiscal_year_end:          string | null;
  preferred_contact_method: string | null;
  /** Documents the client has uploaded, excluding the contract. */
  uploadCount:              number;
}

/** Explicit per-step overrides stored in client_onboarding.steps. */
export type StepOverrides = Partial<Record<OnboardingStepId, "skipped">>;

function filled(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/** True when the data behind a step is present. Ignores skip overrides. */
export function isStepSatisfied(id: OnboardingStepId, s: OnboardingSignals): boolean {
  switch (id) {
    case "logo":        return filled(s.logo_path);
    case "contact":     return filled(s.primary_contact_name) && filled(s.primary_contact_email);
    case "business":    return filled(s.entity_type) && filled(s.industry) && filled(s.fiscal_year_end);
    case "preferences": return filled(s.preferred_contact_method);
    case "documents":   return s.uploadCount > 0;
  }
}

export interface ResolvedStep {
  id:     OnboardingStepId;
  status: StepStatus;
}

/**
 * Resolve every step. Real data always wins over a skip override, so a client
 * who skips the logo and later uploads one shows as done, not skipped.
 */
export function deriveSteps(s: OnboardingSignals, overrides: StepOverrides = {}): ResolvedStep[] {
  return STEP_IDS.map((id) => ({
    id,
    status: isStepSatisfied(id, s)
      ? "done"
      : overrides[id] === "skipped"
        ? "skipped"
        : "pending",
  }));
}

export interface OnboardingProgress {
  /** Steps genuinely completed. */
  done:     number;
  /** Completed or explicitly skipped — what the "x of y" counter shows. */
  resolved: number;
  total:    number;
  /** 0–100, driven by `resolved`. */
  percent:  number;
  /** Every step resolved. */
  complete: boolean;
}

export function computeProgress(steps: readonly ResolvedStep[]): OnboardingProgress {
  const total    = steps.length;
  const done     = steps.filter((s) => s.status === "done").length;
  const resolved = steps.filter((s) => s.status !== "pending").length;
  return {
    done,
    resolved,
    total,
    percent:  total === 0 ? 100 : Math.round((resolved / total) * 100),
    complete: resolved === total,
  };
}

/** First unresolved step — where the overlay should land on open. */
export function nextStepId(steps: readonly ResolvedStep[]): OnboardingStepId | null {
  return steps.find((s) => s.status === "pending")?.id ?? null;
}

/* ── Logo constraints ────────────────────────────────────────────────────── */

export const LOGO_MAX_BYTES = 4 * 1024 * 1024; // 4 MB
export const LOGO_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "svg"] as const;
export const LOGO_ACCEPT = ".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml";

export function validateLogo(filename: string, sizeBytes: number): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!(LOGO_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Use a PNG, JPG, WEBP or SVG file.";
  }
  if (sizeBytes > LOGO_MAX_BYTES) {
    return `That file is ${(sizeBytes / 1_048_576).toFixed(1)} MB — the limit is 4 MB.`;
  }
  return null;
}
