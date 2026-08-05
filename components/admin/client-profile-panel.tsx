"use client";

import { useEffect, useState } from "react";
import { ONBOARDING_STEPS, isStepSatisfied, type OnboardingSignals } from "@/lib/onboarding";
import type { Client, ClientDocument } from "@/lib/supabase/types";

/* ── Field rows ──────────────────────────────────────────────────────────── */

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b px-5 py-2.5 last:border-0" style={{ borderColor: "#f3f4f6" }}>
      <span className="shrink-0 text-[0.72rem] font-medium" style={{ color: "#9ca3af" }}>{label}</span>
      <span
        className="min-w-0 text-right text-[0.82rem]"
        style={{ color: value ? "#171717" : "#d1d5db", fontStyle: value ? undefined : "italic" }}
      >
        {value || "Not provided"}
      </span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: "#ebecef" }}>
      <div className="border-b px-5 py-2.5" style={{ borderColor: "#f3f4f6", background: "#f8f8f9" }}>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em]" style={{ color: "#6b7280" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────── */

/**
 * Read surface for everything the client supplies during portal onboarding.
 * Progress is derived from the data with the same predicate the portal uses, so
 * this panel and the client's own checklist can never disagree.
 */
export function ClientProfilePanel({
  client, documents,
}: { client: Client; documents: ClientDocument[] }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!client.logo_path) { setLogoUrl(null); return; }
    let cancelled = false;
    fetch(`/api/admin/signed-url?path=${encodeURIComponent(client.logo_path)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: { url?: string } | null) => { if (!cancelled) setLogoUrl(d?.url ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [client.logo_path]);

  const signals: OnboardingSignals = {
    logo_path:                client.logo_path,
    primary_contact_name:     client.primary_contact_name,
    primary_contact_email:    client.primary_contact_email,
    entity_type:              client.entity_type,
    industry:                 client.industry,
    fiscal_year_end:          client.fiscal_year_end,
    preferred_contact_method: client.preferred_contact_method,
    uploadCount:              documents.filter((d) => d.type === "Upload").length,
  };

  const satisfied = ONBOARDING_STEPS.filter((s) => isStepSatisfied(s.id, signals));
  const complete  = satisfied.length === ONBOARDING_STEPS.length;

  return (
    <div className="mb-10 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#ebecef" }}>
      {/* Header + progress */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
        <div className="flex items-center gap-3.5">
          {logoUrl ? (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border"
              style={{ borderColor: "#ebecef", background: "#fff" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={`${client.company_name ?? client.full_name} logo`} className="max-h-[38px] max-w-[38px] object-contain" />
            </div>
          ) : (
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed text-[0.55rem] font-semibold uppercase"
              style={{ borderColor: "#d8dbe1", color: "#d1d5db" }}
            >
              No logo
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "#171717" }}>Client profile</h2>
            <p className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
              Collected from the client during portal onboarding
            </p>
          </div>
        </div>

        <span
          className="shrink-0 rounded-full px-3 py-1 text-[0.68rem] font-bold tabular-nums"
          style={{
            background: complete ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)",
            color:      complete ? "#059669" : "#d97706",
          }}
        >
          {satisfied.length} of {ONBOARDING_STEPS.length} steps complete
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
        <Group title="Primary contact">
          <Row label="Name"  value={client.primary_contact_name} />
          <Row label="Title" value={client.primary_contact_title} />
          <Row label="Email" value={client.primary_contact_email} />
          <Row label="Phone" value={client.primary_contact_phone} />
        </Group>

        <Group title="Business">
          <Row label="Entity type"      value={client.entity_type} />
          <Row label="Industry"         value={client.industry} />
          <Row label="Team size"        value={client.employee_range} />
          <Row label="Fiscal year ends" value={client.fiscal_year_end} />
        </Group>

        <Group title="Communication">
          <Row label="Preferred"  value={client.preferred_contact_method} />
          <Row label="Best time"  value={client.best_time_to_reach} />
          <Row label="Time zone"  value={client.client_timezone} />
          <Row label="Files sent" value={String(signals.uploadCount)} />
        </Group>
      </div>
    </div>
  );
}
