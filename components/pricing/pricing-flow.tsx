"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import logoColor from "@/app-logo-color.png";
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

const stepVariants = {
  initial: (d: number) => ({ opacity: 0, x: d * 32, filter: "blur(3px)" }),
  animate: { opacity: 1, x: 0, filter: "blur(0px)" },
  exit: (d: number) => ({ opacity: 0, x: d * -20, filter: "blur(2px)" }),
};

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
        variants={stepVariants}
        initial="initial"
        animate="animate"
        exit="exit"
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
    <section className="py-2">
      <h1 className="max-w-xl text-balance text-[1.6rem] font-semibold leading-[1.2] tracking-[-0.03em] text-[var(--brand-ink)] sm:text-[1.9rem]">
        {title}
      </h1>
      {note ? <p className="mt-3 max-w-lg text-[0.9rem] leading-6 text-[var(--brand-muted)]">{note}</p> : null}
      <div className="mt-8 space-y-8">{children}</div>
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
    <div className="grid gap-4 sm:grid-cols-3">
      {businessTypeOptions.map((option, index) => {
        const selected = selectedValue === option.id;

        return (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            initial={{ opacity: 0, y: 18 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: selected ? [1, 1.04, 0.99, 1] : 1,
              boxShadow: selected
                ? "0 0 0 3px rgba(214,27,23,0.12), 0 12px 28px rgba(214,27,23,0.08)"
                : "0 0 0 0px rgba(214,27,23,0), 0 2px 8px rgba(0,0,0,0.04)",
            }}
            transition={{
              opacity: { delay: index * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
              y: { delay: index * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] },
              scale: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
              boxShadow: { duration: 0.3 },
            }}
            whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className={`group relative rounded-[1.2rem] border p-5 text-left ${
              selected
                ? "border-[rgba(214,27,23,0.22)] bg-white"
                : "border-[var(--brand-line)] bg-white hover:border-[var(--brand-line-strong)]"
            }`}
          >
            {/* Animated radio indicator */}
            <div className="flex items-start justify-between gap-3">
              <motion.span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                animate={{
                  backgroundColor: selected ? "rgb(214,27,23)" : "transparent",
                  borderColor: selected ? "rgb(214,27,23)" : "rgb(235,236,239)",
                  scale: selected ? [1, 1.35, 1] : 1,
                }}
                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                style={{ border: "1.5px solid" }}
              >
                <AnimatePresence>
                  {selected ? (
                    <motion.svg
                      key="check"
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3.5}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                      />
                    </motion.svg>
                  ) : null}
                </AnimatePresence>
              </motion.span>
            </div>

            {/* Label */}
            <motion.div
              className="mt-4 text-[0.92rem] font-semibold"
              animate={{ color: selected ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
              transition={{ duration: 0.2 }}
            >
              {option.label}
            </motion.div>

            {/* Description */}
            <div className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              {option.description}
            </div>
          </motion.button>
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
      className={`h-12 w-full rounded-[0.85rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] px-4 text-[0.95rem] text-[var(--brand-ink)] transition duration-200 focus:border-[var(--brand-red)] focus:bg-[var(--brand-panel)] focus:shadow-[0_0_0_3px_rgba(214,27,23,0.09)] hover:border-[var(--brand-line-strong)] ${props.className ?? ""}`}
    />
  );
}

function DetailSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-12 w-full rounded-[0.85rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] px-4 text-[0.95rem] text-[var(--brand-ink)] transition duration-200 focus:border-[var(--brand-red)] focus:bg-[var(--brand-panel)] focus:shadow-[0_0_0_3px_rgba(214,27,23,0.09)] hover:border-[var(--brand-line-strong)] ${props.className ?? ""}`}
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

function AnimatedPrice({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [value, motionValue]);

  return <span>{formatCurrency(display)}</span>;
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
      ? continuityParts.join(" · ")
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

  const cardWidth =
    step === "agreement"
      ? "max-w-4xl"
      : step === "recommendation"
        ? "max-w-4xl"
        : step === "company"
          ? "max-w-2xl"
          : "max-w-lg";

  const ctaLabel =
    step === "budget"
      ? "See my plan"
      : step === "agreement"
        ? "Confirm & start my plan"
        : "Continue";

  return (
    <div className="min-h-screen bg-[#f2f2f4]">

      {/* ── Header — dark, matching sparingconsulting.com ── */}
      <header className="sticky top-0 z-20 bg-[#171717]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 lg:px-10">
          <Image src={logoWhite} alt="Sparing Consulting" className="h-6 w-auto" priority />
          <span className="text-xs font-medium tracking-widest text-white/40 uppercase">
            Monthly Fit Estimate
          </span>
        </div>
      </header>

      {/* Centered card */}
      <div className={`mx-auto w-full px-5 pb-20 pt-12 ${cardWidth}`}>
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04),0_24px_56px_rgba(0,0,0,0.08)]">

          {/* Progress inside card */}
          <div className="px-10 pt-9">
            <ProgressBar step={step} />
          </div>

          {/* Step content */}
          <div className="px-10 py-10">
            <StepTransition stepKey={step} direction={direction}>

              {/* ── Location ── */}
              {step === "location" ? (
                <>
                  <h2 className="text-[1.5rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--brand-ink)]">
                    Where is your business based?
                  </h2>
                  <div className="mt-8 space-y-5">
                    <DetailField label="City">
                      <DetailInput
                        value={form.city}
                        onChange={(event) => updateField("city", event.target.value)}
                        placeholder="e.g. Austin"
                        autoFocus
                      />
                    </DetailField>
                    <DetailField label="State">
                      <DetailSelect
                        value={form.stateCode}
                        onChange={(event) => updateField("stateCode", event.target.value)}
                      >
                        <option value="">Select a state</option>
                        {usStates.map((state) => (
                          <option key={state.code} value={state.code}>{state.name}</option>
                        ))}
                      </DetailSelect>
                    </DetailField>
                  </div>
                </>
              ) : null}

              {/* ── Company ── */}
              {step === "company" ? (
                <>
                  <h2 className="text-[1.5rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--brand-ink)]">
                    {!form.businessType
                      ? "Which best describes your business?"
                      : form.businessType === "independent-contractor"
                        ? "Got it, keeping it simple."
                        : "A couple more details."}
                  </h2>
                  {!form.businessType ? (
                    <p className="mt-3 text-sm text-[var(--brand-muted)]">
                      This shapes the questions we ask next.
                    </p>
                  ) : null}
                  <div className="mt-8">
                    {!form.businessType ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
                        <BusinessTypePicker selectedValue={form.businessType} onSelect={selectBusinessType} />
                      </motion.div>
                    ) : null}

                    {form.businessType === "independent-contractor" ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-5">
                        <div className="rounded-[0.75rem] border border-[rgba(214,27,23,0.16)] bg-[var(--brand-red-soft)] px-4 py-3 text-sm font-medium text-[var(--brand-red)]">
                          Independent contractor
                        </div>
                        <button
                          type="button"
                          onClick={() => updateField("businessType", "")}
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                          </svg>
                          Change type
                        </button>
                      </motion.div>
                    ) : null}

                    {form.businessType === "startup" || form.businessType === "full-business" ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-6">
                        <DetailField label="Business name">
                          <DetailInput
                            value={form.companyName}
                            onChange={(event) => updateField("companyName", event.target.value)}
                            placeholder="e.g. Acme Corp"
                            autoFocus
                          />
                        </DetailField>
                        <div className="space-y-3">
                          <DetailField label="Team size">
                            <DetailInput
                              inputMode="numeric"
                              value={form.employeeCount}
                              onChange={(event) => updateField("employeeCount", normalizeNumberInput(event.target.value))}
                              placeholder="Number of people"
                            />
                          </DetailField>
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
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                          </svg>
                          Change type
                        </button>
                      </motion.div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {/* ── Budget ── */}
              {step === "budget" ? (
                <>
                  <h2 className="text-[1.5rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--brand-ink)]">
                    What&apos;s your annual revenue?
                  </h2>
                  <p className="mt-3 text-sm text-[var(--brand-muted)]">Estimate is fine.</p>
                  <div className="mt-8 space-y-4">
                    <DetailField label="Annual revenue">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--brand-muted)]">$</span>
                        <DetailInput
                          inputMode="numeric"
                          value={formatInlineNumber(form.annualRevenue)}
                          onChange={(event) => updateField("annualRevenue", normalizeNumberInput(event.target.value))}
                          placeholder="0"
                          className="pl-8"
                          autoFocus
                        />
                      </div>
                    </DetailField>
                    <ChoiceRow
                      values={revenuePresets}
                      selectedValue={annualRevenue}
                      onSelect={(value) => updateField("annualRevenue", String(value))}
                      formatter={(value) => formatCurrency(value)}
                    />
                  </div>
                </>
              ) : null}

              {/* ── Recommendation ── */}
              {step === "recommendation" ? (
                <>
                  {/* Dark hero — bleeds to card edges */}
                  <motion.div
                    className="-mx-10 -mt-10 mb-10 px-10 py-12"
                    style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Plan badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(214,27,23,0.4)] bg-[rgba(214,27,23,0.15)] px-3 py-1"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
                        {recommendation.publicPlanName}
                      </span>
                    </motion.div>

                    {/* Price */}
                    <motion.div
                      className="mt-5 text-[clamp(3.5rem,7vw,6rem)] font-bold leading-none tracking-[-0.06em] text-white"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <AnimatedPrice value={recommendation.monthlyPrice} />
                    </motion.div>

                    <motion.div
                      className="mt-2 text-sm text-white/50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      per month
                    </motion.div>

                    <motion.p
                      className="mt-5 max-w-xl text-sm leading-6 text-white/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.4 }}
                    >
                      {recommendation.summary}
                    </motion.p>

                    {/* Context chips */}
                    <motion.div
                      className="mt-7 flex flex-wrap gap-2"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.4 }}
                    >
                      {[
                        form.city && form.stateCode ? `${form.city}, ${getStateName(form.stateCode)}` : null,
                        employeeCount > 0 ? `${formatNumber(employeeCount)} ${employeeCount === 1 ? "person" : "people"}` : null,
                        annualRevenue > 0 ? formatCurrency(annualRevenue) + " revenue" : null,
                        recommendation.tierLabel,
                      ].filter(Boolean).map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/60"
                        >
                          {chip}
                        </span>
                      ))}
                    </motion.div>
                  </motion.div>

                  {/* Bottom two-column section */}
                  <div className="grid gap-5 lg:grid-cols-2">
                    {/* What's included */}
                    <motion.div
                      className="rounded-[1.1rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                        What&apos;s included
                      </div>
                      <div className="mt-5 space-y-3">
                        {recommendation.included.map((item, i) => (
                          <motion.div
                            key={item}
                            className="flex items-start gap-3 text-sm leading-6 text-[var(--brand-muted)]"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.65 + i * 0.07, duration: 0.3 }}
                          >
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{item}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Breakdown */}
                    <motion.div
                      className="rounded-[1.1rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                        Breakdown
                      </div>

                      {/* Visual proportion bar */}
                      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-[var(--brand-line)]">
                        {[
                          { value: recommendation.revenuePrice, opacity: "1" },
                          { value: recommendation.employeePrice, opacity: "0.5" },
                          { value: recommendation.locationPrice, opacity: "0.28" },
                        ].filter(s => s.value > 0).map((segment, i) => (
                          <motion.div
                            key={i}
                            className="h-full bg-[var(--brand-red)]"
                            style={{ opacity: segment.opacity }}
                            initial={{ width: 0 }}
                            animate={{ width: `${(segment.value / recommendation.monthlyPrice) * 100}%` }}
                            transition={{ delay: 0.75 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                          />
                        ))}
                      </div>

                      <div className="mt-5">
                        <SummaryRow label="Revenue-based" value={formatCurrency(recommendation.revenuePrice)} />
                        <SummaryRow label="Team scope" value={formatCurrency(recommendation.employeePrice)} />
                        <SummaryRow label="Location" value={formatCurrency(recommendation.locationPrice)} />
                        <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} strong />
                      </div>
                      <p className="mt-4 text-xs leading-5 text-[var(--brand-muted)]">
                        Base {formatCurrency(ecssBaseRate)}/mo, +{formatCurrency(ecssIncrementAmount)} per $50K revenue. Includes {ecssIncludedAgencyNotices} agency notices; additional at {formatCurrency(ecssAdditionalAgencyNoticeFee)} each.
                      </p>
                    </motion.div>
                  </div>
                </>
              ) : null}

              {/* ── Agreement ── */}
              {step === "agreement" ? (
                <>
                  {/* Dark context strip — full-bleed */}
                  <motion.div
                    className="-mx-10 -mt-10 mb-9 flex flex-wrap items-center justify-between gap-4 px-10 py-5"
                    style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(214,27,23,0.4)] bg-[rgba(214,27,23,0.15)] px-3 py-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
                          {recommendation.publicPlanName}
                        </span>
                      </span>
                      <span className="text-sm text-white/50">{companyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <span className="text-base font-bold text-white">
                        {formatCurrency(recommendation.monthlyPrice)}
                        <span className="ml-0.5 text-xs font-normal text-white/50">/mo</span>
                      </span>
                    </div>
                  </motion.div>

                  {/* Two-column layout */}
                  <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">

                    {/* LEFT — three numbered sections */}
                    <div>

                      {/* ① Your details */}
                      <div className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-ink)] text-xs font-bold text-[var(--page-bg)]">1</div>
                          <div className="mt-2 w-px flex-1 bg-[var(--brand-line)]" />
                        </div>
                        <div className="min-w-0 flex-1 pb-9">
                          <div className="mb-5 text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Your details</div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <DetailField label="Full name">
                              <DetailInput value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="Your full name" autoFocus />
                            </DetailField>
                            <DetailField label="Title">
                              <DetailInput value={form.signerTitle} onChange={(e) => updateField("signerTitle", e.target.value)} placeholder="Founder, Owner, CEO" />
                            </DetailField>
                            <DetailField label="Email">
                              <DetailInput type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} placeholder="name@company.com" />
                            </DetailField>
                            <DetailField label="Phone">
                              <DetailInput value={form.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} placeholder="(555) 000-0000" />
                            </DetailField>
                          </div>
                        </div>
                      </div>

                      {/* ② Billing */}
                      <div className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-ink)] text-xs font-bold text-[var(--page-bg)]">2</div>
                          <div className="mt-2 w-px flex-1 bg-[var(--brand-line)]" />
                        </div>
                        <div className="min-w-0 flex-1 pb-9">
                          <div className="mb-5 text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Billing</div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <DetailField label="Billing address">
                                <DetailInput value={form.billingAddress} onChange={(e) => updateField("billingAddress", e.target.value)} placeholder="Street address" />
                              </DetailField>
                            </div>
                            <DetailField label="ZIP code">
                              <DetailInput value={form.billingZip} onChange={(e) => updateField("billingZip", e.target.value)} placeholder="ZIP code" inputMode="numeric" />
                            </DetailField>
                          </div>
                        </div>
                      </div>

                      {/* ③ Payment */}
                      <div className="flex gap-5">
                        <div className="flex flex-col items-center">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-ink)] text-xs font-bold text-[var(--page-bg)]">3</div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-5 flex items-center justify-between gap-3">
                            <span className="text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Payment</span>
                            {/* Card brand icons */}
                            <div className="flex items-center gap-1.5">
                              <svg viewBox="0 0 38 24" className="h-5 w-auto rounded" aria-label="Visa">
                                <rect width="38" height="24" rx="3" fill="#1A1F71"/>
                                <text x="19" y="16.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">VISA</text>
                              </svg>
                              <svg viewBox="0 0 38 24" className="h-5 w-auto rounded" aria-label="Mastercard">
                                <rect width="38" height="24" rx="3" fill="#252525"/>
                                <circle cx="15" cy="12" r="7" fill="#EB001B"/>
                                <circle cx="23" cy="12" r="7" fill="#F79E1B"/>
                                <path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/>
                              </svg>
                              <svg viewBox="0 0 38 24" className="h-5 w-auto rounded" aria-label="Amex">
                                <rect width="38" height="24" rx="3" fill="#007BC1"/>
                                <text x="19" y="16" textAnchor="middle" fill="white" fontSize="8.5" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
                              </svg>
                            </div>
                          </div>
                          <div className="grid gap-4">
                            <DetailField label="Name on card">
                              <DetailInput value={form.cardName} onChange={(e) => updateField("cardName", e.target.value)} placeholder="Cardholder name" />
                            </DetailField>
                            <DetailField label="Card number">
                              <DetailInput value={form.cardNumber} onChange={(e) => updateField("cardNumber", e.target.value)} placeholder="1234 1234 1234 1234" inputMode="numeric" />
                            </DetailField>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <DetailField label="Expiry">
                                <DetailInput value={form.expiry} onChange={(e) => updateField("expiry", e.target.value)} placeholder="MM / YY" />
                              </DetailField>
                              <DetailField label="CVC">
                                <DetailInput value={form.cvc} onChange={(e) => updateField("cvc", e.target.value)} placeholder="CVC" inputMode="numeric" />
                              </DetailField>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--brand-muted)]">
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Secured with 256-bit encryption
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT — sticky order summary */}
                    <div className="lg:sticky lg:top-28 lg:self-start">
                      <div className="rounded-[1.25rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">Order summary</div>

                        {/* Company + plan badge */}
                        <div className="mt-4">
                          <div className="text-sm font-medium text-[var(--brand-ink)]">{companyName}</div>
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(214,27,23,0.2)] bg-[var(--brand-red-soft)] px-2.5 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">{recommendation.publicPlanName}</span>
                          </div>
                        </div>

                        {/* Large price */}
                        <div className="mt-5 border-t border-[var(--brand-line)] pt-5">
                          <div className="text-[2.4rem] font-bold leading-none tracking-[-0.04em] text-[var(--brand-ink)]">
                            {formatCurrency(recommendation.monthlyPrice)}
                          </div>
                          <div className="mt-1.5 text-xs text-[var(--brand-muted)]">billed monthly · cancel anytime</div>
                        </div>

                        {/* Line items */}
                        <div className="mt-5">
                          <SummaryRow label="Revenue-based" value={formatCurrency(recommendation.revenuePrice)} />
                          <SummaryRow label="Team scope" value={formatCurrency(recommendation.employeePrice)} />
                          <SummaryRow label="Location" value={formatCurrency(recommendation.locationPrice)} />
                          <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} strong />
                        </div>

                        {/* Trust block */}
                        <div className="mt-5 flex items-center gap-2 rounded-[0.7rem] border border-[var(--brand-line)] bg-[var(--brand-panel)] px-3 py-2.5 text-xs text-[var(--brand-muted)]">
                          <svg className="h-3.5 w-3.5 shrink-0 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          No long-term contract · Cancel anytime
                        </div>
                      </div>

                      {/* Custom animated authorisation checkbox */}
                      <label
                        className={`mt-4 flex cursor-pointer items-start gap-3 rounded-[1rem] border p-4 transition-colors duration-300 ${
                          form.acceptsTerms
                            ? "border-[rgba(214,27,23,0.25)] bg-[var(--brand-red-soft)]"
                            : "border-[var(--brand-line)] bg-[var(--brand-panel-muted)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.acceptsTerms}
                          onChange={(e) => updateField("acceptsTerms", e.target.checked)}
                          className="sr-only"
                        />
                        <motion.div
                          className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.3rem]"
                          animate={{
                            backgroundColor: form.acceptsTerms ? "rgb(214,27,23)" : "transparent",
                            borderColor: form.acceptsTerms ? "rgb(214,27,23)" : "rgb(235,236,239)",
                            scale: form.acceptsTerms ? [1, 1.3, 1] : 1,
                          }}
                          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                          style={{ border: "2px solid" }}
                        >
                          <AnimatePresence>
                            {form.acceptsTerms ? (
                              <motion.svg
                                key="check"
                                className="h-3 w-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3.5}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                              >
                                <motion.path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                  initial={{ pathLength: 0 }}
                                  animate={{ pathLength: 1 }}
                                  transition={{ duration: 0.2, ease: "easeOut" }}
                                />
                              </motion.svg>
                            ) : null}
                          </AnimatePresence>
                        </motion.div>
                        <span className="text-xs leading-6 text-[var(--brand-muted)]">
                          I authorise Sparing Consulting to charge{" "}
                          <span className="font-semibold text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice)}/mo</span>{" "}
                          to the card above, starting today. Cancel any time.
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              ) : null}

            </StepTransition>
          </div>

          {/* CTA pinned to card bottom */}
          <div className="border-t border-[var(--brand-line)] px-10 pb-10 pt-7">
            {step !== "location" ? (
              <button
                type="button"
                onClick={previousStep}
                className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
            ) : null}
            <AnimatePresence mode="wait" initial={false}>
              {step === "agreement" && !canContinue.agreement ? (
                <motion.div
                  key="cta-ghost"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] py-3.5 text-sm text-[var(--brand-muted)]"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  Accept the terms above to continue
                </motion.div>
              ) : (
                <motion.div
                  key="cta-active"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                >
                  <PrimaryButton
                    onClick={step !== "agreement" ? nextStep : undefined}
                    disabled={!canContinue[step]}
                    className="w-full justify-center"
                  >
                    {ctaLabel}
                  </PrimaryButton>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
