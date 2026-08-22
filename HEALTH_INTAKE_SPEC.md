# Nirvana Massage Studio — Health Intake / Contraindications Spec

> Decides how (and whether) the site collects health information before a session. Ties directly into `GDPR_PRIVACY_SPEC.md` §1 — this is special-category data and needs explicit, separate consent if collected online.

---

## 1. Decision needed: where does intake happen?

Three options — pick one before build:

**A. Fully online, part of booking flow**
- A short intake form appears after Step 2 (contact info) or is emailed as a link post-booking.
- Fastest for the practitioner (she sees answers before the client arrives) but adds a step to online booking and increases the data the site holds.

**B. Fully online, separate from booking**
- Client books first; a separate intake-form link (emailed, not part of the booking flow itself) is sent after confirmation, to be completed before the appointment.
- Keeps the booking flow itself short (matches the design spec's calm, unhurried feel) while still getting the info in advance.

**C. In-person only**
- No online health form at all; paper or verbal intake happens at the studio.
- Simplest from a data-privacy standpoint (no special-category data touches the website), but the practitioner doesn't have the info in advance.

**Recommendation:** Option B — keeps the booking flow itself simple (protects the design intent) while still getting the practitioner what she needs ahead of time, and cleanly separates "special-category consent" as its own explicit step rather than folding it into the general booking submit.

## 2. If collected online — suggested form content

- Any current injuries, areas of pain, or recent surgeries
- Pregnancy status (if relevant to treatment type)
- Known medical conditions relevant to massage (e.g. circulatory issues, skin conditions, allergies to oils/lotions used)
- Medications that may affect treatment
- Previous massage experience / pressure preference (optional, not health data, but useful context)

Each health-related question should be optional-but-encouraged rather than blocking — client can skip and disclose in person if more comfortable.

## 3. Consent requirements

- A separate checkbox: *"I consent to sharing this health information with my therapist for the purpose of my treatment."* — cannot be bundled with the general booking confirmation.
- Brief explanation of how the data is used and retained, linking to the privacy policy.

## 4. Design notes

- Should carry the same calm, unhurried visual language as the rest of the site (see `DESIGN_SPECS.md`) — this is often a clinical-feeling form on other sites; Nirvana's version should avoid a sterile, checkbox-heavy medical form look. Soft section breaks, plain language, generous spacing.

## 5. Open questions

- Confirm which of Option A/B/C the practitioner prefers.
- Does she want to be notified immediately when a client submits health info, or just have it available when reviewing the day's bookings?
