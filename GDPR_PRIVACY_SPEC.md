# Nirvana Massage Studio — Privacy & Data Handling Spec (GDPR)

> Poland is an EU member state, so GDPR applies to any personal data this site collects. This spec is a starting framework — final wording should be reviewed by someone qualified to give legal sign-off before launch.

---

## 1. What personal data the site collects

| Data | Where collected | Purpose |
|---|---|---|
| First name, surname, email, phone (optional) | Booking flow Step 2 | Fulfilling the booking, sending confirmations |
| Session notes / preferences (optional free text) | Booking flow Step 2 | Helping the practitioner prepare |
| Health/contraindication info | Intake form (see `HEALTH_INTAKE_SPEC.md`) | Client safety during treatment — this is **special-category data** under GDPR (health data), requiring explicit, separate consent |
| Location/address | Booking flow, if "private/travel" selected | Coordinating the session location |
| Language preference | Cookie/localStorage | Remembering the chosen site language |
| Usage analytics | Site-wide, if analytics enabled | Understanding site usage (see `ANALYTICS_SPEC.md`) |

## 2. Legal basis for processing

- Booking + contact data: **contract performance** (needed to deliver the service the client requested).
- Health/contraindication data: **explicit consent** — must be a separate, clearly-worded opt-in, not bundled into general terms acceptance.
- Marketing (if any future newsletter/promo emails): **separate opt-in consent**, unchecked by default.
- Analytics: **consent**, via cookie banner, unless using a privacy-first analytics tool that doesn't require consent under local guidance (confirm with whoever handles legal compliance).

## 3. Cookie consent banner

- Appears on first visit, before any non-essential cookie/script loads (analytics, etc.).
- Three clear choices: **Accept all**, **Reject non-essential**, **Customize**.
- Available in all three site languages, detected/switched the same way as the rest of the site.
- Essential cookies only (language preference, session/booking-flow state) load without consent, since they're required for the site to function.

## 4. Data retention

- Booking records: retain for a defined period (e.g. duration required for tax/accounting purposes under Polish law, typically several years) — final number should come from whoever handles the studio's accounting/legal compliance, not assumed here.
- Health/contraindication data: retain only as long as necessary for the client relationship; consider a shorter retention window or client-triggered deletion, since this is sensitive data.
- Marketing consent: retained until the client opts out.

## 5. Client rights (must be supported, not just stated)

- **Access** — client can request a copy of their data.
- **Rectification** — client can correct inaccurate data (e.g. via a "manage my booking" flow, or by contacting the studio directly).
- **Erasure ("right to be forgotten")** — client can request deletion; needs an actual internal process, not just a policy sentence.
- **Data portability** — less critical for a small local business, but worth a line in the policy.
- A **privacy contact** (email address) must be listed and monitored.

## 6. Website implementation checklist

- [ ] Cookie consent banner (see §3)
- [ ] Privacy policy page, in all three languages, covering §1–5
- [ ] Explicit checkbox for health-data consent, separate from booking submission
- [ ] Explicit checkbox for marketing consent (if applicable), unchecked by default
- [ ] Internal process (even if manual, e.g. an email inbox) for handling access/erasure requests
- [ ] Data stored securely (encrypted at rest/in transit) — a backend/infra decision, flagged here as a requirement rather than specced in detail

## 7. Open questions

- Who is the studio's designated contact for privacy requests?
- Does the studio use any third-party tools (email service, calendar/booking backend, payment processor) that also touch client data? Each needs its own data-processing agreement — worth listing all third-party tools once the stack is finalized.
