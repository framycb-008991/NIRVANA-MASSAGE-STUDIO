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
-- One client, one treatment per booking. Deposit is 50 PLN by business rule.
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  client_first_name text not null,
  client_surname    text not null,
  client_email      text not null,
  client_phone      text not null,
  treatment_id      text not null,
  treatment_name    text not null,
  duration_minutes  integer not null check (duration_minutes in (60, 90)),
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
                    check (status in ('confirmed', 'cancelled')),
  google_event_id   text,
  created_at        timestamptz not null default now()
);

comment on table public.bookings is
  'Client appointments. booking_date/start_time are local Europe/Warsaw wall-clock values.';

-- Availability lookups hit (booking_date, status) constantly.
create index if not exists bookings_date_status_idx
  on public.bookings (booking_date, status);

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
