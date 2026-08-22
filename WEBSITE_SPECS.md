# Nirvana Massage Studio — Website Functional & Technical Specs

> Companion to `DESIGN_SPECS.md` (visual system). This file covers site structure, data model, booking logic, and implementation notes.

---

## 1. Context Summary

- **Business:** Nirvana Massage Studio — solo-practitioner-owned studio based in **Poland**.
- **Practitioner:** owns and practices at the studio; also available for **private/travel sessions outside Poland**.
- **Languages:** English, Polish, Ukrainian — manual switch button + auto-detect on first visit, fallback to English for any untranslated string (assumption — confirm before build).

---

## 2. Recommended Stack (suggestion, not a hard requirement)

- **Framework:** Any modern component framework with file-based routing and static-generation support (e.g. Next.js/Astro-style) — makes locale-prefixed routes (`/en/`, `/pl/`, `/uk/`) straightforward.
- **i18n library:** A standard JSON-catalog i18n library with fallback-locale support built in, rather than hand-rolled string lookup.
- **Booking backend:** Needs a real calendar/availability data source (not static) — either a booking-specific service (e.g. a scheduling API) or a lightweight custom backend with an availability table. This is a functional dependency, not just front-end design — flag for the person who owns backend/infra before this is scoped as a pure front-end build.
- **Forms:** Client-side validation matching the "quiet inline" pattern from the design spec, plus server-side validation on submit (never trust client-only validation for a booking that touches a real calendar).

---

## 3. Page-by-Page Functional Requirements

### Home
- Hero: slogan, circle mark, primary CTA → Booking.
- Services teaser: 2–3 featured treatments pulled from the same data source as the full Services page (single source of truth, not duplicated copy).
- Brand story excerpt with "Read more" → About page.

### About / Philosophy
- Static brand narrative content (from the brand book).
- **About the Therapist module** (see `DESIGN_SPECS.md` §4a): name, credential/license number, bio, owner note, private-booking availability note.

### Services
- List of treatments: name, duration options, price, short description.
- Each duration option should map directly to a bookable option in the Booking flow's duration selector — same data source, not re-entered separately.

### Booking
See §4 below — this is the most functionally complex page.

### Contact / Location
- Studio address (Poland), phone, email, embedded map.
- Note on private/travel session availability.

### Footer (site-wide)
- Nav, language switcher, social links, legal.

---

## 4. Booking Flow — Data & Logic

### Booking type
Two mutually exclusive modes, selected early in Step 1:
1. **In-studio (Poland)** — fixed location, studio's local timezone (CET/CEST) applies by default.
2. **Private / travel session** — client provides a location (city/address field); timezone dropdown becomes required and should NOT default silently — ask the client to confirm their timezone explicitly, since this affects real-world scheduling accuracy.

### Step 1 — Select Time
Inputs required before time slots can be shown:
- Treatment (from Services data)
- Duration (pulled from that treatment's available durations)
- Booking type (in-studio / private)
- If private: location + timezone

Output: list of available time slots for the selected date, filtered by:
- Practitioner's real availability (blocked/booked slots excluded — requires live calendar data, not a static list)
- Buffer time between sessions (recommend specifying a buffer, e.g. 15–30 min, so back-to-back bookings don't get scheduled with zero gap — confirm buffer length with the practitioner)
- Travel-time consideration for private sessions (optional but worth flagging: if two private sessions are booked same-day, does the system need to prevent overlapping travel windows? This is a real scheduling-logic question, not just UI.)

### Step 2 — Your Information
Fields: First name, Surname, Email (required); phone, notes (optional).
On submit:
- Server-side validation (required fields, valid email format, slot still available at submit time — re-check for race conditions if two people are booking simultaneously).
- Write booking record.
- Trigger confirmation email/notification to both client and practitioner.
- Show in-app confirmation state (per `DESIGN_SPECS.md` §4).

### Data model (illustrative, not final schema)
```
Booking {
  id
  treatment_id
  duration_minutes
  booking_type: "in_studio" | "private"
  location (required if private)
  timezone
  date
  time_slot
  client: { first_name, surname, email, phone?, notes? }
  status: "confirmed" | "cancelled" | "completed"
  created_at
}
```

### Cancellation / rescheduling
Not shown in the reference screenshots — worth deciding before build: does the client get a self-service cancel/reschedule link (e.g. via the confirmation email), or is that handled manually by the practitioner? This changes whether a booking-management page/route is needed.

---

## 5. i18n Technical Notes

(Design-level rationale is in `DESIGN_SPECS.md` §5 — this is the implementation checklist.)

- Locale-prefixed routes: `/en/booking`, `/pl/booking`, `/uk/booking`, etc.
- `navigator.language` detection on first visit only; persisted choice overrides detection afterward.
- All page content — including Services and the About/Therapist bio — must be translatable content, not hardcoded English with translated UI chrome around it.
- Date/time formatting via `Intl.DateTimeFormat` per locale, not hardcoded month-name arrays.
- Flexible-width buttons/pills throughout (especially the duration selector and booking-type toggle) to absorb longer Polish/Ukrainian strings without truncation.
- Fallback-to-English for any missing `pl`/`uk` translation key (assumption from `DESIGN_SPECS.md` §6 — confirm before build).

---

## 6. Non-Functional Requirements

- **Responsive:** mobile-first; booking flow's two-column Step 1 layout stacks vertically below ~768px.
- **Accessibility:** keyboard-navigable calendar and time-slot list; visible focus states; form errors announced to screen readers; language switcher exposes current selection via `aria-current`.
- **Performance:** calendar/availability data should load asynchronously with a loading state — don't block the whole booking page on a slow availability fetch.

---

## 7. Open Questions Carried Over From Design Spec

- Cancellation/rescheduling: self-service or manual?
- Booking buffer length between sessions.
- Whether overlapping-travel-window prevention is needed for same-day private bookings.
- Confirm fallback-to-English assumption for incomplete translations.
