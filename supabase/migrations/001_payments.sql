-- ============================================================================
-- Migration 001 — Payments & subscription memberships
-- ============================================================================
-- Adds Stripe payment support to bookings and the membership/subscription
-- engine (members, subscriptions, credit_ledger, payments).
--
-- Apply to an EXISTING database that already runs supabase/schema.sql:
--   paste into the Supabase SQL editor, or:
--   psql $DATABASE_URL -f supabase/migrations/001_payments.sql
--
-- Fresh installs: supabase/schema.sql already contains everything below.
-- All statements are idempotent (safe to re-run).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- bookings — widen constraints, add payment columns
-- ----------------------------------------------------------------------------
alter table public.bookings
  drop constraint if exists bookings_duration_minutes_check;
alter table public.bookings
  add constraint bookings_duration_minutes_check
  check (duration_minutes in (30, 45, 60, 90));

alter table public.bookings
  drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending_payment', 'confirmed', 'cancelled'));

alter table public.bookings
  add column if not exists stripe_session_id text,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_paid', 'paid_full', 'credit')),
  add column if not exists amount_paid_pln integer check (amount_paid_pln >= 0),
  add column if not exists payment_choice text
    check (payment_choice in ('deposit', 'full', 'credit')),
  add column if not exists member_id uuid;

-- One Stripe Checkout session can only ever confirm one booking.
create unique index if not exists bookings_stripe_session_id_idx
  on public.bookings (stripe_session_id)
  where stripe_session_id is not null;

comment on column public.bookings.payment_status is
  'unpaid = legacy/pay-at-session; deposit_paid = 30% paid online; paid_full = full price paid online; credit = covered by membership credit.';

-- ----------------------------------------------------------------------------
-- members — registered clients (id mirrors the Supabase Auth user id)
-- ----------------------------------------------------------------------------
create table if not exists public.members (
  id                 uuid primary key,   -- = auth.users.id
  full_name          text,
  email              text not null unique,
  phone              text,
  stripe_customer_id text unique,
  created_at         timestamptz not null default now()
);

comment on table public.members is
  'Registered clients. id is the Supabase Auth user id; row is created on first sign-in or subscription purchase.';

-- ----------------------------------------------------------------------------
-- subscriptions — monthly memberships billed via Stripe Billing
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  member_id              uuid not null references public.members (id),
  tier_id                text not null,
  status                 text not null default 'active'
                         check (status in ('active', 'past_due', 'canceled')),
  stripe_subscription_id text unique,
  monthly_price_pln      integer not null check (monthly_price_pln >= 0),
  credits_per_cycle      integer not null check (credits_per_cycle > 0),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Monthly memberships. Status mirrors Stripe; past_due suspends credit booking privileges.';

create index if not exists subscriptions_member_idx
  on public.subscriptions (member_id, status);

-- ----------------------------------------------------------------------------
-- credit_ledger — append-only session-credit events.
-- Balance = SUM(delta) for a member. Never update or delete rows.
--   cycle_grant  +N  credits granted on (re)payment of a billing cycle
--   rollover     +1  unused credit carried into the new cycle (max 1)
--   redeem       -1  credit spent on a booking (booking_id set)
--   expire       -N  unused credits beyond the rollover limit expiring
--   admin_adjust ±N  manual correction from the admin panel
-- ----------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.members (id),
  subscription_id uuid references public.subscriptions (id),
  delta           integer not null check (delta <> 0),
  reason          text not null
                  check (reason in ('cycle_grant', 'rollover', 'redeem', 'expire', 'admin_adjust')),
  booking_id      uuid references public.bookings (id),
  created_at      timestamptz not null default now()
);

comment on table public.credit_ledger is
  'Append-only membership credit events; current balance is SUM(delta) per member.';

create index if not exists credit_ledger_member_idx
  on public.credit_ledger (member_id);

-- ----------------------------------------------------------------------------
-- payments — one row per Stripe money movement we care about
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid references public.members (id),
  booking_id       uuid references public.bookings (id),
  stripe_object_id text,                 -- Checkout Session / Invoice / Subscription id
  kind             text not null
                   check (kind in ('booking_deposit', 'booking_full', 'subscription')),
  amount_pln       integer not null check (amount_pln >= 0),
  status           text not null,        -- e.g. 'paid', 'failed'
  created_at       timestamptz not null default now()
);

comment on table public.payments is
  'Audit trail of Stripe charges (booking deposits, full payments, subscription cycles).';

create index if not exists payments_member_idx on public.payments (member_id);
create index if not exists payments_booking_idx on public.payments (booking_id);

-- ----------------------------------------------------------------------------
-- settings — seed the 6 default membership tiers (admin-editable JSON)
-- ----------------------------------------------------------------------------
insert into public.settings (key, value)
values (
  'subscription_tiers',
  '[
  {"id":"recovery_pass","name":"Recovery Pass","focus":"Sports, deep tissue & trigger point massage","sessionsPerCycle":2,"sessionMinutes":60,"monthlyPricePLN":350,"persona":"Amateur athletes, desk workers, stress relief"},
  {"id":"performance_pass","name":"Performance Pass","focus":"Sports massage, IASTM & functional mobility","sessionsPerCycle":4,"sessionMinutes":60,"monthlyPricePLN":660,"persona":"Serious athletes, crossfitters, runners"},
  {"id":"neuro_rehab_pass","name":"Neuro-Rehab Pass","focus":"Therapeutic & rehabilitative massage, lymphatic drainage","sessionsPerCycle":6,"sessionMinutes":45,"monthlyPricePLN":950,"persona":"Post-stroke recovery, neuromuscular care"},
  {"id":"desk_detox_pass","name":"Desk Detox Pass","focus":"Deep tissue with neck & shoulder focus","sessionsPerCycle":2,"sessionMinutes":60,"monthlyPricePLN":260,"persona":"Remote workers, office staff"},
  {"id":"lymphatic_care_pass","name":"Lymphatic Care Pass","focus":"Manual lymphatic drainage (MLD)","sessionsPerCycle":3,"sessionMinutes":60,"monthlyPricePLN":570,"persona":"Post-surgery recovery, swelling management"},
  {"id":"maternity_journey","name":"Maternity Journey","focus":"Prenatal & postpartum bodywork","sessionsPerCycle":2,"sessionMinutes":60,"monthlyPricePLN":380,"persona":"Expectant and new mothers"}
]'::text
)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security — same posture as the base schema:
-- enabled everywhere, no anon policies; service-role API routes only.
-- ----------------------------------------------------------------------------
alter table public.members       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payments      enable row level security;
