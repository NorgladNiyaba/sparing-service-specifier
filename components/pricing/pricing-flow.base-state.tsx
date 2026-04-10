// @ts-nocheck
"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";

import logoWhite from "@/app-logo-white.png";
import {
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

type Step = "location" | "company" | "budget" | "recommendation";

type FormState = {
  city: string;
  stateCode: string;
  companyName: string;
  employeeCount: string;
  annualRevenue: string;
};

const steps: { id: Step; label: string }[] = [
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "budget", label: "Budget" },
  { id: "recommendation", label: "Review" },
];

const initialForm: FormState = {
  city: "",
  stateCode: "",
  companyName: "",
  employeeCount: "",
  annualRevenue: "",
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
  const progress = (currentIndex / (steps.length - 1)) * 100;

  return (
    <div className="space-y-4">
      <div className="relative h-px w-full bg-[var(--brand-line)]">
        <div
          className="absolute left-0 top-0 h-px bg-[var(--brand-red)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        {steps.map((item, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;

          return (
            <div key={item.id} className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 rounded-full transition ${
                    active || complete ? "bg-[var(--brand-red)]" : "bg-[var(--brand-line-strong)]"
                  }`}
                />
                <span
                  className={`truncate text-sm transition ${
                    active
                      ? "font-medium text-[var(--brand-ink)]"
                      : complete
                        ? "text-[var(--brand-red)]"
                        : "text-[var(--brand-muted)]"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepTransition({
  stepKey,
  children,
}: {
  stepKey: Step;
  children: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
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
    <section className="border-t border-[var(--brand-line)] pt-12 sm:pt-16">
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand-red)]">
        {eyebrow}
      </div>
      <h1 className="mt-4 max-w-3xl text-balance text-[clamp(2.4rem,5vw,4.25rem)] leading-[1.02] tracking-[-0.05em] text-[var(--brand-ink)]">
        {title}
      </h1>
      {note ? <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--brand-muted)]">{note}</p> : null}
      <div className="mt-10 space-y-5 sm:mt-12">{children}</div>
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
      <div className="text-[1.35rem] leading-[1.75] text-[var(--brand-ink)] sm:text-[1.82rem] sm:leading-[1.65]">
        {children}
      </div>
      {note ? <div className="pl-1 text-sm text-[var(--brand-muted)]">{note}</div> : null}
    </div>
  );
}

function InlineTextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`mx-2 inline-flex h-13 min-w-[8rem] rounded-full border border-[var(--brand-line)] bg-white px-4 align-middle text-[1rem] text-[var(--brand-ink)] shadow-[0_1px_2px_rgba(23,23,23,0.03)] transition focus:border-[var(--brand-red)] focus:ring-4 focus:ring-[rgba(214,27,23,0.07)] hover:border-[var(--brand-line-strong)] sm:h-14 sm:text-[1.1rem] ${props.className ?? ""}`}
    />
  );
}

function InlineSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`mx-2 inline-flex h-13 min-w-[10rem] rounded-full border border-[var(--brand-line)] bg-white px-4 align-middle text-[1rem] text-[var(--brand-ink)] shadow-[0_1px_2px_rgba(23,23,23,0.03)] transition focus:border-[var(--brand-red)] focus:ring-4 focus:ring-[rgba(214,27,23,0.07)] hover:border-[var(--brand-line-strong)] sm:h-14 sm:text-[1.1rem] ${props.className ?? ""}`}
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
    <div className="flex flex-wrap gap-3 pt-2">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            selectedValue === value
              ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)] text-[var(--brand-red)]"
              : "border-[var(--brand-line)] bg-white text-[var(--brand-muted)] hover:border-[var(--brand-line-strong)] hover:text-[var(--brand-ink)]"
          }`}
        >
          {formatter(value)}
        </button>
      ))}
    </div>
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

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-full bg-[var(--brand-red)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-red-deep)] disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex h-12 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white px-6 text-sm font-semibold text-[var(--brand-ink)] transition hover:border-[var(--brand-line-strong)] hover:bg-[var(--brand-surface)] ${props.className ?? ""}`}
    />
  );
}

export function PricingFlow() {
  const [step, setStep] = useState<Step>("location");
  const [form, setForm] = useState<FormState>(initialForm);

  const employeeCount = parseWholeNumber(form.employeeCount);
  const annualRevenue = parseWholeNumber(form.annualRevenue);

  const recommendation = useMemo(
    () =>
      calculateRecommendation({
        stateCode: form.stateCode,
        city: form.city,
        employeeCount,
        annualRevenue,
      }),
    [annualRevenue, employeeCount, form.city, form.stateCode],
  );

  const companyName = form.companyName.trim() || "Your business";
  const continuityParts = [
    form.city.trim() && form.stateCode ? `${form.city.trim()}, ${getStateName(form.stateCode)}` : "",
    employeeCount > 0 ? `${formatNumber(employeeCount)} ${employeeCount === 1 ? "person" : "people"}` : "",
    annualRevenue > 0 ? formatCurrency(annualRevenue) : "",
  ].filter(Boolean);

  const continuityLabel = continuityParts.length > 0 ? continuityParts.join("  •  ") : "A few quick questions to tailor your monthly support estimate.";

  const canContinue = {
    location: Boolean(form.city.trim() && form.stateCode),
    company: Boolean(form.companyName.trim() && employeeCount > 0),
    budget: annualRevenue > 0,
    recommendation: true,
  };

  const nextStep = () => {
    if (step === "location" && canContinue.location) setStep("company");
    if (step === "company" && canContinue.company) setStep("budget");
    if (step === "budget" && canContinue.budget) setStep("recommendation");
  };

  const previousStep = () => {
    if (step === "company") setStep("location");
    if (step === "budget") setStep("company");
    if (step === "recommendation") setStep("budget");
  };

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <header className="border-b border-[var(--brand-line)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-5 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--brand-red)] px-4 py-3">
              <Image src={logoWhite} alt="Sparing Consulting" className="h-6 w-auto" priority />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--brand-ink)]">Sparing Monthly Fit</div>
              <div className="text-xs text-[var(--brand-muted)]">A simple guided estimate</div>
            </div>
          </div>
          <div className="hidden text-sm text-[var(--brand-muted)] sm:block">
            Step {steps.findIndex((item) => item.id === step) + 1} of {steps.length}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <ProgressBar step={step} />

        <div className="mt-5 text-sm leading-7 text-[var(--brand-muted)]">{continuityLabel}</div>

        <div className="mt-10 max-w-4xl">
          <StepTransition stepKey={step}>
            {step === "location" ? (
              <StepFrame
                eyebrow="Location"
                title="Let’s start with where the business operates."
                note="We use your city and state to place the business in the right operating context."
              >
                <SentenceRow>
                  We&apos;re based in
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
                title="Now tell us a little about the company."
                note="A name and a current team size are enough for this step."
              >
                <SentenceRow>
                  The business is
                  <InlineTextInput
                    value={form.companyName}
                    onChange={(event) => updateField("companyName", event.target.value)}
                    placeholder="company name"
                    className="min-w-[14rem] sm:min-w-[18rem]"
                  />
                  .
                </SentenceRow>

                <SentenceRow note="Use your best current headcount.">
                  We currently have about
                  <InlineTextInput
                    inputMode="numeric"
                    value={form.employeeCount}
                    onChange={(event) =>
                      updateField("employeeCount", normalizeNumberInput(event.target.value))
                    }
                    placeholder="0"
                    className="min-w-[6rem]"
                  />
                  people on the team.
                </SentenceRow>

                <ChoiceRow
                  values={employeePresets}
                  selectedValue={employeeCount}
                  onSelect={(value) => updateField("employeeCount", String(value))}
                  formatter={(value) => `${value} ${value === 1 ? "person" : "people"}`}
                />
              </StepFrame>
            ) : null}

            {step === "budget" ? (
              <StepFrame
                eyebrow="Budget"
                title="Last piece. What revenue are you planning around?"
                note="We use annual revenue as the base for your monthly support estimate."
              >
                <SentenceRow>
                  We expect about $
                  <InlineTextInput
                    inputMode="numeric"
                    value={formatInlineNumber(form.annualRevenue)}
                    onChange={(event) =>
                      updateField("annualRevenue", normalizeNumberInput(event.target.value))
                    }
                    placeholder="annual revenue"
                    className="min-w-[12rem] sm:min-w-[14rem]"
                  />
                  in annual revenue.
                </SentenceRow>

                <ChoiceRow
                  values={revenuePresets}
                  selectedValue={annualRevenue}
                  onSelect={(value) => updateField("annualRevenue", String(value))}
                  formatter={(value) => formatCurrency(value)}
                />

                <div className="pt-4">
                  <div className="text-sm text-[var(--brand-muted)]">Current estimate</div>
                  <div className="mt-2 text-[2.6rem] font-semibold tracking-[-0.05em] text-[var(--brand-ink)]">
                    {formatCurrency(recommendation.monthlyPrice)}
                    <span className="ml-2 text-lg font-normal text-[var(--brand-muted)]">/ month</span>
                  </div>
                </div>
              </StepFrame>
            ) : null}

            {step === "recommendation" ? (
              <StepFrame
                eyebrow="Recommendation"
                title={`Here’s what monthly support looks like for ${companyName}.`}
                note={recommendation.summary}
              >
                <div className="grid gap-10 border-t border-[var(--brand-line)] pt-8 sm:grid-cols-[minmax(0,1fr)_18rem]">
                  <div>
                    <div className="text-sm text-[var(--brand-muted)]">Recommended monthly support</div>
                    <div className="mt-3 text-[clamp(3.5rem,7vw,6rem)] font-semibold leading-none tracking-[-0.07em] text-[var(--brand-ink)]">
                      {formatCurrency(recommendation.monthlyPrice)}
                    </div>
                    <div className="mt-2 text-base text-[var(--brand-muted)]">per month</div>
                    <div className="mt-8 max-w-xl text-[1.35rem] leading-8 text-[var(--brand-ink)]">
                      {recommendation.publicPlanName}
                    </div>
                    <div className="mt-3 max-w-xl text-base leading-8 text-[var(--brand-muted)]">
                      {recommendation.audienceLabel}
                    </div>
                  </div>

                  <div className="border-t border-[var(--brand-line)] pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                    <SummaryRow label="Location" value={form.city && form.stateCode ? `${form.city}, ${getStateName(form.stateCode)}` : "Pending"} />
                    <SummaryRow label="Employees" value={employeeCount > 0 ? formatNumber(employeeCount) : "Pending"} />
                    <SummaryRow label="Revenue" value={annualRevenue > 0 ? formatCurrency(annualRevenue) : "Pending"} />
                    <SummaryRow label="Revenue tier" value={recommendation.tierLabel} />
                  </div>
                </div>

                <div className="grid gap-10 border-t border-[var(--brand-line)] pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">
                      What’s included
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

                  <div>
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
          </StepTransition>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            {step !== "location" ? <SecondaryButton onClick={previousStep}>Back</SecondaryButton> : null}
            {step !== "recommendation" ? (
              <PrimaryButton onClick={nextStep} disabled={!canContinue[step]}>
                Continue
              </PrimaryButton>
            ) : (
              <PrimaryButton>Book this plan</PrimaryButton>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
