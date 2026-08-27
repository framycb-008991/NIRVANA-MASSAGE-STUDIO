-- ============================================================================
-- Nirvana Massage Studio — Supabase / PostgreSQL schema
-- ============================================================================
-- Solo practitioner scheduling backend.
-- Timezone of the business: Europe/Warsaw. All `time` / `date` columns are
-- stored in local Warsaw wall-clock time (no timezone conversion in the DB).
--
-- Apply with:  psql $DATABASE_URL -f supabase/schema.sql
-- or paste into the Supabase SQL editor.
-- ============================================================================

-- gen_random_uuid() is provided by pgcrypto (enabled by default on Supabase,
-- but harmless to request explicitly).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- working_hours — one row per weekday with the studio's regular opening hours.
-- day_of_week follows JS Date.getUTCDay() convention: 0 = Sunday .. 6 = Saturday.
-- ----------------------------------------------------------------------------
create table if not exists public.working_hours (
  id                     uuid primary key default gen_random_uuid(),
  day_of_week            smallint not null unique
                         check (day_of_week between 0 and 6),
  is_working             boolean not null default true,
  start_time             time not null,
  end_time               time not null,
  -- Restorative gap blocked before/after every existing appointment.
  buffer_minutes         integer not null default 30
                         check (buffer_minutes >= 0),
  -- Step between candidate slot start times shown to clients.
  slot_increment_minutes integer not null default 90
                         check (slot_increment_minutes > 0),
  updated_at             timestamptz not null default now(),
  check (end_time > start_time)
);

comment on table public.working_hours is
  'Regular weekly opening hours of the studio (local Europe/Warsaw wall-clock time).';

-- Seed: studio weekly hours
--   Mon 08:00–14:00 | Tue–Thu 14:30–22:00 | Fri 08:00–14:00
--   Sat 09:00–21:00 | Sun 09:00–21:00
insert into public.working_hours (day_of_week, is_working, start_time, end_time)
values
  (0, true, '09:00', '21:00'),  -- Sunday
  (1, true, '08:00', '14:00'),  -- Monday
  (2, true, '14:30', '22:00'),  -- Tuesday
  (3, true, '14:30', '22:00'),  -- Wednesday
  (4, true, '14:30', '22:00'),  -- Thursday
  (5, true, '08:00', '14:00'),  -- Friday
  (6, true, '09:00', '21:00')   -- Saturday
on conflict (day_of_week) do nothing;

-- ----------------------------------------------------------------------------
-- date_overrides — per-date exceptions to the weekly hours.
-- Semantics:
--   is_off = true              -> the whole day is blocked (no slots).
--   is_off = false + times set -> start_time/end_time replace the weekly hours
--                                 for that date only.
-- ----------------------------------------------------------------------------
create table if not exists public.date_overrides (
  id            uuid primary key default gen_random_uuid(),
  override_date date not null unique,
  is_off        boolean not null default false,
  start_time    time,
  end_time      time,
  reason        text,
  created_at    timestamptz not null default now(),
  -- Custom hours require both bounds; a full day off requires neither.
  check (
    (is_off = true)
    or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

comment on table public.date_overrides is
  'Per-date exceptions: full days off (is_off) or custom opening hours replacing the weekly schedule.';

create index if not exists date_overrides_date_idx
  on public.date_overrides (override_date);

-- ----------------------------------------------------------------------------
-- bookings — confirmed (or cancelled) appointments.
-- One client, one treatment per booking. Online payments (Stripe) are tracked
-- via the payment_* / stripe_session_id columns; members can also book with
-- subscription session credits (payment_choice = 'credit').
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  client_first_name text not null,
  client_surname    text not null,
  client_email      text not null,
  client_phone      text not null,
  treatment_id      text not null,
  treatment_name    text not null,
  duration_minutes  integer not null check (duration_minutes in (30, 45, 60, 90)),
  price_pln         integer not null check (price_pln >= 0),
  deposit_pln       integer not null default 50 check (deposit_pln >= 0),
  booking_date      date not null,
  start_time        time not null,
  booking_type      text not null check (booking_type in ('in_studio', 'private')),
  -- Client address for 'private' (outcall) bookings; null for in-studio.
  location          text,
  client_notes      text,
  locale            text not null default 'en',
  status            text not null default 'confirmed'
                    check (status in ('pending_payment', 'confirmed', 'cancelled')),
  -- Stripe payment tracking (null for legacy pay-at-session bookings).
  stripe_session_id text,
  payment_status    text not null default 'unpaid'
                    check (payment_status in ('unpaid', 'deposit_paid', 'paid_full', 'credit')),
  amount_paid_pln   integer check (amount_paid_pln >= 0),
  payment_choice    text check (payment_choice in ('deposit', 'full', 'credit')),
  member_id         uuid,
  google_event_id   text,
  created_at        timestamptz not null default now()
);

comment on table public.bookings is
  'Client appointments. booking_date/start_time are local Europe/Warsaw wall-clock values.';

-- Availability lookups hit (booking_date, status) constantly.
create index if not exists bookings_date_status_idx
  on public.bookings (booking_date, status);

-- One Stripe Checkout session can only ever confirm one booking.
create unique index if not exists bookings_stripe_session_id_idx
  on public.bookings (stripe_session_id)
  where stripe_session_id is not null;

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
-- settings — simple key/value store editable from the admin panel.
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

comment on table public.settings is
  'Runtime-editable studio settings (key/value).';

-- Practitioner notification email (changeable from the admin panel).
insert into public.settings (key, value)
values ('practitioner_email', 'heorhiievaalina@gmail.com')
on conflict (key) do nothing;

-- Default membership tiers (admin-editable; Stripe price ids are attached
-- lazily by the API when a tier is first purchased).
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
-- photo_slots — practitioner-uploaded replacements for the site's photo slots.
-- One row per overridden slot; slots without a row fall back to the bundled
-- /assets/* default on the frontend.
-- ----------------------------------------------------------------------------
create table if not exists public.photo_slots (
  slot_id      text primary key,
  storage_path text not null,             -- object path inside the site-photos bucket
  alt_text     text,
  updated_at   timestamptz not null default now()
);

comment on table public.photo_slots is
  'Maps photo slot ids to practitioner-uploaded images in Supabase Storage.';

-- ----------------------------------------------------------------------------
-- Storage bucket for uploaded photos (run once; safe to re-run).
-- Public read (images render on the public site), writes only via the
-- service-role key used by the API routes.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- RLS is ENABLED on every table and NO anon/authenticated policies are
-- created, so the public anon key can read/write nothing.
-- All backend API routes use the SERVICE ROLE key, which bypasses RLS
-- entirely — that is the intended access path.
-- ----------------------------------------------------------------------------
alter table public.working_hours  enable row level security;
alter table public.date_overrides enable row level security;
alter table public.bookings       enable row level security;
alter table public.settings       enable row level security;
alter table public.photo_slots    enable row level security;
alter table public.members        enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.credit_ledger  enable row level security;
alter table public.payments       enable row level security;
