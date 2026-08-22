# Nirvana Massage Studio — Copywriting Spec

> Defines what final copy is needed, in which languages, and the voice rules it should follow. The brand book already gives us the About/Philosophy narrative and slogan in English — everything else still needs to be written.

---

## 1. Voice rules (from the brand book)

- Calm, unhurried sentence rhythm — short declarative lines are fine, even fragments.
- Speaks to transformation and the body/mind; never clinical, never salesy or hype-driven ("best massage in town!" is off-brand).
- Plain, active language for UI ("Choose a time," not "Select your preferred appointment slot").
- No exclamation points, no urgency language ("Book now before slots fill!").

## 2. Copy inventory needed (all three languages: EN / PL / UK)

| Section | Content needed | Status |
|---|---|---|
| Hero | Slogan (have it: "From tension to tranquility"), supporting line, CTA button text | Slogan done; supporting line + CTA needed |
| About/Philosophy | Full brand narrative | **Have this from the brand book** (English) — needs PL/UK translation |
| About the Therapist | Bio paragraph, credential line, private-booking note | Needed |
| Services | Name + short description + duration/price for each treatment offered | Needed — depends on final service list |
| Booking flow | Step labels, field labels, button text, confirmation message, error/validation messages | Needed |
| Health intake (if online, per `HEALTH_INTAKE_SPEC.md`) | Form questions, consent language | Needed |
| Contact | Address, hours, any intro line | Needed |
| Footer | Nav labels, legal links, copyright line | Needed |
| Privacy policy | Full policy text (see `GDPR_PRIVACY_SPEC.md`) | Needed |
| Confirmation/reminder emails | Subject lines + body copy for booking confirmation, reminder, cancellation (see `NOTIFICATIONS_SPEC.md`) | Needed |
| Error/empty states | "No slots available," "Something went wrong," 404 page | Needed |

## 3. Translation approach

- English written first as source of truth (per the fallback decision in `DESIGN_SPECS.md` §6).
- Polish and Ukrainian translations should be done by a native/fluent speaker familiar with the massage/wellness register — not literal machine translation, since the brand's calm tone needs to survive the translation, not just the meaning.
- Maintain the same per-locale JSON structure defined in `DESIGN_SPECS.md` §5 as translations are written, so nothing gets lost or mismatched between locales.

## 4. Open questions

- Who is writing/approving final copy — the practitioner herself, or should this doc's placeholder tone guide a copywriter?
- Final service list, durations, and prices (currently referenced but not defined anywhere in the specs so far) — needed before Services and Booking copy can be finalized.
