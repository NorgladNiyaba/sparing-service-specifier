-- ─────────────────────────────────────────────────────────────────────────────
-- Client onboarding / first-steps
--
-- Adds the profile fields collected during portal onboarding, plus a small
-- state table that records what the client has been shown and what they chose
-- to skip.
--
-- Design note: step *completion* is never stored. It is derived from whether
-- the underlying data exists (see lib/onboarding.ts → deriveSteps). The
-- `steps` jsonb only holds explicit client overrides — currently just
-- "skipped" — so that an admin filling in a field, or the client editing it
-- from Settings, automatically ticks the box without a second write path.
--
-- Run against the Supabase project (SQL editor or `supabase db push`).
-- Safe to re-run: every statement is idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Client profile fields ────────────────────────────────────────────────
alter table public.clients
  add column if not exists logo_path                text,
  add column if not exists primary_contact_name     text,
  add column if not exists primary_contact_title    text,
  add column if not exists primary_contact_email    text,
  add column if not exists primary_contact_phone    text,
  add column if not exists entity_type              text,
  add column if not exists industry                 text,
  add column if not exists employee_range           text,
  add column if not exists fiscal_year_end          text,
  add column if not exists preferred_contact_method text,
  add column if not exists best_time_to_reach       text,
  add column if not exists client_timezone          text;

comment on column public.clients.logo_path is
  'Path inside the client-documents storage bucket: {client_id}/branding/logo.{ext}';
comment on column public.clients.fiscal_year_end is
  'Month abbreviation the fiscal year ends in, e.g. "Dec".';

-- ── 2. Onboarding state ─────────────────────────────────────────────────────
create table if not exists public.client_onboarding (
  client_id     uuid primary key references public.clients(id) on delete cascade,

  -- Explicit per-step overrides, e.g. {"logo": "skipped"}. Absence = pending,
  -- and completion is derived from the client row, never stored here.
  steps         jsonb       not null default '{}'::jsonb,

  welcomed_at   timestamptz,          -- welcome pane acknowledged
  dismissed_at  timestamptz,          -- overlay closed before finishing
  completed_at  timestamptz,          -- every step resolved (done or skipped)
  celebrated_at timestamptz,          -- completion pane has been shown once
  last_step     text,                 -- resume point

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.client_onboarding is
  'Per-client portal onboarding state. Completion is derived, not stored — see lib/onboarding.ts.';

-- ── 3. updated_at trigger ───────────────────────────────────────────────────
create or replace function public.touch_client_onboarding()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists client_onboarding_touch on public.client_onboarding;
create trigger client_onboarding_touch
  before update on public.client_onboarding
  for each row execute function public.touch_client_onboarding();

-- ── 4. RLS ──────────────────────────────────────────────────────────────────
-- All portal + admin reads go through the service-role client
-- (lib/supabase/admin.ts), which bypasses RLS. Enabling RLS with no policies
-- therefore denies anon/authenticated direct access while leaving the app
-- unaffected — matching how the rest of the portal tables are accessed.
alter table public.client_onboarding enable row level security;
