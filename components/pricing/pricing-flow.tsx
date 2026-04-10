"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";

import logoWhite from "@/app-logo-white.png";
import {
  type BusinessType,
  calculateRecommendation,
  ecssAdditionalAgencyNoticeFee,
  ecssBaseRate,
  ecssIncludedAgencyNotices,
  ecssIncrementAmount,
  formatCurrency,
  formatNumber,
  getStateName,
  usStates,
} from "@/lib/pricing";

type Step = "location" | "company" | "budget" | "recommendation" | "agreement";

type FormState = {
  city: string;
  stateCode: string;
  businessType: BusinessType | "";
  companyName: string;
  employeeCount: string;
  annualRevenue: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  signerTitle: string;
  billingAddress: string;
  billingZip: string;
  cardName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
  acceptsTerms: boolean;
};

const steps: { id: Step; label: string }[] = [
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "budget", label: "Budget" },
  { id: "recommendation", label: "Review" },
  { id: "agreement", label: "Agreement" },
];

const initialForm: FormState = {
  city: "",
  stateCode: "",
  businessType: "",
  companyName: "",
  employeeCount: "",
  annualRevenue: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  signerTitle: "",
  billingAddress: "",
  billingZip: "",
  cardName: "",
  cardNumber: "",
  expiry: "",
  cvc: "",
  acceptsTerms: false,
};

const businessTypeOptions: Array<{
  id: BusinessType;
  label: string;
  description: string;
}> = [
  {
    id: "independent-contractor",
    label: "Independent contractor",
    description: "Mostly owner-led work with no real team yet.",
  },
  {
    id: "startup",
    label: "Startup",
    description: "An early-stage business still building operations.",
  },
  {
    id: "full-business",
    label: "Full business",
    description: "A more established company with a broader operating setup.",
  },
];

const businessTypeLabels: Record<BusinessType, string> = {
  "independent-contractor": "Independent contractor",
  startup: "Startup",
  "full-business": "Full business",
};

const employeePresets = [1, 3, 5, 10, 20];
const revenuePresets = [100_000, 250_000, 500_000, 750_000, 1_000_000, 1_300_000];

function normalizeNumberInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseWholeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInlineNumber(value: string) {
  if (!value) {
    return "";
  }

  return formatNumber(parseWholeNumber(value));
}

function ProgressBar({ step }: { step: Step }) {
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand-red)]">
            {steps[currentIndex].label}
          </span>
        </div>
        <span className="text-[0.72rem] font-medium tabular-nums text-[var(--brand-muted)]">
          {currentIndex + 1} / {steps.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((item, index) => (
          <motion.div
            key={item.id}
            className="h-[3px] flex-1 rounded-full"
            animate={{
              backgroundColor: index <= currentIndex ? "var(--brand-red)" : "var(--brand-line)",
              scaleY: index === currentIndex ? 1.4 : 1,
            }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "center" }}
          />
        ))}
      </div>
    </div>
  );
}

function StepTransition({
  stepKey,
  direction,
  children,
}: {
  stepKey: Step;
  direction: 1 | -1;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial={(d: number) => ({ opacity: 0, x: d * 32, filter: "blur(3px)" })}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={(d: number) => ({ opacity: 0, x: d * -20, filter: "blur(2px)" })}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function StepFrame({
  eyebrow,
  title,
  children,
  note,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--brand-line)] bg-[var(--brand-panel)] px-7 py-9 shadow-[0_2px_8px_rgba(16,24,40,0.04),0_16px_40px_rgba(16,24,40,0.03)] sm:px-12 sm:py-12">
      <div className="inline-flex items-center rounded-full border border-[rgba(214,27,23,0.18)] bg-[var(--brand-red-soft)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--brand-red)]">
        {eyebrow}
      </div>
      <h1 className="mt-5 max-w-3xl text-balance text-[clamp(2.2rem,4.5vw,3.8rem)] leading-[1.04] tracking-[-0.05em] text-[var(--brand-ink)]">
        {title}
      </h1>
      {note ? <p className="mt-4 max-w-2xl text-[0.96rem] leading-7 text-[var(--brand-muted)]">{note}</p> : null}
      <div className="mt-10 space-y-8 sm:mt-12">{children}</div>
    </section>
  );
}

function SentenceRow({
  children,
  note,
}: {
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="max-w-3xl text-[1.22rem] leading-[1.78] text-[var(--brand-ink)] sm:text-[1.68rem] sm:leading-[1.72]">
        {children}
      </div>
      {note ? <div className="pl-1 text-sm leading-7 text-[var(--brand-muted)]">{note}</div> : null}
    </div>
  );
}

function InlineTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mx-2 inline-flex h-11 min-w-[8rem] rounded-[0.85rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] px-4 align-middle text-[1rem] font-medium text-[var(--brand-ink)] transition duration-200 focus:border-[var(--brand-red)] focus:bg-[var(--brand-panel)] focus:shadow-[0_0_0_3px_rgba(214,27,23,0.1)] hover:border-[var(--brand-line-strong)] sm:text-[1.05rem] ${props.className ?? ""}`}
    />
  );
}

function InlineSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mx-2 inline-flex h-11 min-w-[10rem] rounded-[0.85rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] px-4 align-middle text-[1rem] font-medium text-[var(--brand-ink)] transition duration-200 focus:border-[var(--brand-red)] focus:bg-[var(--brand-panel)] focus:shadow-[0_0_0_3px_rgba(214,27,23,0.1)] hover:border-[var(--brand-line-strong)] sm:text-[1.05rem] ${props.className ?? ""}`}
    />
  );
}

function ChoiceRow({
  values,
  selectedValue,
  onSelect,
  formatter,
}: {
  values: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  formatter: (value: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-3">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition duration-200 ${
            selectedValue === value
              ? "border-[rgba(214,27,23,0.2)] bg-[var(--brand-red-soft)] text-[var(--brand-red)] shadow-[0_0_0_2px_rgba(214,27,23,0.08)]"
              : "border-[var(--brand-line)] bg-[var(--brand-panel)] text-[var(--brand-muted)] hover:border-[var(--brand-line-strong)] hover:text-[var(--brand-ink)]"
          }`}
        >
          {formatter(value)}
        </button>
      ))}
    </div>
  );
}

function BusinessTypePicker({
  selectedValue,
  onSelect,
}: {
  selectedValue: BusinessType | "";
  onSelect: (value: BusinessType) => void;
}) {
  return (
    <div className="grid gap-3 pt-2 sm:grid-cols-3">
      {businessTypeOptions.map((option) => {
        const selected = selectedValue === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`group relative rounded-[1.1rem] border p-4 text-left transition duration-200 sm:p-5 ${
              selected
                ? "border-[rgba(214,27,23,0.22)] bg-[var(--brand-panel)] shadow-[0_0_0_3px_rgba(214,27,23,0.09),0_8px_20px_rgba(214,27,23,0.06)]"
                : "border-[var(--brand-line)] bg-[var(--brand-panel)] hover:border-[var(--brand-line-strong)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.04)]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className={`text-sm font-semibold ${
                  selected ? "text-[var(--brand-red)]" : "text-[var(--brand-ink)]"
                }`}
              >
                {option.label}
              </div>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition duration-200 ${
                  selected
                    ? "border-[var(--brand-red)] bg-[var(--brand-red)]"
                    : "border-[var(--brand-line)] bg-transparent group-hover:border-[var(--brand-line-strong)]"
                }`}
              >
                {selected ? (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </span>
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              {option.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-[var(--brand-ink)]">{label}</div>
      {children}
    </label>
  );
}

function DetailInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-[0.75rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] px-4 text-sm text-[var(--brand-ink)] transition duration-200 focus:border-[var(--brand-red)] focus:bg-[var(--brand-panel)] focus:shadow-[0_0_0_3px_rgba(214,27,23,0.09)] hover:border-[var(--brand-line-strong)] ${props.className ?? ""}`}
    />
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-[var(--brand-line)] py-3 text-sm last:border-b-0">
      <span className="text-[var(--brand-muted)]">{label}</span>
      <span className={strong ? "font-semibold text-[var(--brand-ink)]" : "text-[var(--brand-ink)]"}>
        {value}
      </span>
    </div>
  );
}

function PrimaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-red)] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(214,27,23,0.2)] transition duration-200 hover:-translate-y-px hover:bg-[var(--brand-red-deep)] hover:shadow-[0_12px_28px_rgba(214,27,23,0.26)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </button>
  );
}

function SecondaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--brand-line)] bg-[var(--brand-panel)] px-6 text-sm font-semibold text-[var(--brand-ink)] transition duration-200 hover:-translate-y-px hover:border-[var(--brand-line-strong)] hover:bg-[var(--brand-panel-muted)] active:translate-y-0 ${className ?? ""}`}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      {children}
    </button>
  );
}

export function PricingFlow() {
  const [step, setStep] = useState<Step>("location");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [form, setForm] = useState<FormState>(initialForm);

  const selectedBusinessType: BusinessType = form.businessType || "startup";
  const employeeCount =
    form.businessType === "independent-contractor"
      ? 1
      : parseWholeNumber(form.employeeCount);
  const annualRevenue = parseWholeNumber(form.annualRevenue);

  const recommendation = useMemo(
    () =>
      calculateRecommendation({
        businessType: selectedBusinessType,
        stateCode: form.stateCode,
        city: form.city,
        employeeCount,
        annualRevenue,
      }),
    [annualRevenue, employeeCount, form.city, form.stateCode, selectedBusinessType],
  );

  const companyName =
    form.companyName.trim() ||
    (form.businessType === "independent-contractor" ? "Your practice" : "Your business");
  const agreementDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const continuityParts = [
    form.city.trim() && form.stateCode ? `${form.city.trim()}, ${getStateName(form.stateCode)}` : "",
    form.businessType ? businessTypeLabels[selectedBusinessType] : "",
    form.businessType !== "independent-contractor" && employeeCount > 0
      ? `${formatNumber(employeeCount)} ${employeeCount === 1 ? "person" : "people"}`
      : "",
    annualRevenue > 0 ? formatCurrency(annualRevenue) : "",
  ].filter(Boolean);

  const continuityLabel =
    continuityParts.length > 0
      ? continuityParts.join("  -  ")
      : "A few quick questions to tailor your monthly support estimate.";

  const canContinue = {
    location: Boolean(form.city.trim() && form.stateCode),
    company: Boolean(
      form.businessType &&
        (form.businessType === "independent-contractor" ||
          (form.companyName.trim() && employeeCount > 0)),
    ),
    budget: annualRevenue > 0,
    recommendation: true,
    agreement: Boolean(
      form.contactName.trim() &&
        form.contactEmail.trim() &&
        form.contactPhone.trim() &&
        form.signerTitle.trim() &&
        form.billingAddress.trim() &&
        form.billingZip.trim() &&
        form.cardName.trim() &&
        form.cardNumber.trim() &&
        form.expiry.trim() &&
        form.cvc.trim() &&
        form.acceptsTerms,
    ),
  };

  const nextStep = () => {
    setDirection(1);
    if (step === "location" && canContinue.location) setStep("company");
    if (step === "company" && canContinue.company) setStep("budget");
    if (step === "budget" && canContinue.budget) setStep("recommendation");
    if (step === "recommendation") setStep("agreement");
  };

  const previousStep = () => {
    setDirection(-1);
    if (step === "company") setStep("location");
    if (step === "budget") setStep("company");
    if (step === "recommendation") setStep("budget");
    if (step === "agreement") setStep("recommendation");
  };

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const selectBusinessType = (value: BusinessType) => {
    setForm((current) => ({
      ...current,
      businessType: value,
      companyName: value === "independent-contractor" ? "" : current.companyName,
      employeeCount: value === "independent-contractor" ? "" : current.employeeCount,
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <header className="sticky top-0 z-20 border-b border-[var(--brand-line)] bg-[rgba(var(--page-bg-raw,255,255,255),0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-[1rem] bg-[var(--brand-red)] px-3.5 py-2.5">
              <Image src={logoWhite} alt="Sparing Consulting" className="h-5 w-auto" priority />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--brand-ink)]">Sparing Monthly Fit</div>
              <div className="text-xs text-[var(--brand-muted)]">A simple guided estimate</div>
            </div>
          </div>
          <div className="hidden text-xs font-medium tabular-nums text-[var(--brand-muted)] sm:block">
            Step {steps.findIndex((item) => item.id === step) + 1} of {steps.length}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <ProgressBar step={step} />

        <div className="mt-6 max-w-3xl text-sm leading-8 text-[var(--brand-muted)]">
          {continuityLabel}
        </div>

        <div className="mt-12 max-w-4xl">
          <StepTransition stepKey={step} direction={direction}>
            {step === "location" ? (
              <StepFrame
                eyebrow="Location"
                title="Where is your business based?"
                note="We use your city and state to set the right operating context for your estimate."
              >
                <SentenceRow>
                  My business is based in
                  <InlineTextInput
                    value={form.city}
                    onChange={(event) => updateField("city", event.target.value)}
                    placeholder="city"
                    className="min-w-[10rem] sm:min-w-[12rem]"
                  />
                  ,
                  <InlineSelect
                    value={form.stateCode}
                    onChange={(event) => updateField("stateCode", event.target.value)}
                  >
                    <option value="">state</option>
                    {usStates.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </InlineSelect>
                  .
                </SentenceRow>
              </StepFrame>
            ) : null}

            {step === "company" ? (
              <StepFrame
                eyebrow="Company"
                title={
                  !form.businessType
                    ? "First, which of these feels closest to you?"
                    : form.businessType === "independent-contractor"
                      ? "Perfect. We’ll keep this one simple."
                      : "Great. Let’s get a couple more company details."
                }
                note={
                  !form.businessType
                    ? "This helps us shape the next questions without making you fill unnecessary fields."
                    : form.businessType === "independent-contractor"
                      ? "Independent contractor estimates skip straight to revenue after this."
                      : "For startups and full businesses, we use the name and team size to shape the recommendation."
                }
              >
                {!form.businessType ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.24 }}
                  >
                    <BusinessTypePicker
                      selectedValue={form.businessType}
                      onSelect={selectBusinessType}
                    />
                  </motion.div>
                ) : null}

                {form.businessType === "independent-contractor" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-6"
                  >
                    <SentenceRow>
                      You&apos;re operating more as an
                      <span className="mx-2 inline-flex rounded-full border border-[rgba(214,27,23,0.14)] bg-[var(--brand-red-soft)] px-4 py-2 text-[0.95em] font-medium text-[var(--brand-red)]">
                        independent contractor
                      </span>
                      .
                    </SentenceRow>
                    <button
                      type="button"
                      onClick={() => updateField("businessType", "")}
                      className="text-sm font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-ink)]"
                    >
                      Change selection
                    </button>
                  </motion.div>
                ) : null}

                {form.businessType === "startup" || form.businessType === "full-business" ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.24 }}
                    className="space-y-10"
                  >
                    <SentenceRow>
                      My business is
                      <InlineTextInput
                        value={form.companyName}
                        onChange={(event) => updateField("companyName", event.target.value)}
                        placeholder="company name"
                        className="min-w-[14rem] sm:min-w-[18rem]"
                      />
                      .
                    </SentenceRow>

                    <div className="space-y-3">
                      <SentenceRow>
                        We have about
                        <InlineTextInput
                          inputMode="numeric"
                          value={form.employeeCount}
                          onChange={(event) =>
                            updateField("employeeCount", normalizeNumberInput(event.target.value))
                          }
                          placeholder="0"
                          className="min-w-[6rem]"
                        />
                        people.
                      </SentenceRow>
                      <p className="pl-1 text-[0.82rem] text-[var(--brand-muted)]">Estimate is fine.</p>
                      <ChoiceRow
                        values={employeePresets}
                        selectedValue={employeeCount}
                        onSelect={(value) => updateField("employeeCount", String(value))}
                        formatter={(value) => `${value} ${value === 1 ? "person" : "people"}`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => updateField("businessType", "")}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                      </svg>
                      Change type
                    </button>
                  </motion.div>
                ) : null}
              </StepFrame>
            ) : null}

            {step === "budget" ? (
              <StepFrame
                eyebrow="Budget"
                title="Last piece. What revenue are you planning around?"
                note="We use annual revenue as the base for your monthly support estimate."
              >
                <div className="space-y-3">
                  <SentenceRow>
                    My business brings in about $
                    <InlineTextInput
                      inputMode="numeric"
                      value={formatInlineNumber(form.annualRevenue)}
                      onChange={(event) =>
                        updateField("annualRevenue", normalizeNumberInput(event.target.value))
                      }
                      placeholder="annual revenue"
                      className="min-w-[12rem] sm:min-w-[14rem]"
                    />
                    per year.
                  </SentenceRow>
                  <p className="pl-1 text-[0.82rem] text-[var(--brand-muted)]">Annual revenue — estimate is fine.</p>
                  <ChoiceRow
                    values={revenuePresets}
                    selectedValue={annualRevenue}
                    onSelect={(value) => updateField("annualRevenue", String(value))}
                    formatter={(value) => formatCurrency(value)}
                  />
                </div>
              </StepFrame>
            ) : null}

            {step === "recommendation" ? (
              <StepFrame
                eyebrow="Recommendation"
                title={`Here's what monthly support looks like for ${companyName}.`}
                note={recommendation.summary}
              >
                <div className="grid gap-12 border-t border-[var(--brand-line)] pt-10 sm:grid-cols-[minmax(0,1fr)_18rem]">
                  <div>
                    <div className="text-sm text-[var(--brand-muted)]">Recommended monthly support</div>
                    <div className="mt-3 text-[clamp(3.5rem,7vw,6rem)] font-semibold leading-none tracking-[-0.07em] text-[var(--brand-ink)]">
                      {formatCurrency(recommendation.monthlyPrice)}
                    </div>
                    <div className="mt-2 text-base text-[var(--brand-muted)]">per month</div>
                    <div className="mt-10 max-w-xl text-[1.3rem] leading-8 text-[var(--brand-ink)]">
                      {recommendation.publicPlanName}
                    </div>
                    <div className="mt-4 max-w-xl text-base leading-8 text-[var(--brand-muted)]">
                      {recommendation.audienceLabel}
                    </div>
                  </div>

                  <div className="border-t border-[var(--brand-line)] pt-8 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
                    <SummaryRow label="Location" value={form.city && form.stateCode ? `${form.city}, ${getStateName(form.stateCode)}` : "Pending"} />
                    <SummaryRow label="Employees" value={employeeCount > 0 ? formatNumber(employeeCount) : "Pending"} />
                    <SummaryRow label="Revenue" value={annualRevenue > 0 ? formatCurrency(annualRevenue) : "Pending"} />
                    <SummaryRow label="Revenue tier" value={recommendation.tierLabel} />
                  </div>
                </div>

                <div className="grid gap-5 border-t border-[var(--brand-line)] pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
                  <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-7">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                      What's included
                    </div>
                    <div className="mt-5 space-y-4">
                      {recommendation.included.map((item) => (
                        <div key={item} className="flex gap-3 text-base leading-7 text-[var(--brand-muted)]">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-red)]" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-7">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                      Breakdown
                    </div>
                    <div className="mt-5">
                      <SummaryRow label="Revenue-based pricing" value={formatCurrency(recommendation.revenuePrice)} />
                      <SummaryRow label="Team scope" value={formatCurrency(recommendation.employeePrice)} />
                      <SummaryRow label="Location context" value={formatCurrency(recommendation.locationPrice)} />
                      <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} strong />
                    </div>
                    <div className="mt-6 text-sm leading-7 text-[var(--brand-muted)]">
                      Base pricing starts at {formatCurrency(ecssBaseRate)} per month, adds {formatCurrency(ecssIncrementAmount)} per extra $50K in revenue, and includes {ecssIncludedAgencyNotices} agency notices each month. Additional notices are {formatCurrency(ecssAdditionalAgencyNoticeFee)} each.
                    </div>
                  </div>
                </div>

              </StepFrame>
            ) : null}

            {step === "agreement" ? (
              <StepFrame
                eyebrow="Agreement"
                title="Let’s finalize the details before payment."
                note="We’ll use this information to generate the agreement summary and connect payment."
              >
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
                  <div className="space-y-8">
                    <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6 sm:p-7">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                        Contact details
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <DetailField label="Full name">
                          <DetailInput
                            value={form.contactName}
                            onChange={(event) => updateField("contactName", event.target.value)}
                            placeholder="Your full name"
                          />
                        </DetailField>
                        <DetailField label="Signer title">
                          <DetailInput
                            value={form.signerTitle}
                            onChange={(event) => updateField("signerTitle", event.target.value)}
                            placeholder="Founder, Owner, CEO"
                          />
                        </DetailField>
                        <DetailField label="Email">
                          <DetailInput
                            type="email"
                            value={form.contactEmail}
                            onChange={(event) => updateField("contactEmail", event.target.value)}
                            placeholder="name@company.com"
                          />
                        </DetailField>
                        <DetailField label="Phone">
                          <DetailInput
                            value={form.contactPhone}
                            onChange={(event) => updateField("contactPhone", event.target.value)}
                            placeholder="(555) 000-0000"
                          />
                        </DetailField>
                        <div className="sm:col-span-2">
                          <DetailField label="Billing address">
                            <DetailInput
                              value={form.billingAddress}
                              onChange={(event) => updateField("billingAddress", event.target.value)}
                              placeholder="Street address"
                            />
                          </DetailField>
                        </div>
                        <DetailField label="Billing ZIP">
                          <DetailInput
                            value={form.billingZip}
                            onChange={(event) => updateField("billingZip", event.target.value)}
                            placeholder="ZIP code"
                          />
                        </DetailField>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6 sm:p-7">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                          Payment details
                        </div>
                        <div className="rounded-full border border-[var(--brand-line)] bg-white px-3 py-1 text-xs font-medium text-[var(--brand-muted)]">
                          Stripe-style entry
                        </div>
                      </div>
                      <div className="mt-5 grid gap-4">
                        <DetailField label="Name on card">
                          <DetailInput
                            value={form.cardName}
                            onChange={(event) => updateField("cardName", event.target.value)}
                            placeholder="Cardholder name"
                          />
                        </DetailField>
                        <DetailField label="Card number">
                          <DetailInput
                            value={form.cardNumber}
                            onChange={(event) => updateField("cardNumber", event.target.value)}
                            placeholder="1234 1234 1234 1234"
                            inputMode="numeric"
                          />
                        </DetailField>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <DetailField label="Expiry">
                            <DetailInput
                              value={form.expiry}
                              onChange={(event) => updateField("expiry", event.target.value)}
                              placeholder="MM / YY"
                            />
                          </DetailField>
                          <DetailField label="CVC">
                            <DetailInput
                              value={form.cvc}
                              onChange={(event) => updateField("cvc", event.target.value)}
                              placeholder="CVC"
                              inputMode="numeric"
                            />
                          </DetailField>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-[var(--brand-line)] bg-white p-6 sm:p-7">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                        Agreement summary
                      </div>
                      <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--brand-muted)]">
                        <p>
                          This agreement is prepared on {agreementDate} between Sparing Consulting and{" "}
                          <span className="font-medium text-[var(--brand-ink)]">{companyName}</span>.
                        </p>
                        <p>
                          The client contact is{" "}
                          <span className="font-medium text-[var(--brand-ink)]">
                            {form.contactName || "pending signer"}
                          </span>
                          {form.signerTitle ? `, ${form.signerTitle}` : ""}.
                        </p>
                        <p>
                          Service will begin for a business operating in{" "}
                          <span className="font-medium text-[var(--brand-ink)]">
                            {form.city && form.stateCode
                              ? `${form.city}, ${getStateName(form.stateCode)}`
                              : "pending location"}
                          </span>
                          , with support aligned to the current intake responses.
                        </p>
                        <p>
                          Monthly service pricing is{" "}
                          <span className="font-medium text-[var(--brand-ink)]">
                            {formatCurrency(recommendation.monthlyPrice)}
                          </span>
                          , covering the current recommendation and included support scope.
                        </p>
                      </div>
                      <div className="mt-6 border-t border-[var(--brand-line)] pt-5">
                        <SummaryRow label="Plan" value={recommendation.publicPlanName} />
                        <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} strong />
                        <SummaryRow label="Revenue tier" value={recommendation.tierLabel} />
                      </div>
                    </div>

                    <label className="flex gap-3 rounded-[1.25rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-5 text-sm leading-7 text-[var(--brand-muted)]">
                      <input
                        type="checkbox"
                        checked={form.acceptsTerms}
                        onChange={(event) => updateField("acceptsTerms", event.target.checked)}
                        className="mt-1 h-4 w-4 accent-[var(--brand-red)]"
                      />
                      <span>
                        I have reviewed the agreement summary, confirm the information entered is correct, and accept the terms so I can proceed to payment.
                      </span>
                    </label>
                  </div>
                </div>
              </StepFrame>
            ) : null}
          </StepTransition>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {step !== "location" ? <SecondaryButton onClick={previousStep}>Back</SecondaryButton> : null}
            {step !== "agreement" ? (
              <PrimaryButton onClick={nextStep} disabled={!canContinue[step]}>
                {step === "location"
                  ? "Continue"
                  : step === "company"
                    ? "Continue"
                    : step === "budget"
                      ? "See my plan"
                      : "Continue"}
              </PrimaryButton>
            ) : (
              <PrimaryButton disabled={!canContinue.agreement}>
                Confirm &amp; proceed to payment
              </PrimaryButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
