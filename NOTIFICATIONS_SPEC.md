# Nirvana Massage Studio — Notifications Spec

> Defines what messages get sent, when, to whom, and in what language. Ties into `WEBSITE_SPECS.md` §4 (booking data model) and `COPY_SPEC.md` (message copy).

---

## 1. Notification events

| Event | Recipient | Channel | Timing |
|---|---|---|---|
| Booking confirmed | Client | Email | Immediately on booking |
| Booking confirmed | Practitioner | Email (and/or internal calendar update) | Immediately on booking |
| Appointment reminder | Client | Email (SMS optional — see §4) | e.g. 24 hours before (exact timing TBD) |
| Health intake reminder (if using Option B from `HEALTH_INTAKE_SPEC.md`) | Client | Email | Sent right after booking confirmation, or a set time before the appointment |
| Booking cancelled/rescheduled | Client + practitioner | Email | Immediately on cancellation/reschedule |
| No-show / missed appointment (optional) | Practitioner | Internal only | N/A |

## 2. Language

- Every client-facing notification sent in the language the client booked in (the locale active at time of booking), not necessarily the site's current default — store the client's locale with the booking record.
- Practitioner-facing notifications: language TBD based on her preference (likely Polish, but confirm).

## 3. Content requirements (per notification)

- Booking confirmation: date, time, treatment, duration, location (studio address or private-session location), a calendar-add link (.ics or similar), and — in the brand's calm voice — a short closing line rather than a purely transactional one.
- Reminder: same core details, shorter.
- Cancellation: clear statement of what was cancelled, and how to rebook.

## 4. Open questions

- Email only, or also SMS? SMS adds cost/infrastructure (a messaging provider) and a phone-number requirement at booking — currently optional in the data model (`WEBSITE_SPECS.md` §4). Confirm before deciding whether phone becomes required.
- Exact reminder timing (24h, 48h, same-day morning-of)?
- Should the practitioner get a daily digest of the day's bookings, or just individual notifications as they come in?
- Does she want no-show tracking, or is that out of scope for v1?
