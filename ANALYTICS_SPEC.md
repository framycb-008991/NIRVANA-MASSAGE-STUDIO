# Nirvana Massage Studio — Analytics Spec

> What's tracked, why, and how it stays consistent with `GDPR_PRIVACY_SPEC.md`.

---

## 1. What's worth tracking

For a small, appointment-based business site, the useful signals are narrow and practical:

- **Booking funnel completion:** how many visitors start the booking flow (Step 1) vs. complete it (Step 2 confirmed) — the single most useful metric, since it shows where people drop off.
- **Drop-off point within booking:** e.g. do people abandon at time-slot selection, or at the contact-info form? Different problems need different fixes.
- **Language usage:** which of the three languages visitors actually use — useful for prioritizing translation quality/copy investment over time.
- **Traffic source:** organic search vs. direct vs. referral — helps validate whether the SEO work (`SEO_SPEC.md`) is paying off.
- **Page-level traffic:** which pages get visited, to understand what people care about before booking.

## 2. What's probably not worth tracking (for this size of business)

- Heavy behavioral/session-recording tools — likely overkill for a solo-practitioner site and adds privacy complexity disproportionate to the benefit.
- Cross-site ad-retargeting pixels — not clearly relevant to this business model unless paid advertising is planned; flag as a separate decision if so.

## 3. Privacy alignment

- Whatever analytics tool is used must be covered by the cookie consent banner (`GDPR_PRIVACY_SPEC.md` §3) — no analytics script should load before consent, except for privacy-first tools that operate without personal data/cookies (worth considering specifically for this reason, since it simplifies the consent story).
- No analytics event should ever include health/intake data (`HEALTH_INTAKE_SPEC.md`) — booking-funnel tracking should be limited to anonymous flow/step events, never tied to the actual health answers a client gave.

## 4. Open questions

- Is there a reporting cadence the practitioner wants (e.g. a simple monthly summary), or is this purely for whoever builds/maintains the site to monitor?
- Any plans for paid advertising that would change what needs tracking?
