"use client";

import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import logoWhite from "@/app-logo-white.png";
import {
  type BusinessType,
  type Recommendation,
  calculateOhssUnits,
  calculateRecommendation,
  ecssAdditionalAgencyNoticeFee,
  ecssBaseRate,
  ecssIncludedAgencyNotices,
  formatCurrency,
  formatNumber,
  getStateName,
  icssBaseRate,
  ohssRevenueThreshold,
  usStates,
} from "@/lib/pricing";
import { citiesByState } from "@/lib/us-cities";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentSchedule = "monthly-1st" | "monthly-16th" | "semi-monthly";
type Step = "location" | "company" | "budget" | "office-hours" | "recommendation" | "agreement" | "confirmation";

type FormState = {
  stateCode: string;
  city: string;
  businessType: BusinessType | "";
  companyName: string;
  employeeCount: string;
  annualRevenue: string;
  officeHoursUnits: number;
  ohssAccepted: boolean | null;
  paymentSchedule: PaymentSchedule;
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
  signed: boolean;
};

// ── Step definitions ──────────────────────────────────────────────────────────

const baseSteps: { id: Step; label: string }[] = [
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "budget", label: "Budget" },
  { id: "recommendation", label: "Review" },
  { id: "agreement", label: "Agreement" },
];

const ohssSteps: { id: Step; label: string }[] = [
  { id: "location", label: "Location" },
  { id: "company", label: "Company" },
  { id: "budget", label: "Budget" },
  { id: "office-hours", label: "Office Hours" },
  { id: "recommendation", label: "Review" },
  { id: "agreement", label: "Agreement" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const initialForm: FormState = {
  stateCode: "",
  city: "",
  businessType: "",
  companyName: "",
  employeeCount: "",
  annualRevenue: "",
  officeHoursUnits: 0,
  ohssAccepted: null,
  paymentSchedule: "monthly-1st",
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
  signed: false,
};

const businessTypeOptions: Array<{ id: BusinessType; label: string; description: string }> = [
  {
    id: "independent-contractor",
    label: "Independent contractor",
    description: "A self-employed professional who leads their work, solo or with a team.",
  },
  {
    id: "startup",
    label: "Emerging Business",
    description: "A new or established company focused on growth, often building a team to support its operations.",
  },
  {
    id: "smb",
    label: "Small and Mid-sized Business (SMB)",
    description: "An established company with steady revenue and a growing team.",
  },
];

const businessTypeLabels: Record<BusinessType, string> = {
  "independent-contractor": "Independent contractor",
  startup: "Emerging Business",
  smb: "Small and Mid-sized Business (SMB)",
};

const employeePresets = [1, 3, 5, 10, 20];
const revenuePresets = [100_000, 250_000, 500_000, 750_000, 1_000_000, 1_300_000];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeNumberInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string, prev: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  // Auto-pad month: if first digit > 1, prepend 0
  const m1 = digits[0];
  const padded = Number(m1) > 1 ? "0" + digits : digits;
  const d = padded.slice(0, 4);
  if (d.length <= 2) return prev.endsWith("/") ? d.slice(0, 1) : d;
  return d.slice(0, 2) + "/" + d.slice(2);
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatZip(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 5);
}

function formatCvc(raw: string, cardNumber: string): string {
  const isAmex = cardNumber.replace(/\D/g, "").startsWith("3");
  return raw.replace(/\D/g, "").slice(0, isAmex ? 4 : 3);
}

function parseWholeNumber(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInlineNumber(value: string) {
  if (!value) return "";
  return formatNumber(parseWholeNumber(value));
}

function paymentScheduleLabel(schedule: PaymentSchedule): string {
  if (schedule === "monthly-1st") return "Monthly — billed on the 1st";
  if (schedule === "monthly-16th") return "Monthly — billed on the 16th";
  return "Semi-monthly — billed on the 1st & 16th";
}

// ── ProgressBar ───────────────────────────────────────────────────────────────

function ProgressBar({
  step,
  steps,
  inverted = false,
}: {
  step: Step;
  steps: { id: Step; label: string }[];
  inverted?: boolean;
}) {
  const currentIndex = steps.findIndex((item) => item.id === step);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand-red)]">
          {steps[currentIndex]?.label ?? ""}
        </span>
        <span className={`text-[0.72rem] font-medium tabular-nums ${inverted ? "text-white/40" : "text-[var(--brand-muted)]"}`}>
          {currentIndex + 1} / {steps.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((item, index) => (
          <motion.div
            key={item.id}
            className="h-[3px] flex-1 rounded-full"
            animate={{
              backgroundColor:
                index <= currentIndex
                  ? "var(--brand-red)"
                  : inverted
                    ? "rgba(255,255,255,0.15)"
                    : "var(--brand-line)",
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

// ── StepTransition ────────────────────────────────────────────────────────────

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

// ── ScrollReveal ──────────────────────────────────────────────────────────────

function ScrollReveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={visible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── CardPreview ───────────────────────────────────────────────────────────────

function CardPreview({ cardNumber, cardName, expiry }: { cardNumber: string; cardName: string; expiry: string }) {
  const digits = cardNumber.replace(/\D/g, "");
  const network = digits.startsWith("4") ? "visa" : digits.startsWith("5") ? "mc" : digits.startsWith("3") ? "amex" : null;
  const groups = [digits.slice(0, 4), digits.slice(4, 8), digits.slice(8, 12), digits.slice(12, 16)];
  const formatted = groups.map((g, i) => g || (i === 0 ? "••••" : "••••")).join(" ");

  return (
    <motion.div
      className="relative mb-6 h-44 w-full overflow-hidden rounded-2xl p-6 select-none"
      style={{ background: "linear-gradient(135deg, #1c1c2e 0%, #16213e 60%, #0f3460 100%)" }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-4 h-32 w-32 rounded-full bg-white/5" />

      {/* Chip */}
      <div className="h-6 w-9 rounded-md" style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e27a 50%, #d4af37 100%)" }} />

      {/* Card number */}
      <motion.div
        className="mt-5 font-mono text-sm tracking-[0.18em] text-white/80"
        key={formatted}
        animate={{ opacity: 1 }}
      >
        {formatted}
      </motion.div>

      {/* Bottom row */}
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-[0.6rem] uppercase tracking-widest text-white/35">Card Holder</div>
          <motion.div className="mt-0.5 truncate text-xs font-medium text-white/80" style={{ maxWidth: "160px" }}>
            {cardName || "YOUR NAME"}
          </motion.div>
        </div>
        <div className="text-right">
          <div className="text-[0.6rem] uppercase tracking-widest text-white/35">Expires</div>
          <div className="mt-0.5 text-xs font-medium text-white/80">{expiry || "MM/YY"}</div>
        </div>
        {network === "visa" && (
          <div className="absolute bottom-5 right-6 font-bold italic text-white/70" style={{ fontSize: "1.1rem", fontFamily: "Arial, sans-serif", letterSpacing: "0.05em" }}>VISA</div>
        )}
        {network === "mc" && (
          <div className="absolute bottom-4 right-6 flex">
            <div className="h-7 w-7 rounded-full bg-[#EB001B] opacity-90" />
            <div className="-ml-3 h-7 w-7 rounded-full bg-[#F79E1B] opacity-90" />
          </div>
        )}
        {network === "amex" && (
          <div className="absolute bottom-5 right-6 text-xs font-bold text-white/70">AMEX</div>
        )}
      </div>
    </motion.div>
  );
}

// ── Form primitives ───────────────────────────────────────────────────────────

function DetailField({ label, children, done = false }: { label: string; children: ReactNode; done?: boolean }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-[var(--brand-ink)]">{label}</div>
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-red)]"
            >
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {children}
    </label>
  );
}

const inputClass =
  "h-12 w-full rounded-[0.75rem] border border-transparent bg-[var(--brand-surface)] px-4 text-[0.95rem] text-[var(--brand-ink)] transition duration-200 hover:border-[var(--brand-line)] hover:bg-[var(--brand-panel-muted)] focus:border-[var(--brand-red)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(214,27,23,0.09)]";

function DetailInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
    />
  );
}

function DetailSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputClass} ${props.className ?? ""}`}
    />
  );
}

function CityCombobox({
  stateCode,
  value,
  onChange,
}: {
  stateCode: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const cities = stateCode ? (citiesByState[stateCode] ?? []) : [];
  return (
    <>
      <input
        list="city-suggestions"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={stateCode ? "Select or type a city" : "Select a state first"}
        disabled={!stateCode}
        className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
      />
      <datalist id="city-suggestions">
        {cities.map((city) => (
          <option key={city} value={city} />
        ))}
      </datalist>
    </>
  );
}

// ── SummaryRow ────────────────────────────────────────────────────────────────

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

// ── PrimaryButton ─────────────────────────────────────────────────────────────

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

// ── ChoiceRow ─────────────────────────────────────────────────────────────────

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

// ── BusinessTypePicker ────────────────────────────────────────────────────────

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
            className={`group relative rounded-[1rem] border p-5 text-left ${
              selected
                ? "border-[rgba(214,27,23,0.22)] bg-white"
                : "border-[var(--brand-line)] bg-white hover:border-[var(--brand-line-strong)]"
            }`}
          >
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
            <motion.div
              className="mt-4 text-[0.92rem] font-semibold"
              animate={{ color: selected ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
              transition={{ duration: 0.2 }}
            >
              {option.label}
            </motion.div>
            <div className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
              {option.description}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── SignatureBlock ────────────────────────────────────────────────────────────

function SignatureBlock({
  name,
  title,
  date,
  signed,
  onSign,
}: {
  name: string;
  title: string;
  date: string;
  signed: boolean;
  onSign: () => void;
}) {
  return (
    <div className="mt-6 border-t border-[var(--brand-line)] pt-5 text-[0.72rem]">
      <p className="font-semibold uppercase tracking-[0.14em] text-[var(--brand-ink)]">Acceptance and Signature</p>
      <p className="mt-1.5 leading-5 text-[var(--brand-muted)]">
        IN WITNESS THEREOF, the Parties hereby agree to have executed this Service Agreement on the date stated above.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Sparing — pre-signed */}
        <div className="rounded-[0.65rem] border border-[var(--brand-line)] bg-[var(--brand-surface)] p-3">
          <div className="text-[0.6rem] uppercase tracking-widest text-[var(--brand-muted)]">Sparing Consulting Inc.</div>
          <div
            className="mt-2 text-[1rem] text-[var(--brand-ink)]"
            style={{ fontFamily: "'Segoe Script', 'Apple Chancery', 'URW Chancery L', cursive", lineHeight: 1.4 }}
          >
            Mireille Bakal
          </div>
          <div className="mt-1.5 border-t border-[var(--brand-line)] pt-1.5 text-[0.6rem] text-[var(--brand-muted)]">
            MIREILLE BAKAL — Chief Executive Officer
          </div>
          <div className="mt-0.5 text-[0.6rem] text-[var(--brand-muted)]">{date}</div>
        </div>

        {/* Client — interactive */}
        <div
          className={`relative rounded-[0.65rem] border p-3 transition-colors duration-300 ${
            signed
              ? "border-[rgba(214,27,23,0.3)] bg-[var(--brand-red-soft)]"
              : "border-dashed border-[var(--brand-line-strong)] bg-[var(--brand-surface)]"
          }`}
        >
          <div className="text-[0.6rem] uppercase tracking-widest text-[var(--brand-muted)]">Client</div>
          <AnimatePresence mode="wait">
            {signed ? (
              <motion.div
                key="signed-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="mt-2 text-[1rem] text-[var(--brand-ink)]"
                  style={{ fontFamily: "'Segoe Script', 'Apple Chancery', 'URW Chancery L', cursive", lineHeight: 1.4 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {name}
                </motion.div>
                {/* Underline draws in */}
                <div className="relative mt-1 h-px bg-[var(--brand-line-strong)] overflow-hidden">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[var(--brand-ink)]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[0.6rem] text-[var(--brand-muted)]">{name} — {title}</span>
                  <motion.span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--brand-red)] px-1.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-white"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <svg className="h-2 w-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Signed
                  </motion.span>
                </div>
                <div className="mt-0.5 text-[0.6rem] text-[var(--brand-muted)]">{date}</div>
              </motion.div>
            ) : (
              <motion.button
                key="unsigned-state"
                type="button"
                onClick={onSign}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-[0.4rem] border border-[var(--brand-line)] bg-white py-2 text-[0.72rem] font-medium text-[var(--brand-ink)] transition-colors duration-200 hover:border-[var(--brand-red)] hover:bg-[var(--brand-red-soft)] hover:text-[var(--brand-red)]"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Click to sign
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── KeyTermsCard ──────────────────────────────────────────────────────────────

function KeyTermsCard({
  agreementDate,
  companyName,
  recommendation,
  paymentSchedule,
}: {
  agreementDate: string;
  companyName: string;
  recommendation: Recommendation;
  paymentSchedule: PaymentSchedule;
}) {
  const isSemiMonthly = paymentSchedule === "semi-monthly";
  const terms: [string, string][] = [
    ["Effective date", agreementDate],
    ["Company", companyName],
    ["Plan", recommendation.serviceTrack.toUpperCase()],
    [
      isSemiMonthly ? "Per installment" : "Monthly fee",
      formatCurrency(isSemiMonthly ? recommendation.monthlyPrice / 2 : recommendation.monthlyPrice),
    ],
    ["Payment schedule", paymentScheduleLabel(paymentSchedule)],
    ["Cancellation", "30 days written notice"],
  ];

  return (
    <div className="rounded-[0.85rem] border border-[var(--brand-line)] bg-[var(--brand-surface)] p-5">
      <div className="text-sm font-semibold text-[var(--brand-ink)]">Key Terms</div>
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-3">
        {terms.map(([label, value]) => (
          <div key={label}>
            <div className="text-[0.72rem] text-[var(--brand-muted)]">{label}</div>
            <div className="text-sm font-medium text-[var(--brand-ink)]">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ContractBody ──────────────────────────────────────────────────────────────

function ContractBody({
  recommendation,
  form,
  companyName,
  agreementDate,
  stateName,
}: {
  recommendation: Recommendation;
  form: FormState;
  companyName: string;
  agreementDate: string;
  stateName: string;
}) {
  const isOhss = recommendation.serviceTrack === "ohss";
  const isIcss = recommendation.serviceTrack === "icss";
  const trackName = isIcss ? "Independent Contractor" : "Emerging Company";
  const signerName = form.contactName.trim() || "[Authorised Signatory]";
  const signerTitle = form.signerTitle.trim() || "[Title]";
  const scheduleText = paymentScheduleLabel(form.paymentSchedule);
  const isSemiMonthlyContract = form.paymentSchedule === "semi-monthly";

  if (isOhss) {
    return (
      <div className="space-y-5 text-[0.78rem] leading-6 text-[var(--brand-muted)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--brand-ink)]">
          Office Hours Subscription Service Agreement
        </p>

        <p>
          This Service Agreement ("<strong>Agreement</strong>") is entered into and made effective as of{" "}
          <strong className="text-[var(--brand-ink)]">{agreementDate}</strong> (the "<strong>Effective Date</strong>"),
          by and between <strong>SPARING CONSULTING INC.</strong>, a corporation with its principal place of business
          located at 7230 Lee Deforest Dr Suite 202, Columbia, MD 21046 (the "<strong>Company</strong>"), and{" "}
          <strong className="text-[var(--brand-ink)]">{companyName}</strong>, with its official address at{" "}
          <strong className="text-[var(--brand-ink)]">{form.billingAddress.trim() || "[Client Address]"}</strong>{" "}
          (the "<strong>Client</strong>"), represented by{" "}
          <strong className="text-[var(--brand-ink)]">{signerName}</strong>,{" "}
          <strong className="text-[var(--brand-ink)]">{signerTitle}</strong>.
        </p>
        <p>
          For purposes of this Agreement, the Company and the Client may be referred to individually as a "Party" or
          collectively as the "Parties."
        </p>
        <p>
          NOW, THEREFORE, in consideration of the mutual promises, covenants, and agreements set forth herein, the
          Parties agree to the following terms and conditions.
        </p>

        <p className="font-semibold text-[var(--brand-ink)]">Terms and Conditions</p>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">1. Introduction</p>
          <p className="mt-1">
            Sparing Consulting Inc. (the "Company") has established in this Agreement the fundamental terms and
            conditions of business (the "Terms"), which, together with the Proposal (collectively referred to as "this
            Agreement"), shall govern all work undertaken for the Client in connection with this engagement.
          </p>
          <p className="mt-1">
            In the event of any conflict between the Terms and the Proposal, the provisions of the Proposal shall take
            precedence.
          </p>
          <p className="mt-1">
            For the purposes of these Terms, the term "Company" shall encompass its partners, employees,
            subcontractors, advisers, and any affiliated or related entities.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">2. Duration</p>
          <p className="mt-1">
            The term of this Agreement shall be the calendar year, automatically renewing on January 1 of the
            subsequent year. Upon renewal, the pricing may be subject to adjustments as outlined in the Pricing
            Section. Either party may amend or terminate the implied terms of this Agreement exclusively by January 31
            of the new calendar year or within thirty (30) days following the execution of a new Agreement.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">3. Information</p>
          <p className="mt-1">
            The quality of services provided by Sparing Consulting Inc. is contingent upon the Client's full and
            timely cooperation, including the provision of clear and accurate instructions. Sparing Consulting Inc.
            shall rely on the accuracy and completeness of all information provided by the Client or on their behalf.
            Unless expressly agreed upon as part of this engagement, Sparing Consulting Inc. will not independently
            verify such information.
          </p>
          <p className="mt-1">
            The Client retains full responsibility for any use of, or reliance on, the advice, recommendations, or
            other deliverables provided by Sparing Consulting Inc. in connection with the delivery of its services.
          </p>
          <p className="mt-1">
            The Client further agrees that if, after providing information to Sparing Consulting Inc., any event or
            circumstance occurs that renders such information inaccurate, misleading, or incomplete, the Client shall
            promptly notify Sparing Consulting Inc. of such changes.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">4. Delays</p>
          <p className="mt-1">
            The Client agrees that Sparing Consulting Inc. shall not be held liable for any failure or delay in the
            performance of its obligations under this engagement caused by circumstances beyond its reasonable control,
            including but not limited to the actions or omissions of third parties.
          </p>
          <p className="mt-1">
            Sparing Consulting Inc. reserves the right to adjust its fees to account for any additional costs incurred
            because of such delays. In the event the delay is substantial, the Client retains the right to terminate
            this Agreement in accordance with its terms.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">5. Resources</p>
          <p className="mt-1">
            To ensure the highest quality of service delivery, Sparing Consulting Inc. may require access to the
            Client's files, records, information technology systems, premises, personnel, and any additional resources
            necessary for the timely approval, development, and sign-off of all project plans, specifications,
            accounts, and deliverables. The Client agrees to provide Sparing Consulting Inc. with reasonable access to
            these resources at no additional cost.
          </p>
          <p className="mt-1">
            The Client further agrees to respond to all inquiries from Sparing Consulting Inc. within five (5)
            business days. Failure to respond to more than three (3) separate inquiries, each of which will include up
            to three (3) consecutive attempts by Sparing Consulting Inc., may result in the termination of this
            Agreement by Sparing Consulting Inc. at the Client's expense.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">6. Disbursements</p>
          <p className="mt-1">
            In addition to the fees payable to Sparing Consulting Inc., the Client agrees to reimburse the Company for
            reasonable expenses incurred in the provision of services. Such expenses may include, but are not limited
            to, copying/printing costs, telephone charges, and travel expenses. However, any work related to tax
            credit applications will be excluded, as the Client will only be obligated to pay a percentage of the
            credit upon successful approval. Details of all applicable disbursements will be itemized and included in
            Sparing Consulting Inc.'s monthly invoices.
          </p>
          <p className="mt-1">
            Additionally, if Sparing Consulting Inc. is required to produce documents, respond to audit requests,
            prepare applications, or attend court proceedings related to this engagement and to which Sparing
            Consulting Inc. is not a party, the Client agrees to compensate the Company at its standard billing rates
            for such services.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">7. Estimates</p>
          <p className="mt-1">
            Sparing Consulting Inc. may provide the Client with an estimate of anticipated fees and costs for
            additional services to be rendered. The Client acknowledges that the final fees and costs may differ from
            the initial estimate due to modifications in the scope or nature of the engagement, or the emergence of
            unforeseen circumstances. Sparing Consulting Inc. shall endeavor to notify the Client of any material
            changes or increases in costs at the earliest practicable opportunity.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">8. Pricing</p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">8.1 Revenue-Based Subscription Fee</p>
          <p className="mt-1">
            The Client agrees to pay a semi-monthly subscription fee to Sparing Consulting Inc., based on the
            Client's cumulative gross revenue generated during the term of this Agreement, in accordance with the
            tiered pricing schedule set out in the Proposal. The applicable subscription fee for this engagement is{" "}
            <strong className="text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice / 2)}</strong>{" "}
            per installment ({" "}
            <strong className="text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice)}</strong> per
            month), billed on the schedule selected:{" "}
            <strong className="text-[var(--brand-ink)]">{scheduleText}</strong>.
          </p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">8.2 Tier Advancement and Lock-In</p>
          <p className="mt-1">
            Once the Client surpasses a revenue threshold, the corresponding subscription fee will take effect in the
            following billing cycle. Fees will not decrease, even if the Client's revenue declines in subsequent
            months. Monthly fees may only increase as the Client progresses to higher revenue tiers.
          </p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">8.3 Annual Continuity</p>
          <p className="mt-1">
            At the beginning of each new calendar year, the Client's cumulative revenue total does not reset.
            Subscription pricing shall continue based on the last tier reached and will adjust only when the Client
            enters a higher revenue band.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">9. Fees & Schedules</p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">9.1 Payment Frequency</p>
          <p className="mt-1">
            Subscription fees shall be collected in two equal installments, billed on the 1st and 16th of each
            calendar month. Each installment shall represent the total amount owed under the semi-monthly
            subscription fee based on the Client's current revenue tier.
          </p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">9.2 Initial Payment Terms</p>
          <p className="mt-1">
            For Clients with year-to-date gross revenue of $500,000.00 or less at the start of this Agreement, a
            prepayment of $1,083.33 shall be collected upon execution and credited toward the subscription fee once it
            becomes due. For Clients with YTD revenue exceeding $500,000.00, the first month's subscription fee shall
            be charged in full at the time of signing. For Clients who exceeded $500,000.00 in gross revenue in the
            previous calendar year, a retroactive bookkeeping fee of $125.00 per prior month shall be charged for
            each month of the current calendar year that has passed prior to execution, invoiced and paid in full upon
            signing.
          </p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">9.3 Automatic Payment Authorization</p>
          <p className="mt-1">
            The Client authorizes Sparing Consulting Inc. to automatically debit the designated payment method on file
            for all subscription fees due under this Agreement. Charges will be made on the 1st and 16th of each
            month, in accordance with the Client's current pricing tier. This authorization shall remain in effect for
            the duration of the Agreement unless revoked in writing with at least ten (10) business days' notice prior
            to a scheduled debit.
          </p>
          <p className="mt-1 font-medium text-[var(--brand-ink)]">9.4 Late or Failed Payments</p>
          <p className="mt-1">
            If a scheduled payment is declined, returned, or otherwise unsuccessful, the Client shall be notified and
            must update payment details within five (5) business days. A late fee of $50 or 1.5% of the outstanding
            balance, whichever is greater, may apply. Sparing Consulting Inc. reserves the right to suspend services
            for nonpayment until the account is brought current.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">10. Intellectual Property</p>
          <p className="mt-1">
            Sparing Consulting Inc. shall not acquire any ownership rights over the information provided by the
            Client. Upon full payment of all amounts owed, and subject to the provisions below, the Client
            irrevocably grants Sparing Consulting Inc. a perpetual, royalty-free, worldwide license to use, copy,
            modify, adapt, and exploit the deliverables, provided such use does not disclose the Client's
            confidential information.
          </p>
          <p className="mt-1">
            The processes, know-how, ideas, concepts, and techniques utilized or developed by Sparing Consulting Inc.
            while providing services to the Client are proprietary and confidential to Sparing Consulting Inc., which
            retains sole and exclusive rights to such intellectual property, including all tools, enhancements,
            improvements, working papers, and internal documents created or utilized during this engagement.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">11. Software and Tool Management Policy</p>
          <p className="mt-1">
            Sparing Consulting Inc. will provide, at no additional cost to the Client, software related to file
            management, including a secure client portal. For all other software or tools required to deliver
            services, the Client will be billed directly by the respective third-party vendor.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li><strong>Accounting Tools:</strong> Sparing Consulting Inc. will act as primary administrator. The Client is responsible for all vendor fees. Upon termination and full payment, administrator privileges will be returned to the Client.</li>
            <li><strong>Payroll Tools:</strong> Sparing Consulting Inc. will act as a user. The Client shall remain responsible for all fees and charges imposed by the vendor.</li>
            <li><strong>Human Resource Tools:</strong> Sparing may act as administrator or user depending on the Client's needs. The Client bears all vendor fees. Upon termination, Sparing will relinquish access immediately.</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">12. Arbitration</p>
          <p className="mt-1">
            In the event of any dispute arising out of or in connection with this Agreement, such dispute shall be
            resolved through arbitration conducted by a single arbitrator appointed by mutual agreement of the
            Parties. The seat of arbitration shall be established in the State of Maryland. The decision of the
            arbitrator shall be final, binding, and enforceable on both Parties in accordance with applicable law.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">13. Termination</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li><strong>Initial Term:</strong> The initial term of this Agreement shall be the calendar year in which the Agreement is accepted by both Parties.</li>
            <li><strong>Termination for Material Breach or Bankruptcy:</strong> Either Party may terminate this Agreement immediately in the event of a material breach or bankruptcy. The Client agrees to pay all fees and disbursements incurred up to the date of termination.</li>
            <li><strong>Termination Without Cause:</strong> If the Client ceases to use Sparing Consulting Inc.'s services for any reason other than material breach or bankruptcy, the Client agrees to pay the remaining fees due under the Agreement for the duration of the Term. Termination fees apply only if termination occurs after January 31st of any calendar year or more than 30 days after signing a new Agreement.</li>
            <li><strong>Termination Without Penalty:</strong> The Client may terminate without penalty within 30 days of signing a new Agreement or prior to January 31st in the event of service renewal.</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">14. Indemnity</p>
          <p className="mt-1">
            Sparing Consulting Inc. agrees to indemnify, defend, and hold harmless the Client from and against all
            damages, losses, liabilities, costs, and expenses, including reasonable legal fees, incurred as a direct
            result of any act or omission by Sparing. Similarly, the Client agrees to indemnify, defend, and hold
            harmless Sparing from and against all damages, losses, liabilities, costs, and expenses arising out of or
            resulting from any act or omission on the part of the Client.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">15. Confidentiality</p>
          <p className="mt-1">
            The Parties acknowledge that, during their relationship, they may share or gain access to information or
            documentation that is confidential or unpublished in nature. The Parties mutually commit to maintaining
            the confidentiality of all such information obtained during the term of this Agreement. No confidential
            information shall be disclosed to any third party without the prior written consent of the other Party.
            This obligation of confidentiality shall remain in effect both during and after the termination or
            conclusion of this Agreement.
          </p>
        </div>

        <div>
          <p className="font-semibold text-[var(--brand-ink)]">16. Miscellaneous</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li><strong>Governing Law:</strong> This Agreement shall be governed by and construed with the jurisdiction laws of the State of Maryland.</li>
            <li><strong>Notice:</strong> Any notice required by this Agreement shall be in writing and given by personal delivery, certified mail, or any such delivery service provided.</li>
            <li><strong>Modifications:</strong> The terms herein shall not be reformed, modified, or changed without the prior written consent of the parties. Billing rates and billable hours will only be assessed for modifications at the end of the contractual period (December 31st).</li>
            <li><strong>Force Majeure:</strong> Neither Party shall be liable for any failure in performance of any obligation under this Agreement due to causes beyond that Party's reasonable control, including pandemic, fire, strike, act or order of public authority, and other acts of God.</li>
            <li><strong>Severability:</strong> If any provision is held to be invalid, illegal, or unenforceable, such invalidity will not affect any other provisions, and all other provisions will remain in full force and effect.</li>
            <li><strong>Entirety:</strong> This Agreement sets forth and represents the entire agreement between both parties. Any changes must be in writing and signed by both parties.</li>
          </ul>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-5 text-[0.78rem] leading-6 text-[var(--brand-muted)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--brand-ink)]">
        {trackName} Subscription Service Agreement
      </p>

      <p>
        This {trackName} Subscription Service Agreement ("<strong>Agreement</strong>") is entered into as of{" "}
        <strong className="text-[var(--brand-ink)]">{agreementDate}</strong> between{" "}
        <strong>Sparing Consulting Inc.</strong>, a corporation with its principal place of business at 7230 Lee Deforest Dr Suite 202, Columbia, MD 21046 ("<strong>Company</strong>"), and{" "}
        <strong className="text-[var(--brand-ink)]">{companyName}</strong>, represented by{" "}
        <strong className="text-[var(--brand-ink)]">{signerName}</strong>,{" "}
        <strong className="text-[var(--brand-ink)]">{signerTitle}</strong> ("<strong>Client</strong>").
      </p>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">1. Services</p>
        <p className="mt-1">Sparing Consulting will provide the following ongoing support services under this Agreement:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {recommendation.included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {!isIcss && (
          <p className="mt-2">
            Agency notice management includes {ecssIncludedAgencyNotices} government or regulatory notices per calendar month. Additional notices are billed at {formatCurrency(ecssAdditionalAgencyNoticeFee)} each.
          </p>
        )}
        <p className="mt-2">
          The scope of services may be adjusted by mutual written agreement. Services not enumerated above may be quoted separately.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">2. Duration</p>
        <p className="mt-1">
          The term of this Agreement shall be the calendar year, automatically renewing on January 1 of the subsequent year. Upon renewal, the pricing may be subject to adjustments. Either party may amend or terminate this Agreement exclusively by January 31 of the new calendar year or within thirty (30) days following the execution of a new Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">3. Payment Terms</p>
        <p className="mt-1">
          Client agrees to pay{" "}
          {isSemiMonthlyContract ? (
            <>
              <strong className="text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice / 2)}/installment</strong>{" "}
              (<strong className="text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice)}/month</strong>)
            </>
          ) : (
            <strong className="text-[var(--brand-ink)]">{formatCurrency(recommendation.monthlyPrice)}/month</strong>
          )},
          {" "}billed on the schedule selected: <strong className="text-[var(--brand-ink)]">{scheduleText}</strong>.
          Invoices are due upon receipt. The Client authorises Sparing Consulting Inc. to automatically debit the designated payment method on file. This authorisation shall remain in effect for the duration of the Agreement unless revoked in writing with at least ten (10) business days' notice prior to a scheduled debit.
          A late fee of $50 or 1.5% of the outstanding balance, whichever is greater, may apply for overdue payments. Sparing reserves the right to suspend services for accounts 30 or more days past due. All fees are non-refundable except as otherwise required by applicable law.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">4. Termination</p>
        <p className="mt-1">
          Either party may terminate this Agreement with 30 days prior written notice. The Client may terminate without penalty within 30 days of signing or prior to January 31st in the event of service renewal. If termination occurs after January 31st, the Client agrees to pay Sparing Consulting Inc. the remaining fees due under the Agreement for the duration of the term. Sparing may terminate immediately upon material breach by Client.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">5. Client Responsibilities</p>
        <p className="mt-1">
          Client agrees to: (a) provide accurate and complete information as reasonably requested by Sparing; (b) respond to Sparing communications within five (5) business days; (c) maintain organised records and provide timely access to relevant documents, accounts, and credentials; and (d) promptly notify Sparing of any material changes to business operations, ownership, or structure. Failure to respond to more than three (3) separate inquiries may result in termination at the Client's expense.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">6. Confidentiality</p>
        <p className="mt-1">
          Each party agrees to hold in confidence all non-public, proprietary, or sensitive information disclosed by the other party in connection with this Agreement, and to use such information solely for purposes of performing obligations hereunder. This obligation survives termination of the Agreement.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">7. Limitation of Liability</p>
        <p className="mt-1">
          Sparing's aggregate liability to Client shall not exceed the total fees paid by Client in the 90-day period immediately preceding the event giving rise to the claim. In no event shall Sparing be liable for any indirect, incidental, special, punitive, or consequential damages. Each party agrees to indemnify, defend, and hold harmless the other from damages arising from their own acts or omissions.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">8. Intellectual Property</p>
        <p className="mt-1">
          All proprietary tools, templates, methodologies, workflows, and processes developed by Sparing remain its sole and exclusive property. Deliverables prepared specifically for Client are licensed for internal business use on a non-exclusive basis. Sparing shall not acquire ownership rights over information provided by the Client.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">9. Governing Law and Dispute Resolution</p>
        <p className="mt-1">
          This Agreement shall be governed by the laws of the State of{" "}
          <strong className="text-[var(--brand-ink)]">{stateName || "Maryland"}</strong>. The seat of arbitration shall be established in the State of Maryland. Any dispute shall first be subject to good-faith negotiation, and if unresolved within 30 days, shall be submitted to binding arbitration under a single arbitrator appointed by mutual agreement of the parties. The arbitrator's decision shall be final and binding on both parties.
        </p>
      </div>

      <div>
        <p className="font-semibold text-[var(--brand-ink)]">10. Miscellaneous</p>
        <p className="mt-1">
          This Agreement constitutes the entire agreement between the parties and supersedes all prior discussions and agreements. Any modification must be made in writing and signed by authorised representatives of both parties. If any provision is held unenforceable, the remaining provisions continue in full force. Neither party shall be liable for any failure in performance due to causes beyond their reasonable control, including pandemic, fire, strike, or acts of God.
        </p>
      </div>
    </div>
  );
}

// ── AnimatedPrice ─────────────────────────────────────────────────────────────

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

// ── PricingFlow ───────────────────────────────────────────────────────────────

export function PricingFlow() {
  const [step, setStep] = useState<Step>("location");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [contractScrolled, setContractScrolled] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const signatureBlockRef = useRef<HTMLDivElement>(null);
  const [pillVisible, setPillVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const threshold = 12;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 60) {
        setPillVisible(true);
      } else if (y > lastScrollY.current + threshold) {
        setPillVisible(false);
      } else if (y < lastScrollY.current - threshold) {
        setPillVisible(true);
      }
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleContractScroll = () => {
    const el = contractRef.current;
    if (!el || contractScrolled) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setContractScrolled(true);
    }
  };

  const selectedBusinessType: BusinessType = form.businessType || "startup";
  const employeeCount =
    form.businessType === "independent-contractor"
      ? 1
      : parseWholeNumber(form.employeeCount);
  const annualRevenue = parseWholeNumber(form.annualRevenue);

  const rawRecommendation = useMemo(
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

  // Revenue qualifies for OHSS — used to show the office-hours step and control back-nav.
  const isOhssByRevenue = rawRecommendation.serviceTrack === "ohss";
  const activeSteps = isOhssByRevenue ? ohssSteps : baseSteps;

  // If the user declined OHSS, compute an ECSS recommendation for display.
  const recommendation = useMemo(() => {
    if (isOhssByRevenue && form.ohssAccepted === false) {
      const ecssBusinessType = selectedBusinessType === "independent-contractor" ? "smb" : selectedBusinessType;
      return calculateRecommendation({
        businessType: ecssBusinessType,
        stateCode: form.stateCode,
        city: form.city,
        employeeCount: Math.max(employeeCount, 5),
        annualRevenue: ohssRevenueThreshold - 1,
      });
    }
    return rawRecommendation;
  }, [isOhssByRevenue, form.ohssAccepted, rawRecommendation, selectedBusinessType, form.stateCode, form.city, employeeCount]);

  const isOhss = recommendation.serviceTrack === "ohss";

  const companyName =
    form.companyName.trim() ||
    (form.businessType === "independent-contractor" ? "Your practice" : "Your business");

  const agreementDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const canContinue: Record<Step, boolean> = {
    location: Boolean(form.city.trim() && form.stateCode),
    company: Boolean(
      form.businessType &&
        (form.businessType === "independent-contractor" ||
          (form.companyName.trim() && employeeCount > 0)),
    ),
    budget: annualRevenue > 0,
    "office-hours": true,
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
        contractScrolled &&
        form.acceptsTerms &&
        form.signed,
    ),
    confirmation: true,
  };

  const nextStep = () => {
    setPillVisible(true);
    window.scrollTo({ top: 0 });
    setDirection(1);
    if (step === "location" && canContinue.location) {
      setStep("company");
    } else if (step === "company" && canContinue.company) {
      setStep("budget");
    } else if (step === "budget" && canContinue.budget) {
      if (isOhss) {
        const suggested = calculateOhssUnits(annualRevenue, employeeCount);
        updateField("officeHoursUnits", suggested > 0 ? suggested : 0);
        setStep("office-hours");
      } else {
        setStep("recommendation");
      }
    } else if (step === "office-hours" && canContinue["office-hours"]) {
      setStep("recommendation");
    } else if (step === "recommendation") {
      setStep("agreement");
    } else if (step === "agreement" && canContinue.agreement) {
      setStep("confirmation");
    }
  };

  const previousStep = () => {
    setPillVisible(true);
    window.scrollTo({ top: 0 });
    setDirection(-1);
    if (step === "company") setStep("location");
    else if (step === "budget") setStep("company");
    else if (step === "office-hours") setStep("budget");
    else if (step === "recommendation") setStep(isOhssByRevenue ? "office-hours" : "budget");
    else if (step === "agreement") setStep("recommendation");
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

  const ctaLabel =
    step === "budget"
      ? "See my plan"
      : step === "recommendation"
        ? "Continue to Agreement"
        : "Continue";

  const planBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(214,27,23,0.4)] bg-[rgba(214,27,23,0.15)] px-3 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
      <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
        {recommendation.serviceTrack.toUpperCase()}
      </span>
    </span>
  );

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{
        backgroundColor:
          step === "recommendation" ? "#111111"
          : step === "agreement" ? "#ffffff"
          : step === "confirmation" ? "#0d0d0f"
          : "#f2f2f4",
      }}
    >

      {/* ── Header ── */}
      {step !== "confirmation" && (() => {
        const isIntake = step === "location" || step === "company" || step === "budget" || step === "office-hours";
        const isDark = step === "recommendation";
        const isAgreement = step === "agreement";
        return (
          <header className="sticky top-0 z-20 flex justify-center px-4 pt-4 pointer-events-none">
            <motion.div
              className="pointer-events-auto flex w-full items-center justify-between rounded-2xl border"
              animate={{
                y: pillVisible ? 0 : -80,
                opacity: pillVisible ? 1 : 0,
                maxWidth: isIntake ? "50rem" : "62rem",
                paddingTop: isIntake ? "13px" : "14px",
                paddingBottom: isIntake ? "13px" : "14px",
                paddingLeft: isIntake ? "26px" : "28px",
                paddingRight: isIntake ? "26px" : "28px",
                backgroundColor: isDark
                  ? "rgba(36,36,36,0.93)"
                  : isAgreement
                  ? "rgba(20,20,20,1)"
                  : "rgba(23,23,23,0.82)",
                borderColor: isDark
                  ? "rgba(255,255,255,0.14)"
                  : isAgreement
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: isDark
                  ? "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)"
                  : isAgreement
                  ? "0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)"
                  : "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
              }}
              transition={{
                y: pillVisible
                  ? { type: "spring", stiffness: 400, damping: 30 }
                  : { duration: 0.22, ease: [0.4, 0, 1, 1] },
                opacity: pillVisible
                  ? { duration: 0.25 }
                  : { duration: 0.18 },
                default: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
              }}
              style={{ backdropFilter: isAgreement ? "none" : "blur(14px)" }}
            >
              {/* Logo */}
              <a href="https://sparingconsulting.com" target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center">
                <Image
                  src={logoWhite}
                  alt="Sparing Consulting"
                  priority
                  style={{
                    height: isIntake ? "34px" : "36px",
                    width: "auto",
                    transition: "height 0.5s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </a>

              {/* Right zone: nav links + actions */}
              <div className="flex items-center gap-4">

                {/* Centre nav — hidden on intake steps */}
                <AnimatePresence>
                  {!isIntake && (
                    <motion.div
                      key="nav-links"
                      className="flex items-center gap-5 border-r border-white/12 pr-4"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <a
                        href="https://sparingconsulting.com/about"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/55 transition hover:text-white/90"
                      >
                        About Us
                      </a>
                      <a
                        href="https://sparingconsulting.com/subscriptions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-xs text-white/55 transition hover:text-white/90"
                      >
                        Subscriptions
                        <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </a>
                      <a
                        href="https://sparingconsulting.com/services"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-xs text-white/55 transition hover:text-white/90"
                      >
                        Services
                        <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Client Portal */}
                <a
                  href="https://sparingconsulting.com/portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-white/55 transition hover:text-white/90"
                >
                  Client Portal
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>

                {/* Contact Us */}
                <a
                  href="https://sparingconsulting.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center rounded-full bg-white/12 px-3.5 text-xs font-medium text-white transition hover:bg-white/20"
                >
                  Contact Us
                </a>
              </div>
            </motion.div>
          </header>
        );
      })()}

      <AnimatePresence mode="wait" initial={false}>

        {/* ── CARD SHELL — steps 1–4 (location / company / budget / office-hours) ── */}
        {(step === "location" || step === "company" || step === "budget" || step === "office-hours") ? (
          <motion.div
            key="card-shell"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[calc(100vh-4rem)] bg-[#f2f2f4]"
          >
            <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-12">
              <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03),0_16px_40px_rgba(0,0,0,0.05)]">

                <div className="px-10 pt-11">
                  <ProgressBar step={step} steps={activeSteps} />
                </div>

                <div className="px-10 py-12">
                  <StepTransition stepKey={step} direction={direction}>

                    {/* ── Location ── */}
                    {step === "location" ? (
                      <>
                        <h2 className="text-[1.5rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--brand-ink)]">
                          Where is your business based?
                        </h2>
                        <div className="mt-8 space-y-6">
                          <DetailField label="State">
                            <DetailSelect
                              value={form.stateCode}
                              onChange={(e) => {
                                updateField("stateCode", e.target.value);
                                updateField("city", "");
                              }}
                              autoFocus
                            >
                              <option value="">Select a state</option>
                              {usStates.map((state) => (
                                <option key={state.code} value={state.code}>{state.name}</option>
                              ))}
                            </DetailSelect>
                          </DetailField>
                          <DetailField label="City">
                            <CityCombobox
                              stateCode={form.stateCode}
                              value={form.city}
                              onChange={(v) => updateField("city", v)}
                            />
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

                          {form.businessType === "startup" || form.businessType === "smb" ? (
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }} className="space-y-6">
                              <DetailField label="Business name">
                                <DetailInput
                                  value={form.companyName}
                                  onChange={(e) => updateField("companyName", e.target.value)}
                                  placeholder="e.g. Acme Corp"
                                  autoFocus
                                />
                              </DetailField>
                              <div className="space-y-3">
                                <DetailField label="Team size">
                                  <DetailInput
                                    inputMode="numeric"
                                    value={form.employeeCount}
                                    onChange={(e) => updateField("employeeCount", normalizeNumberInput(e.target.value))}
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
                        <div className="mt-8 space-y-5">
                          <DetailField label="Annual revenue">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--brand-muted)]">$</span>
                              <DetailInput
                                inputMode="numeric"
                                value={formatInlineNumber(form.annualRevenue)}
                                onChange={(e) => updateField("annualRevenue", normalizeNumberInput(e.target.value))}
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

                    {/* ── Office Hours (OHSS only) ── */}
                    {step === "office-hours" ? (
                      <>
                        {/* Recommendation framing banner */}
                        <div className="mb-5 flex items-start gap-3 rounded-[0.875rem] border border-[rgba(214,27,23,0.2)] bg-[var(--brand-red-soft)] px-4 py-3.5">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <div>
                            <p className="text-[0.78rem] font-semibold uppercase tracking-[0.12em] text-[var(--brand-red)]">Recommended for your business</p>
                            <p className="mt-0.5 text-sm text-[var(--brand-ink)]">Based on your revenue and business type, Office Hours gives you the dedicated advisory access most businesses at your stage benefit from.</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(214,27,23,0.3)] bg-[var(--brand-red-soft)] px-2.5 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                            <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">OHSS</span>
                          </span>
                          <h2 className="text-[1.5rem] font-semibold leading-snug tracking-[-0.025em] text-[var(--brand-ink)]">
                            Office Hours Support
                          </h2>
                        </div>
                        <p className="mt-2 text-sm text-[var(--brand-muted)]">
                          Dedicated advisory time with your Sparing advisor — 1 unit = 2 hrs / week.
                        </p>

                        {/* Unit counter */}
                        <div className="mt-6 flex items-center justify-between rounded-[1rem] border border-[var(--brand-line)] bg-[var(--brand-surface)] px-6 py-5">
                          <div>
                            <div className="text-[0.78rem] text-[var(--brand-muted)]">Weekly hours</div>
                            <div className="mt-0.5 text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--brand-ink)]">
                              {form.officeHoursUnits * 2} hrs
                            </div>
                            <div className="mt-1 text-xs text-[var(--brand-muted)]">
                              {form.officeHoursUnits} {form.officeHoursUnits === 1 ? "unit" : "units"}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateField("officeHoursUnits", Math.max(0.5, form.officeHoursUnits - 0.5))}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-muted)] transition hover:border-[var(--brand-line-strong)] hover:text-[var(--brand-ink)] disabled:opacity-40"
                              disabled={form.officeHoursUnits <= 0.5}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateField("officeHoursUnits", form.officeHoursUnits + 0.5)}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-muted)] transition hover:border-[var(--brand-line-strong)] hover:text-[var(--brand-ink)]"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Included — compact chips */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          {["Advisory sessions", "Compliance support", "Financial reporting", "Back-office coordination", "Custom deliverables"].map((item) => (
                            <span key={item} className="flex items-center gap-1.5 rounded-full border border-[var(--brand-line)] bg-[var(--brand-surface)] px-3 py-1 text-xs text-[var(--brand-muted)]">
                              <svg className="h-3 w-3 shrink-0 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              {item}
                            </span>
                          ))}
                        </div>

                        {/* Primary CTA + quiet decline + back */}
                        <div className="mt-8">
                          <PrimaryButton
                            onClick={() => { updateField("ohssAccepted", true); nextStep(); }}
                            className="w-full justify-center"
                          >
                            Include Office Hours
                          </PrimaryButton>
                          <div className="mt-4 text-center">
                            <button
                              type="button"
                              onClick={() => { updateField("ohssAccepted", false); nextStep(); }}
                              className="text-sm text-[var(--brand-muted)] transition hover:text-[var(--brand-ink)] hover:underline underline-offset-2"
                            >
                              No thanks, show me other options
                            </button>
                          </div>
                          <div className="mt-6 border-t border-[var(--brand-line)] pt-5">
                            <button
                              type="button"
                              onClick={previousStep}
                              className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                              </svg>
                              Back
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                  </StepTransition>
                </div>

                {/* Card CTA */}
                {step !== "office-hours" && (
                  <div className="border-t border-[var(--brand-line)] px-10 pb-12 pt-8">
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
                    <PrimaryButton
                      onClick={nextStep}
                      disabled={!canContinue[step]}
                      className="w-full justify-center"
                    >
                      {ctaLabel}
                    </PrimaryButton>
                  </div>
                )}

              </div>
            </div>
          </motion.div>

        ) : step === "recommendation" ? (

          /* ── RECOMMENDATION SHELL ── */
          <motion.div
            key="recommendation-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="min-h-[calc(100vh-4rem)]"
            style={{ background: "#111111" }}
          >
            {/* Dark hero */}
            <div className="mx-auto max-w-5xl px-8 lg:px-14">
              <div className="pt-10">
                <ProgressBar step={step} steps={activeSteps} inverted />
              </div>

              <div className="pb-20 pt-14">
                {/* Plan badge */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  {planBadge}
                </motion.div>

                {/* Price */}
                <>
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
                </>

                {/* Summary */}
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
                    form.businessType ? businessTypeLabels[form.businessType as BusinessType] : null,
                  ].filter(Boolean).map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/60"
                    >
                      {chip}
                    </span>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* White bottom sheet */}
            <div className="rounded-t-[2rem] bg-white pb-28 pt-12">
              <div className="mx-auto max-w-5xl px-8 lg:px-14">

                {/* Section label */}
                <motion.p
                  className="text-[0.68rem] font-semibold uppercase tracking-widest text-[var(--brand-muted)]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  What you get
                </motion.p>

                {/* ── Feature category grid ── */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {(recommendation.serviceTrack === "icss" ? [
                    {
                      category: "Bookkeeping",
                      iconPath: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
                      items: ["Historical setup & account cleanup", "Monthly reconciliation & financial statements", "QuickBooks setup and management"],
                    },
                    {
                      category: "Tax & Compliance",
                      iconPath: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
                      items: ["Federal & state agency notice management", "Quarterly tax estimation & payment support", "Good standing and compliance monitoring"],
                    },
                    {
                      category: "Payroll",
                      iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
                      items: ["Payroll setup and basic guidance", "Payroll tax support", "Limited worker onboarding"],
                    },
                    {
                      category: "Expense Tracking",
                      iconPath: "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L9.568 3zM6 6h.008v.008H6V6z",
                      items: ["Expense classification", "Receipt tracking and organisation"],
                    },
                  ] : recommendation.serviceTrack === "ecss" ? [
                    {
                      category: "Bookkeeping",
                      iconPath: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
                      items: ["Full monthly bookkeeping & reconciliation", "Audit-ready financial statements", "Accounts payable/receivable management"],
                    },
                    {
                      category: "Compliance",
                      iconPath: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
                      items: [`Agency notice management (${ecssIncludedAgencyNotices}/month)`, "Tax account support", "Operational compliance advisory"],
                    },
                    {
                      category: "Payroll",
                      iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
                      items: ["Payroll coordination and analysis", "Worker onboarding guidance", "Pre-paid expense management"],
                    },
                    {
                      category: "Growth Advisory",
                      iconPath: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
                      items: ["Revenue-based subscription scaling", "Back-office coordination", "Advisory for a growing operation"],
                    },
                  ] : [
                    {
                      category: "Advisory Sessions",
                      iconPath: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
                      items: ["Dedicated Sparing advisor", "Scheduled on-site or virtual sessions", "Custom advisory cadence"],
                    },
                    {
                      category: "Strategic Planning",
                      iconPath: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941",
                      items: ["Financial planning and reporting guidance", "Custom deliverables", "Project-based engagements"],
                    },
                    {
                      category: "Compliance",
                      iconPath: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
                      items: ["Operational and compliance support", "Regulatory guidance and monitoring"],
                    },
                    {
                      category: "Operations",
                      iconPath: "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
                      items: ["Full-service back-office coordination", "Systems and process optimisation"],
                    },
                  ]).map((cat, i) => (
                    <motion.div
                      key={cat.category}
                      className="rounded-xl border border-[var(--brand-line)] p-5"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.52 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-red-soft)]">
                          <svg className="h-3.5 w-3.5 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cat.iconPath} />
                          </svg>
                        </div>
                        <span className="text-[0.82rem] font-semibold text-[var(--brand-ink)]">{cat.category}</span>
                      </div>
                      <ul className="mt-3.5 space-y-2">
                        {cat.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-[0.8rem] leading-5 text-[var(--brand-muted)]">
                            <svg className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>

                {/* ── Trust anchor ── */}
                <motion.div
                  className="mt-10 flex items-start gap-5 border-y border-[var(--brand-line)] py-7"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.4 }}
                >
                  <div className="flex shrink-0 gap-0.5 pt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--brand-red)" }}>
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" />
                      </svg>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm leading-6 text-[var(--brand-ink)]">
                      &ldquo;Sparing took the back-office weight off our plate completely — we can focus on the work.&rdquo;
                    </p>
                    <p className="mt-1.5 text-xs text-[var(--brand-muted)]">— Founder, DC-based professional services firm</p>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* Sticky CTA bar */}
            <div
              className="sticky bottom-0 z-10 border-t border-[var(--brand-line)] px-8 py-4 lg:px-14"
              style={{ backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
            >
              <div className="mx-auto flex max-w-5xl items-center gap-4">
                <button
                  type="button"
                  onClick={previousStep}
                  className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)] transition hover:-translate-x-0.5 hover:text-[var(--brand-ink)]"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back
                </button>
                <div className="ml-auto">
                  <PrimaryButton onClick={nextStep}>
                    {ctaLabel}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </motion.div>

        ) : step === "agreement" ? (

          /* ── AGREEMENT SHELL ── */
          <motion.div
            key="agreement-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="min-h-[calc(100vh-4rem)] bg-white"
          >
            {/* Progress strip */}
            <div className="border-b border-[var(--brand-line)] px-8 py-6 lg:px-14">
              <div className="mx-auto max-w-5xl">
                <ProgressBar step={step} steps={activeSteps} />
              </div>
            </div>

            {/* Dark context band */}
            <div
              className="flex items-center px-8 py-5 lg:px-14"
              style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #2a1a1a 100%)" }}
            >
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(214,27,23,0.4)] bg-[rgba(214,27,23,0.15)] px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
                      {recommendation.serviceTrack.toUpperCase()}
                    </span>
                  </span>
                  <span className="text-sm text-white/50">{companyName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <span className="text-base font-bold text-white">
                    {formatCurrency(form.paymentSchedule === "semi-monthly" ? recommendation.monthlyPrice / 2 : recommendation.monthlyPrice)}
                    <span className="ml-0.5 text-xs font-normal text-white/50">
                      {form.paymentSchedule === "semi-monthly" ? "/installment" : "/mo"}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-5xl px-8 py-12 lg:px-14">
              <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">

                {/* LEFT — numbered sections */}
                <div>
                  {(() => {
                    const s1Done = !!(form.contactName && form.signerTitle && form.contactEmail && form.contactPhone);
                    const s2Done = !!(form.billingAddress && form.billingZip);
                    const s3Done = !!(form.cardName && form.cardNumber && form.expiry && form.cvc);
                    const s4Done = form.acceptsTerms;
                    return (
                      <>

                  {/* ① Your details */}
                  <ScrollReveal>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--page-bg)]"
                        animate={{ backgroundColor: s1Done ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
                        transition={{ duration: 0.4 }}
                      >1</motion.div>
                      <div className="mt-2 w-px flex-1 bg-[var(--brand-line)]" />
                    </div>
                    <div className="min-w-0 flex-1 pb-10">
                      <div className="mb-6 text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Your details</div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <DetailField label="Full name" done={!!form.contactName}>
                          <DetailInput value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="Your full name" autoFocus />
                        </DetailField>
                        <DetailField label="Title" done={!!form.signerTitle}>
                          <DetailInput value={form.signerTitle} onChange={(e) => updateField("signerTitle", e.target.value)} placeholder="Founder, Owner, CEO" />
                        </DetailField>
                        <DetailField label="Email" done={!!form.contactEmail}>
                          <DetailInput type="email" value={form.contactEmail} onChange={(e) => updateField("contactEmail", e.target.value)} placeholder="name@company.com" />
                        </DetailField>
                        <DetailField label="Phone" done={!!form.contactPhone}>
                          <DetailInput value={form.contactPhone} onChange={(e) => updateField("contactPhone", formatPhone(e.target.value))} placeholder="(555) 000-0000" />
                        </DetailField>
                      </div>
                    </div>
                  </div>
                  </ScrollReveal>

                  {/* ② Billing */}
                  <ScrollReveal delay={0.05}>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--page-bg)]"
                        animate={{ backgroundColor: s2Done ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
                        transition={{ duration: 0.4 }}
                      >2</motion.div>
                      <div className="mt-2 w-px flex-1 bg-[var(--brand-line)]" />
                    </div>
                    <div className="min-w-0 flex-1 pb-10">
                      <div className="mb-6 text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Billing address</div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <DetailField label="Street address" done={!!form.billingAddress}>
                            <DetailInput value={form.billingAddress} onChange={(e) => updateField("billingAddress", e.target.value)} placeholder="Street address" />
                          </DetailField>
                        </div>
                        <DetailField label="ZIP code" done={!!form.billingZip}>
                          <DetailInput value={form.billingZip} onChange={(e) => updateField("billingZip", formatZip(e.target.value))} placeholder="ZIP code" inputMode="numeric" />
                        </DetailField>
                      </div>
                    </div>
                  </div>
                  </ScrollReveal>

                  {/* ③ Payment */}
                  <ScrollReveal delay={0.05}>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--page-bg)]"
                        animate={{ backgroundColor: s3Done ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
                        transition={{ duration: 0.4 }}
                      >3</motion.div>
                      <div className="mt-2 w-px flex-1 bg-[var(--brand-line)]" />
                    </div>
                    <div className="min-w-0 flex-1 pb-10">
                      <div className="mb-6 flex items-center justify-between gap-3">
                        <span className="text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Payment</span>
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

                      {/* Payment schedule */}
                      <div className="mb-5">
                        <div className="mb-3 text-sm font-medium text-[var(--brand-ink)]">Payment schedule</div>
                        <div className="space-y-2">
                          {([
                            { id: "monthly-1st", label: "Monthly", sub: "Billed once per month, on the 1st" },
                            { id: "monthly-16th", label: "Monthly", sub: "Billed once per month, on the 16th" },
                            { id: "semi-monthly", label: "Semi-monthly", sub: "Billed on the 1st and 16th of each month" },
                          ] as { id: PaymentSchedule; label: string; sub: string }[]).map((option) => {
                            const selected = form.paymentSchedule === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateField("paymentSchedule", option.id)}
                                className={`flex w-full items-center gap-3 rounded-[0.75rem] border px-4 py-3 text-left transition duration-200 ${
                                  selected
                                    ? "border-[rgba(214,27,23,0.2)] bg-[var(--brand-red-soft)]"
                                    : "border-[var(--brand-line)] bg-[var(--brand-surface)] hover:border-[var(--brand-line-strong)]"
                                }`}
                              >
                                <motion.span
                                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                                  animate={{
                                    backgroundColor: selected ? "rgb(214,27,23)" : "transparent",
                                    borderColor: selected ? "rgb(214,27,23)" : "rgb(235,236,239)",
                                  }}
                                  style={{ border: "1.5px solid" }}
                                  transition={{ duration: 0.2 }}
                                >
                                  {selected && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                  )}
                                </motion.span>
                                <div>
                                  <div className={`text-sm font-medium ${selected ? "text-[var(--brand-red)]" : "text-[var(--brand-ink)]"}`}>
                                    {option.label}
                                  </div>
                                  <div className="text-xs text-[var(--brand-muted)]">{option.sub}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card preview */}
                      <CardPreview cardNumber={form.cardNumber} cardName={form.cardName} expiry={form.expiry} />

                      {/* Card details */}
                      <div className="grid gap-5">
                        <DetailField label="Name on card" done={!!form.cardName}>
                          <DetailInput value={form.cardName} onChange={(e) => updateField("cardName", e.target.value)} placeholder="Cardholder name" />
                        </DetailField>
                        <DetailField label="Card number" done={!!form.cardNumber}>
                          <DetailInput value={form.cardNumber} onChange={(e) => updateField("cardNumber", formatCardNumber(e.target.value))} placeholder="1234 1234 1234 1234" inputMode="numeric" />
                        </DetailField>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <DetailField label="Expiry" done={!!form.expiry}>
                            <DetailInput value={form.expiry} onChange={(e) => updateField("expiry", formatExpiry(e.target.value, form.expiry))} placeholder="MM/YY" />
                          </DetailField>
                          <DetailField label="CVC" done={!!form.cvc}>
                            <DetailInput value={form.cvc} onChange={(e) => updateField("cvc", formatCvc(e.target.value, form.cardNumber))} placeholder="CVC" inputMode="numeric" />
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
                  </ScrollReveal>

                  {/* ④ Review & Accept — inside left column so connector line flows through */}
                  <ScrollReveal delay={0.05}>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--page-bg)]"
                        animate={{ backgroundColor: s4Done ? "rgb(214,27,23)" : "rgb(23,23,23)" }}
                        transition={{ duration: 0.4 }}
                      >4</motion.div>
                    </div>
                    <div className="min-w-0 flex-1">
                  <div className="mb-5 text-[0.9rem] font-semibold tracking-[-0.01em] text-[var(--brand-ink)]">Review &amp; Accept</div>

                  <KeyTermsCard
                    agreementDate={agreementDate}
                    companyName={companyName}
                    recommendation={recommendation}
                    paymentSchedule={form.paymentSchedule}
                  />

                  {/* Contract header row */}
                  <div className="mb-2 flex items-center justify-end">
                    <AnimatePresence>
                      {!contractScrolled && (
                        <motion.button
                          key="jump-sig"
                          type="button"
                          onClick={() => {
                            const target = signatureBlockRef.current;
                            const box = contractRef.current;
                            if (box && target) {
                              box.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
                            }
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="inline-flex items-center gap-1 text-[0.7rem] text-[var(--brand-muted)] transition hover:text-[var(--brand-red)]"
                        >
                          Jump to signature
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <div
                      ref={contractRef}
                      onScroll={handleContractScroll}
                      className="h-72 overflow-y-auto rounded-[1rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-5"
                    >
                      <ContractBody
                        recommendation={recommendation}
                        form={form}
                        companyName={companyName}
                        agreementDate={agreementDate}
                        stateName={getStateName(form.stateCode)}
                      />
                      <div ref={signatureBlockRef}>
                        <SignatureBlock
                          name={form.contactName.trim() || "[Authorised Signatory]"}
                          title={form.signerTitle.trim() || "[Title]"}
                          date={agreementDate}
                          signed={form.signed}
                          onSign={() => updateField("signed", true)}
                        />
                      </div>
                      <div className="h-6" />
                    </div>
                    <AnimatePresence>
                      {!contractScrolled && (
                        <motion.div
                          key="fade"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 rounded-b-[1rem] bg-gradient-to-t from-[var(--brand-panel-muted)] to-transparent"
                        />
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {!contractScrolled && (
                      <motion.button
                        key="nudge"
                        type="button"
                        onClick={() => {
                          const box = contractRef.current;
                          if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
                        }}
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 text-[0.72rem] text-[var(--brand-muted)] transition hover:text-[var(--brand-red)]"
                      >
                        <svg className="h-3 w-3 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                        Scroll to read the full agreement
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <label
                    className={`mt-4 flex items-start gap-3 rounded-[1rem] border p-4 transition-colors duration-300 ${
                      contractScrolled
                        ? form.acceptsTerms
                          ? "cursor-pointer border-[rgba(214,27,23,0.25)] bg-[var(--brand-red-soft)]"
                          : "cursor-pointer border-[var(--brand-line)] bg-[var(--brand-panel-muted)] hover:border-[var(--brand-line-strong)]"
                        : "cursor-not-allowed border-[var(--brand-line)] bg-[var(--brand-panel-muted)] opacity-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.acceptsTerms}
                      disabled={!contractScrolled}
                      onChange={(e) => updateField("acceptsTerms", e.target.checked)}
                      className="sr-only"
                    />
                    <motion.div
                      className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[0.3rem]"
                      animate={{
                        backgroundColor: form.acceptsTerms ? "rgb(214,27,23)" : "transparent",
                        borderColor: form.acceptsTerms && contractScrolled ? "rgb(214,27,23)" : "rgb(235,236,239)",
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
                      {contractScrolled
                        ? <>I authorise Sparing Consulting to charge{" "}
                            <span className="font-semibold text-[var(--brand-ink)]">
                              {formatCurrency(form.paymentSchedule === "semi-monthly" ? recommendation.monthlyPrice / 2 : recommendation.monthlyPrice)}
                              {form.paymentSchedule === "semi-monthly" ? "/installment" : "/mo"}
                            </span>{" "}
                            to the card above, starting today. I have read and agree to the terms of this Agreement.</>
                        : "Scroll through the agreement above to enable authorisation."}
                    </span>
                  </label>
                    </div>
                  </div>
                  </ScrollReveal>

                      </> // end of IIFE return
                    );
                  })()}
                </div>

                {/* RIGHT — sticky order summary */}
                <div className="lg:sticky lg:top-28 lg:self-start">
                  <div className="rounded-[1rem] border border-[var(--brand-line)] bg-[var(--brand-panel-muted)] p-6">
                    <div className="text-sm font-semibold text-[var(--brand-ink)]">Order summary</div>

                    {/* Section progress dots */}
                    {(() => {
                      const s1Done = !!(form.contactName && form.signerTitle && form.contactEmail && form.contactPhone);
                      const s2Done = !!(form.billingAddress && form.billingZip);
                      const s3Done = !!(form.cardName && form.cardNumber && form.expiry && form.cvc);
                      const s4Done = form.acceptsTerms;
                      const steps = [
                        { label: "Details", done: s1Done },
                        { label: "Billing", done: s2Done },
                        { label: "Payment", done: s3Done },
                        { label: "Review", done: s4Done },
                      ];
                      return (
                        <div className="mt-4 flex w-full items-start">
                          {steps.map((s, i) => (
                            <div key={s.label} className="flex flex-1 items-start">
                              <div className="flex flex-col items-center gap-1">
                                <motion.div
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  animate={{ backgroundColor: s.done ? "rgb(214,27,23)" : "rgb(235,236,239)" }}
                                  transition={{ duration: 0.35 }}
                                />
                                <div className="text-[0.5rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">{s.label}</div>
                              </div>
                              {i < steps.length - 1 && (
                                <motion.div
                                  className="mt-[3px] mx-1 h-px flex-1"
                                  animate={{ backgroundColor: s.done ? "rgb(214,27,23)" : "rgb(235,236,239)" }}
                                  transition={{ duration: 0.35 }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="mt-4">
                      <div className="text-sm font-medium text-[var(--brand-ink)]">{companyName}</div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[rgba(214,27,23,0.2)] bg-[var(--brand-red-soft)] px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-red)]" />
                        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-[var(--brand-red)]">
                          {recommendation.serviceTrack.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-[var(--brand-line)] pt-5">
                      <div className="text-[2.4rem] font-bold leading-none tracking-[-0.04em] text-[var(--brand-ink)]">
                        {formatCurrency(form.paymentSchedule === "semi-monthly" ? recommendation.monthlyPrice / 2 : recommendation.monthlyPrice)}
                      </div>
                      <div className="mt-1.5 text-xs text-[var(--brand-muted)]">
                        {form.paymentSchedule === "semi-monthly" ? "per installment" : "per month"}
                      </div>
                    </div>

                    <div className="mt-4">
                      <SummaryRow label="Schedule" value={paymentScheduleLabel(form.paymentSchedule)} />
                      {form.paymentSchedule === "semi-monthly" ? (
                        <>
                          <SummaryRow label="Per installment" value={formatCurrency(recommendation.monthlyPrice / 2)} strong />
                          <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} />
                        </>
                      ) : (
                        <SummaryRow label="Monthly total" value={formatCurrency(recommendation.monthlyPrice)} strong />
                      )}
                    </div>

                  </div>
                </div>

              </div>

            </div>

            {/* CTA footer */}
            <div className="border-t border-[var(--brand-line)] px-8 pb-12 pt-8 lg:px-14">
              <div className="mx-auto max-w-5xl">
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
                <AnimatePresence mode="wait" initial={false}>
                  {!canContinue.agreement ? (
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
                      Complete the form and accept the agreement to continue
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cta-active"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <PrimaryButton
                        onClick={nextStep}
                        disabled={!canContinue.agreement}
                        className="w-full justify-center"
                        style={{ animation: "cta-celebrate 0.7s ease-out 0.2s 1" }}
                      >
                        Confirm &amp; start my plan
                      </PrimaryButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

          </motion.div>

        ) : (

          /* ── CONFIRMATION SHELL ── */
          <motion.div
            key="confirmation-shell"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex min-h-screen flex-col items-center justify-center px-6 py-20"
            style={{ background: "linear-gradient(160deg, #0d0d0f 0%, #1a0808 40%, #0d0d0f 100%)" }}
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image src={logoWhite} alt="Sparing Consulting" priority style={{ height: "30px", width: "auto" }} />
            </motion.div>

            {/* Success ring + checkmark */}
            <motion.div
              className="relative mt-12 flex h-24 w-24 items-center justify-center rounded-full"
              style={{ background: "rgba(214,27,23,0.12)", border: "1px solid rgba(214,27,23,0.25)" }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Outer pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "1px solid rgba(214,27,23,0.35)" }}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ delay: 0.7, duration: 1.0, ease: "easeOut" }}
              />
              <svg className="h-10 w-10 text-[var(--brand-red)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.55, duration: 0.65, ease: "easeOut" }}
                />
              </svg>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="mt-8 text-center text-[clamp(2.8rem,5vw,4.2rem)] font-bold leading-none tracking-[-0.05em] text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              You&apos;re signed.
            </motion.h1>

            <motion.p
              className="mt-3 text-center text-sm text-white/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.4 }}
            >
              Welcome aboard{form.contactName ? `, ${form.contactName.split(" ")[0]}` : ""}. Your plan starts today.
            </motion.p>

            {/* Plan badge */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.4 }}
            >
              {planBadge}
            </motion.div>

            {/* Glass details card */}
            <motion.div
              className="mt-8 w-full max-w-sm overflow-hidden rounded-2xl border border-white/10"
              style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)" }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.82, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {[
                ["Company", companyName],
                ["Plan", recommendation.serviceTrack.toUpperCase()],
                [
                  form.paymentSchedule === "semi-monthly" ? "Per installment" : "Monthly fee",
                  formatCurrency(form.paymentSchedule === "semi-monthly" ? recommendation.monthlyPrice / 2 : recommendation.monthlyPrice),
                ],
                ["Schedule", paymentScheduleLabel(form.paymentSchedule)],
                ["Signed", agreementDate],
                ["Contact", form.contactEmail],
              ].map(([label, value], i) => (
                <motion.div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-3.5 last:border-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.88 + i * 0.055, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="text-xs text-white/35">{label}</span>
                  <span className="text-right text-sm font-medium text-white/75">{value}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Email confirmation */}
            <motion.div
              className="mt-6 flex items-center gap-2 text-xs text-white/35"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.18, duration: 0.5 }}
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              A signed copy has been sent to{" "}
              <span className="text-white/55">{form.contactEmail || "your email"}</span>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25, duration: 0.45 }}
            >
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/6 px-6 text-sm font-medium text-white/70 transition duration-200 hover:bg-white/10 hover:text-white"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download agreement
              </button>
              <a
                href="https://sparingconsulting.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--brand-red)] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(214,27,23,0.3)] transition duration-200 hover:-translate-y-px hover:bg-[var(--brand-red-deep)] hover:shadow-[0_12px_32px_rgba(214,27,23,0.38)]"
              >
                Visit sparingconsulting.com
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </motion.div>
          </motion.div>

        )}

      </AnimatePresence>
    </div>
  );
}
