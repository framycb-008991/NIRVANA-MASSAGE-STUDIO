# Nirvana Massage Studio — Admin / Practitioner View Spec

> The client-facing booking flow (`WEBSITE_SPECS.md` §4) assumes real availability data exists somewhere. This spec covers how the practitioner actually manages that — without it, the booking flow has nothing real to read from.

---

## 1. Core need

The practitioner needs a way to:
- See all upcoming bookings (client name, treatment, time, in-studio vs. private/location).
- Block off time she's unavailable (days off, personal appointments, already-booked private sessions if those aren't captured through the site).
- See client notes and health-intake info (if collected — see `HEALTH_INTAKE_SPEC.md`) ahead of each session.
- Cancel or reschedule a booking on her end, which should trigger the same client-facing notifications as a client-initiated change (`NOTIFICATIONS_SPEC.md`).

## 2. Two possible approaches

**A. Custom admin dashboard (built as part of this site)**
- Full control over the exact UI/workflow, matches the brand visually.
- More build effort — this is effectively a second application alongside the public site.

**B. Off-the-shelf scheduling backend (e.g. a booking/calendar service), site embeds or talks to it**
- Much faster to get to a working v1 — availability, blocking time off, and calendar sync are already solved problems in most scheduling tools.
- Public-facing booking flow can still be fully custom-designed (per `DESIGN_SPECS.md`) while pulling real availability from that backend under the hood.
- Trade-off: less control over exact admin UX, and that tool becomes a data processor under GDPR (needs to be added to the list in `GDPR_PRIVACY_SPEC.md` §7).

**Recommendation:** Option B for a first version — the custom-designed booking flow the client sees is what carries the brand; the backend that powers availability doesn't need to be bespoke, especially for a solo practitioner who needs this working sooner rather than later.

## 3. Minimum viable admin needs (regardless of approach)

- Calendar view of all bookings.
- Ability to block/unblock time.
- Notification when a new booking comes in.
- Access to client contact + notes for upcoming sessions.
- Simple enough to use from a phone, since she's not going to be at a desk between sessions.

## 4. Open questions

- Does the practitioner already use any scheduling tool for other parts of her business, or would this be the first?
- Does she want the admin/calendar view to be mobile-first (likely, given the "not at a desk" reality of the job)?
- Who besides her needs access — is this strictly solo, or could she bring on a second therapist later (worth a quick sanity check even though today it's solo, since it affects whether the data model should hard-assume one practitioner)?
