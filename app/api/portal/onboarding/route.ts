import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADVISOR_NAME, ADVISOR_EMAIL } from "@/lib/advisor";
import {
  WRITABLE_FIELDS,
  FIELD_BY_KEY,
  STEP_IDS,
  STEP_BY_ID,
  computeProgress,
  deriveSteps,
  validateLogo,
  type OnboardingSignals,
  type OnboardingStepId,
  type StepOverrides,
  type WritableField,
} from "@/lib/onboarding";
import { NextResponse, type NextRequest } from "next/server";

type Admin = ReturnType<typeof createAdminClient>;

/** Postgres codes that mean "the migration hasn't been applied yet". */
const MISSING_SCHEMA = new Set(["42703", "42P01"]);

function isMissingSchema(err: { code?: string } | null): boolean {
  return !!err?.code && MISSING_SCHEMA.has(err.code);
}

const SCHEMA_HINT =
  "Onboarding schema not found. Apply supabase/migrations/20260729_client_onboarding.sql to the Supabase project.";

/* ── State assembly ──────────────────────────────────────────────────────── */

interface ClientShape {
  full_name:     string | null;
  email:         string | null;
  company_name:  string | null;
  service_track: string | null;
  signer_title:  string | null;
  advisor_id:    string | null;
  signed_at:     string | null;
  [key: string]: unknown;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

/**
 * Build the full payload the overlay needs, in one shot: derived step state,
 * prefill values, prefill suggestions, a signed logo URL, and the identity bits
 * the welcome pane greets with.
 *
 * Also self-heals `completed_at` — stamping it when everything is resolved and
 * clearing it if data later disappears — so the flag can never disagree with
 * the underlying data.
 */
async function buildState(admin: Admin, clientId: string) {
  const { data: clientRow, error: clientErr } = await admin
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr || !clientRow) {
    return { error: "Client not found", status: 404 as const };
  }
  const client = clientRow as ClientShape;

  /* Onboarding row — tolerate a missing table so the portal still renders. */
  const { data: obRow, error: obErr } = await admin
    .from("client_onboarding")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  const schemaReady = !isMissingSchema(obErr) && client.logo_path !== undefined;

  const overrides: StepOverrides = {};
  const rawSteps = (obRow?.steps ?? {}) as Record<string, string>;
  for (const id of STEP_IDS) {
    if (rawSteps[id] === "skipped") overrides[id] = "skipped";
  }

  /* Client-provided documents (the contract is created by us, so it's excluded
     by filtering on type). */
  const { count: uploadCount } = await admin
    .from("client_documents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("type", "Upload");

  const signals: OnboardingSignals = {
    logo_path:                str(client.logo_path),
    primary_contact_name:     str(client.primary_contact_name),
    primary_contact_email:    str(client.primary_contact_email),
    entity_type:              str(client.entity_type),
    industry:                 str(client.industry),
    fiscal_year_end:          str(client.fiscal_year_end),
    preferred_contact_method: str(client.preferred_contact_method),
    uploadCount:              uploadCount ?? 0,
  };

  const steps    = deriveSteps(signals, overrides);
  const progress = computeProgress(steps);

  /* Keep completed_at in sync with reality. */
  if (schemaReady && obRow) {
    if (progress.complete && !obRow.completed_at) {
      await admin
        .from("client_onboarding")
        .update({ completed_at: new Date().toISOString() })
        .eq("client_id", clientId);
      obRow.completed_at = new Date().toISOString();
    } else if (!progress.complete && obRow.completed_at) {
      await admin
        .from("client_onboarding")
        .update({ completed_at: null, celebrated_at: null })
        .eq("client_id", clientId);
      obRow.completed_at  = null;
      obRow.celebrated_at = null;
    }
  }

  /* Prefill values for the form fields. */
  const values: Partial<Record<WritableField, string>> = {};
  for (const key of WRITABLE_FIELDS) {
    const v = str(client[key]);
    if (v) values[key] = v;
  }

  /* Signed URL for the logo — the bucket is private. */
  let logoUrl: string | null = null;
  if (signals.logo_path) {
    const { data } = await admin.storage
      .from("client-documents")
      .createSignedUrl(signals.logo_path, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }

  /* Advisor, for the welcome and completion panes. */
  let advisor = { name: ADVISOR_NAME, email: ADVISOR_EMAIL, title: "Advisor" };
  if (client.advisor_id) {
    const { data } = await admin
      .from("advisors")
      .select("name, email, title")
      .eq("id", client.advisor_id)
      .maybeSingle();
    if (data) advisor = { name: data.name, email: data.email, title: data.title ?? "Advisor" };
  }

  return {
    payload: {
      schemaReady,
      steps,
      progress,
      values,
      /* "Same as me" prefill for the primary-contact step. */
      suggestions: {
        primary_contact_name:  client.full_name    ?? "",
        primary_contact_email: client.email        ?? "",
        primary_contact_title: client.signer_title ?? "",
      },
      logoUrl,
      welcomedAt:   obRow?.welcomed_at   ?? null,
      dismissedAt:  obRow?.dismissed_at  ?? null,
      completedAt:  obRow?.completed_at  ?? null,
      celebratedAt: obRow?.celebrated_at ?? null,
      lastStep:     (obRow?.last_step as OnboardingStepId | null) ?? null,
      client: {
        firstName:    (client.full_name ?? "").split(" ")[0] ?? "",
        fullName:     client.full_name    ?? "",
        companyName:  client.company_name ?? "",
        serviceTrack: client.service_track ?? "",
        signedAt:     client.signed_at    ?? null,
      },
      advisor,
      uploadCount: signals.uploadCount,
    },
  };
}

async function respond(admin: Admin, clientId: string) {
  const result = await buildState(admin, clientId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.payload);
}

/** Create the onboarding row if absent, then apply a partial update. */
async function upsertOnboarding(
  admin: Admin,
  clientId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("client_onboarding")
    .upsert({ client_id: clientId, ...patch }, { onConflict: "client_id" });
  return error;
}

/* ── GET — full onboarding state ─────────────────────────────────────────── */

export async function GET() {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return respond(createAdminClient(), session.clientId);
}

/* ── PATCH — save one step's fields ──────────────────────────────────────────
   Body: { step: OnboardingStepId, values: Record<field, string> }
   Fields are whitelisted per step and select/radio values are checked against
   their option list, so a tampered payload can't write arbitrary columns. */

export async function PATCH(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { step?: string; values?: Record<string, unknown> };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const step = body.step as OnboardingStepId | undefined;
  if (!step || !(STEP_IDS as readonly string[]).includes(step)) {
    return NextResponse.json({ error: "Unknown step" }, { status: 400 });
  }

  const admin  = createAdminClient();
  const patch: Record<string, string | null> = {};
  const raw    = body.values ?? {};

  if (step === "logo") {
    /* The file is uploaded straight to storage by the browser; we only record
       the path, and only inside this client's own namespace. */
    const path = typeof raw.logo_path === "string" ? raw.logo_path : "";
    if (path) {
      const allowed = new RegExp(`^${session.clientId}/branding/[A-Za-z0-9._-]+$`);
      if (!allowed.test(path)) {
        return NextResponse.json({ error: "Invalid logo path" }, { status: 422 });
      }
      const invalid = validateLogo(path, 0);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 422 });
    }

    /* Drop the superseded file on both replace and clear, so branding/ can't
       accumulate orphans. */
    const { data: prev } = await admin
      .from("clients").select("logo_path").eq("id", session.clientId).maybeSingle();
    const prevPath = (prev as { logo_path?: string | null } | null)?.logo_path;
    if (prevPath && prevPath !== path) {
      await admin.storage.from("client-documents").remove([prevPath]);
    }

    patch.logo_path = path || null;
  } else {
    const allowedKeys = new Set(STEP_BY_ID[step].fields.map((f) => f.key));
    for (const [key, value] of Object.entries(raw)) {
      if (!allowedKeys.has(key as WritableField)) continue;

      const def = FIELD_BY_KEY[key as WritableField];
      const v   = typeof value === "string" ? value.trim() : "";

      if (v && def?.options && !def.options.includes(v)) {
        return NextResponse.json({ error: `Invalid value for ${def.label}` }, { status: 422 });
      }
      if (v && def?.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
      }
      if (v.length > 200) {
        return NextResponse.json({ error: `${def?.label ?? "Value"} is too long.` }, { status: 422 });
      }
      patch[key] = v || null;
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("clients").update(patch).eq("id", session.clientId);
    if (error) {
      return NextResponse.json(
        { error: isMissingSchema(error) ? SCHEMA_HINT : error.message },
        { status: isMissingSchema(error) ? 503 : 500 },
      );
    }
  }

  /* Saving a step clears any earlier "skipped" choice for it. */
  const { data: obRow } = await admin
    .from("client_onboarding").select("steps").eq("client_id", session.clientId).maybeSingle();
  const steps = { ...((obRow?.steps ?? {}) as Record<string, string>) };
  delete steps[step];

  const obErr = await upsertOnboarding(admin, session.clientId, {
    steps,
    last_step:   step,
    welcomed_at: new Date().toISOString(),
  });
  if (isMissingSchema(obErr)) {
    return NextResponse.json({ error: SCHEMA_HINT }, { status: 503 });
  }

  return respond(admin, session.clientId);
}

/* ── POST — flow actions ─────────────────────────────────────────────────────
   Body: { action: "welcomed" | "dismiss" | "reopen" | "celebrated" | "skip" | "unskip",
           step?: OnboardingStepId } */

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; step?: string };
  try { body = await req.json() as typeof body; }
  catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const admin = createAdminClient();
  const now   = new Date().toISOString();
  let patch: Record<string, unknown>;

  switch (body.action) {
    case "welcomed":
      patch = { welcomed_at: now };
      break;
    case "dismiss":
      patch = { dismissed_at: now, welcomed_at: now };
      break;
    case "reopen":
      patch = { dismissed_at: null };
      break;
    case "celebrated":
      patch = { celebrated_at: now };
      break;
    case "skip":
    case "unskip": {
      const step = body.step as OnboardingStepId | undefined;
      if (!step || !(STEP_IDS as readonly string[]).includes(step)) {
        return NextResponse.json({ error: "Unknown step" }, { status: 400 });
      }
      if (body.action === "skip" && !STEP_BY_ID[step].skippable) {
        return NextResponse.json({ error: "This step can't be skipped" }, { status: 422 });
      }
      const { data: obRow } = await admin
        .from("client_onboarding").select("steps").eq("client_id", session.clientId).maybeSingle();
      const steps = { ...((obRow?.steps ?? {}) as Record<string, string>) };
      if (body.action === "skip") steps[step] = "skipped";
      else delete steps[step];
      patch = { steps, last_step: step };
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const err = await upsertOnboarding(admin, session.clientId, patch);
  if (err) {
    return NextResponse.json(
      { error: isMissingSchema(err) ? SCHEMA_HINT : err.message },
      { status: isMissingSchema(err) ? 503 : 500 },
    );
  }

  return respond(admin, session.clientId);
}
