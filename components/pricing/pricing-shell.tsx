import type { ComponentProps, ReactNode } from "react";
import {
  AmbientSceneLayer,
  type FunnelSceneStage,
} from "@/components/pricing/pricing-webgl";

type StepItem = {
  id: string;
  label: string;
};

type ProgressTrackerProps = {
  current: number;
  steps: StepItem[];
};

type FieldProps = {
  label: string;
  helper?: string;
  children: ReactNode;
};

type ChoiceCardProps = ComponentProps<"button"> & {
  title: string;
  description: string;
  selected?: boolean;
  eyebrow?: string;
  detail?: string;
};

type ButtonProps = ComponentProps<"button">;

const primaryButtonClasses =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--brand-red)] bg-[var(--brand-red)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(214,27,23,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-[var(--brand-red-deep)] hover:shadow-[0_18px_42px_rgba(214,27,23,0.18)] focus-visible:shadow-[0_0_0_4px_rgba(214,27,23,0.1),0_18px_42px_rgba(214,27,23,0.16)] disabled:cursor-not-allowed disabled:opacity-45";

const secondaryButtonClasses =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white px-6 py-3 text-sm font-semibold text-[var(--brand-ink)] shadow-[0_10px_26px_rgba(18,23,33,0.04)] transition duration-300 hover:-translate-y-0.5 hover:border-[var(--brand-line-strong)] hover:bg-[var(--page-surface-muted)] hover:shadow-[0_14px_30px_rgba(18,23,33,0.06)] focus-visible:shadow-[0_0_0_4px_rgba(122,136,160,0.1),0_14px_30px_rgba(18,23,33,0.06)] disabled:cursor-not-allowed disabled:opacity-45";

export function PageFrame({
  children,
  stage = "intro",
}: {
  children: ReactNode;
  stage?: FunnelSceneStage;
}) {
  return (
    <div className="relative overflow-hidden">
      <AmbientSceneLayer
        stage={stage}
        variant="background"
        intensity={stage === "secure" ? 0.35 : 0.56}
        className="scene-layer-background"
      />
      <div className="signal-field pointer-events-none absolute inset-0" />
      <div className="stage-glow left-[-11rem] top-[-4rem] h-72 w-72 bg-[rgba(214,27,23,0.04)]" />
      <div className="stage-glow right-[-14rem] top-10 h-[28rem] w-[28rem] bg-[rgba(121,143,190,0.08)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

export function BrandBar({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[90rem] rounded-[1.8rem] border border-[rgba(223,229,239,0.9)] bg-[rgba(255,255,255,0.8)] px-5 py-4 shadow-[0_14px_36px_rgba(18,23,33,0.05)] backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6">{children}</div>
      </div>
    </header>
  );
}

export function BackButton({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-8 inline-flex items-center gap-2 rounded-full border border-transparent px-2 py-1 text-sm font-medium text-[var(--brand-muted)] transition duration-300 hover:-translate-x-0.5 hover:text-[var(--brand-ink)] focus-visible:border-[var(--brand-line)] focus-visible:bg-white focus-visible:text-[var(--brand-ink)]"
    >
      <span aria-hidden="true">{"<"}</span>
      {label}
    </button>
  );
}

export function FlowFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto max-w-[90rem] px-5 sm:px-6 lg:px-10 ${className}`}>{children}</div>;
}

export function SplitStage({
  main,
  aside,
}: {
  main: ReactNode;
  aside: ReactNode;
}) {
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_21rem]">{main}{aside}</div>;
}

export function ProgressTracker({ current, steps }: ProgressTrackerProps) {
  const currentSafe = Math.max(current, 1);

  return (
    <div className="rounded-[1.7rem] border border-[rgba(223,229,239,0.92)] bg-[rgba(255,255,255,0.86)] px-5 py-4 shadow-[0_12px_28px_rgba(18,23,33,0.04)] backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--brand-red)]">
          Intake progress
        </div>
        <div className="rounded-full border border-[var(--brand-line)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-muted)]">
          {currentSafe}/{steps.length}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="relative min-w-[42rem]">
          <div className="absolute left-0 right-0 top-[0.9rem] h-px bg-[rgba(214,221,232,0.92)]" />
          <div
            className="absolute left-0 top-[0.9rem] h-px bg-[linear-gradient(90deg,var(--brand-red),rgba(214,27,23,0.2),rgba(113,132,162,0.65))] transition-all duration-500"
            style={{ width: `${(currentSafe / steps.length) * 100}%` }}
          />
          <div className="relative grid grid-cols-6 gap-4">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const complete = stepNumber < currentSafe;
              const active = stepNumber === currentSafe;

              return (
                <div key={step.id} className="pt-0.5">
                  <div
                    className={`mb-3 flex h-7 w-7 items-center justify-center rounded-full border text-[0.66rem] font-semibold transition ${
                      active
                        ? "border-[var(--brand-red)] bg-[var(--brand-red)] text-white shadow-[0_8px_18px_rgba(214,27,23,0.14)]"
                        : complete
                          ? "border-[rgba(214,27,23,0.16)] bg-[rgba(214,27,23,0.06)] text-[var(--brand-red)]"
                          : "border-[var(--brand-line)] bg-white text-[var(--brand-muted)]"
                    }`}
                  >
                    {stepNumber}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">{step.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StagePanel({
  children,
  className = "",
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  tone?: "light" | "strong" | "night";
}) {
  const toneClass =
    tone === "night"
      ? "panel-night border border-white/10 text-white"
      : tone === "strong"
        ? "panel-shell-strong border border-[rgba(223,229,239,0.92)]"
        : "bg-transparent";

  return <section className={`rounded-[2rem] ${toneClass} ${className}`}>{children}</section>;
}

export function AsideStack({ children }: { children: ReactNode }) {
  return <div className="space-y-5 xl:sticky xl:top-24">{children}</div>;
}

export function InfoPanel({
  title,
  children,
  tone = "light",
}: {
  title: string;
  children: ReactNode;
  tone?: "light" | "warm" | "night";
}) {
  const toneClass =
    tone === "night"
      ? "panel-night border border-white/10 text-white"
      : tone === "warm"
        ? "border border-[rgba(233,222,207,0.92)] bg-[linear-gradient(180deg,rgba(255,249,242,0.98),rgba(255,255,255,0.98))]"
        : "border border-[rgba(223,229,239,0.92)] bg-[rgba(255,255,255,0.9)]";

  return (
    <div className={`rounded-[1.75rem] p-6 ${toneClass}`}>
      <h3 className={`font-display text-[1.7rem] leading-none ${tone === "night" ? "text-white" : "text-[var(--brand-ink)]"}`}>
        {title}
      </h3>
      <div className={`mt-4 space-y-3 text-sm leading-7 ${tone === "night" ? "text-white/72" : "text-[var(--brand-muted)]"}`}>
        {children}
      </div>
    </div>
  );
}

export function Eyebrow({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${
        tone === "dark"
          ? "border-white/14 bg-white/8 text-white/76"
          : "border-[rgba(223,229,239,0.92)] bg-white text-[var(--brand-red)]"
      }`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <Eyebrow tone={tone === "dark" ? "dark" : "light"}>{eyebrow}</Eyebrow> : null}
      <h1
        className={`mt-4 text-balance text-[clamp(2.6rem,5.7vw,5.2rem)] leading-[0.92] ${
          tone === "dark" ? "text-white" : "text-[var(--brand-ink)]"
        }`}
      >
        {title}
      </h1>
      <p
        className={`mt-5 max-w-2xl text-[1rem] leading-8 ${
          align === "center" ? "mx-auto" : ""
        } ${tone === "dark" ? "text-white/72" : "text-[var(--brand-muted)]"}`}
      >
        {description}
      </p>
    </div>
  );
}

export function EditorialRule() {
  return <div className="editorial-rule" />;
}

export function Field({ label, helper, children }: FieldProps) {
  return (
    <label className="block space-y-3">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--brand-ink)]">{label}</span>
        {helper ? <span className="text-[0.68rem] uppercase tracking-[0.14em] text-[var(--brand-muted)]">{helper}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`min-h-15 w-full rounded-[1.25rem] border border-[var(--brand-line)] bg-white px-5 text-[15px] text-[var(--brand-ink)] shadow-[0_6px_14px_rgba(18,23,33,0.025)] transition duration-300 placeholder:text-[var(--brand-muted)] hover:border-[var(--brand-line-strong)] hover:shadow-[0_10px_18px_rgba(18,23,33,0.035)] focus:border-[rgba(214,27,23,0.28)] focus:shadow-[0_0_0_4px_rgba(214,27,23,0.05),0_14px_26px_rgba(18,23,33,0.04)] ${
        props.className ?? ""
      }`}
    />
  );
}

export function SelectInput(props: ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`min-h-15 w-full rounded-[1.25rem] border border-[var(--brand-line)] bg-white px-5 text-[15px] text-[var(--brand-ink)] shadow-[0_6px_14px_rgba(18,23,33,0.025)] transition duration-300 hover:border-[var(--brand-line-strong)] hover:shadow-[0_10px_18px_rgba(18,23,33,0.035)] focus:border-[rgba(214,27,23,0.28)] focus:shadow-[0_0_0_4px_rgba(214,27,23,0.05),0_14px_26px_rgba(18,23,33,0.04)] ${
        props.className ?? ""
      }`}
    />
  );
}

export function ChoiceCard({
  title,
  description,
  selected,
  eyebrow,
  detail,
  className,
  ...props
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      className={`group rounded-[1.3rem] border p-5 text-left transition duration-300 focus-visible:shadow-[0_0_0_4px_rgba(214,27,23,0.07)] ${
        selected
          ? "border-[rgba(214,27,23,0.24)] bg-[linear-gradient(180deg,rgba(255,249,248,0.98),rgba(255,255,255,0.98))] shadow-[0_14px_24px_rgba(214,27,23,0.045)]"
          : "border-[var(--brand-line)] bg-white hover:border-[var(--brand-line-strong)] hover:shadow-[0_10px_16px_rgba(18,23,33,0.035)]"
      } ${className ?? ""}`}
      {...props}
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          {eyebrow ? (
            <div className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
              {eyebrow}
            </div>
          ) : null}
          <h3 className="text-lg font-semibold text-[var(--brand-ink)]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{description}</p>
        </div>
        <span
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-[var(--brand-red)] bg-[var(--brand-red)]"
              : "border-[var(--brand-line)] bg-white group-hover:border-[var(--brand-line-strong)]"
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-white" : "bg-transparent"}`} />
        </span>
      </div>
      {detail ? <div className="mt-5 text-xs uppercase tracking-[0.16em] text-[var(--brand-muted)]">{detail}</div> : null}
    </button>
  );
}

export function PrimaryButton({ className, ...props }: ButtonProps) {
  return <button className={`${primaryButtonClasses} ${className ?? ""}`} {...props} />;
}

export function SecondaryButton({ className, ...props }: ButtonProps) {
  return <button className={`${secondaryButtonClasses} ${className ?? ""}`} {...props} />;
}

export function SummaryRow({
  label,
  value,
  emphasis = false,
  tone = "light",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "light" | "night";
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className={`text-sm leading-6 ${tone === "night" ? "text-white/62" : "text-[var(--brand-muted)]"}`}>{label}</span>
      <span className={`max-w-[14rem] text-right text-sm leading-6 ${tone === "night" ? (emphasis ? "font-semibold text-white" : "text-white/88") : emphasis ? "font-semibold text-[var(--brand-ink)]" : "text-[var(--brand-ink)]"}`}>
        {value}
      </span>
    </div>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--brand-muted)]">
          <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand-red)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Divider() {
  return <div className="my-6 h-px w-full bg-[rgba(223,229,239,0.94)]" />;
}
