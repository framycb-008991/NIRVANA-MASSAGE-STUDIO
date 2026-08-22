# Nirvana Massage Studio — Website Design Specs

> Brand source: Nirvana Massage Studio brand book (PDF).
> Booking-flow reference: provided scheduling screenshots (calendar + time-slot + contact-info pattern), adapted to the Nirvana brand.

---

## 1. Brand Foundation

**Name:** Nirvana Massage Studio
**Slogan:** "From tension to tranquility." — framed as a journey, not a destination (slowing down → letting go → balance).
**Positioning:** Calm, natural, sophisticated, gender-neutral, timeless. Not a conventional/clinical spa look.
**Signature mark:** A halftone circle — dot-density gradient forming a sphere. Symbolizes wholeness, balance, and continuous journey (no defined start/end). Used as a standalone mark, watermark, and background texture (scattered soft dot-grid).

### Voice & copy tone
- Calm, unhurried sentence rhythm — short declarative lines are fine even fragments ("A journey of slowing down.").
- Speaks to transformation and the body/mind, never clinical or salesy.
- Plain, active language for UI controls ("Choose a time," not "Select your preferred appointment slot").

---

## 2. Design Tokens

### Color palette
| Token | Approx. Hex | Role |
|---|---|---|
| `--sage` | `#A9AC A2` → use `#A6A99C` | Primary brand background (soft sage-grey), hero sections, headers |
| `--sage-dark` | `#8C8F82` | Text-on-sage, secondary accents |
| `--taupe` | `#8A7A68` | Warm accent — CTAs, highlighted states, card backgrounds |
| `--taupe-light` | `#C9BEB0` | Secondary surfaces, dividers |
| `--white` | `#FFFFFF` | Clarity/breathing room — content panels, form backgrounds |
| `--ink` | `#2E2C28` | Primary body text (warm near-black, not pure black) |
| `--mist` | `#F4F2EE` | Page background (off-white, warmer than pure white) |

Do **not** introduce conventional "spa blues/greens" or floral pastels — the brand explicitly avoids the generic spa palette in favor of this neutral, contemporary set.

### Typography
- **Display face:** A tall, light-weight serif with generous letter-spacing (the logo uses wide-tracked capitals — "N I R V A N A"). Suggested: *Cormorant*, *Marcellus*, or *Optima*-style humanist serif, always set in wide tracking for headings.
- **Body face:** A clean, light-weight humanist sans (e.g. *Inter*, *Jost*, or *Work Sans*) at generous line-height (1.6+) to preserve the "unhurried" feel.
- **Utility/labels:** Same sans, uppercase, small size, wide letter-spacing (mirrors "MASSAGE STUDIO" sub-lockup under the logo).
- Headings should have room to breathe — no tight, bold, high-contrast display type. Weight stays light-to-regular even at large sizes.

### Layout / signature
- **Signature element:** The halftone circle motif reused as a soft, oversized watermark behind key moments (hero, booking confirmation, footer) — never as decoration-for-its-own-sake, always placed where it reinforces "wholeness/journey."
- Generous whitespace; soft photography (linen, candles, stone, dried flowers) rather than glossy stock spa imagery.
- Rounded, soft-edged UI elements (pills, circles) over sharp rectangles — echoes the dot/circle system.
- No numbered-step iconography unless it's the literal booking flow (which *is* a real sequence — see §4).

---

## 3. Site Structure

1. **Home** — hero (slogan + circle mark + soft photography), short brand story excerpt, services teaser, primary CTA → Book.
2. **About / Philosophy** — the full "Nirvana" meaning + "From tension to tranquility" narrative from the brand book, told as a short scroll journey (slow reveal, not a wall of text). Includes the **About the Therapist** module (see below).
3. **Services** — treatment menu (durations, brief description each), pricing.
4. **Booking** — the scheduling flow (see §4).
5. **Contact / Location** — studio address (Poland), phone, email, map; a short note on availability for private/travel sessions outside Poland.
6. **Footer** — logo mark, nav, language switcher, social, legal.

---

## 4. Booking Flow Spec

Adapted from the reference scheduling screenshots into the Nirvana visual language. Two-step flow with a persistent progress indicator at top.

### Step indicator
- Two nodes: **Select Time** → **Your Information**, connected by a line.
- Active node: taupe filled circle. Completed node: checkmark. Line fills taupe as progress advances.
- Replace the reference's generic orange/blue with `--taupe` (active) and `--sage-dark` (inactive).

### Step 1 — Select Time
Two-column layout (stacks vertically on mobile):

**Left column (sage background panel):**
- Massagist's photo (circular crop) + name, matching the reference pattern — Nirvana is a solo-practitioner brand, and the named-person format builds the trust needed for private/travel bookings in particular.
- Studio name + treatment name as heading.
- Month calendar grid (Sun–Sat), light weekday labels, current month with prev/next arrows.
- Today/selected date shown as a filled white circle on the sage background (mirrors reference).
- Disabled/past dates shown at reduced opacity, matching the reference's dimmed unavailable days.

**Right column (white panel):**
- "Meeting Location" style field, relabeled **"Treatment Location"** — on-site address or "In-studio" badge (no video-call option needed, unlike the reference's Google Meet).
- **"How much time do you need?"** → relabel **"Choose your treatment length"** — pill/segmented control, populated from real service durations (e.g. 30 min / 60 min / 90 min) rather than the reference's generic 15/30/60.
- **Booking type toggle** (new, not in reference): **"In-studio (Poland)"** vs **"Private session (travel)"** — since the massagist takes both. Selecting "Private session" reveals an address/city input for the client to specify location, and surfaces the timezone dropdown below.
- **"What is the best time?"** → date confirmation line ("Showing times for [Month Day, Year]").
- Timezone dropdown — kept, defaulting to Poland's timezone (CET/CEST) for in-studio bookings, but editable/required for private out-of-country sessions where the client's local timezone differs.
- Scrollable list of time slots as full-width rounded rectangle buttons (matches reference's `HH:MM` block list), taupe hover/active state.

### Step 2 — Your Information
Centered white card, same halftone circle mark faded in the background (signature moment):
- Selected date/time summary line with an inline **"edit"** link back to Step 1.
- Location line.
- Form fields: **First name**, **Surname**, **Email address** (all required) — note: reference screenshots have "Surname" before "name," which reads as a translation artifact; final copy should read **First name → Surname** in natural English order, or **Apelido → Nome** if the Portuguese order is deliberately kept for a PT locale.
- Optional: phone number, note/preferences field ("Anything we should know before your session?").
- **Return** (ghost/outline button, taupe text) and **Confirm** (solid taupe button, disabled/muted until required fields are valid) — bottom action row, matches reference layout.

### Confirmation state (not in reference, recommended)
- Full-bleed sage panel, halftone circle mark, confirmation message in the brand's calm voice (e.g. "You're booked. We'll see you soon.") with an add-to-calendar action and the session summary.

### Micro-interactions
- Slot buttons: soft raise/tint on hover, no hard shadows.
- Calendar date selection: circle fill animates in (200–250ms ease), no snap.
- Form validation: inline, quiet — a thin taupe underline and small caption, never a harsh red block.

---

## 4a. About the Therapist Module

Two-column layout (photo left, text right on desktop; stacks on mobile), placed within the About/Philosophy page:

- **Photo:** large, natural/candid (not studio-posed) — consistent with the brand's soft, unforced photography direction elsewhere on the site.
- **Heading:** "About the Therapist" set in the display serif, wide tracking.
- **Accent underline:** short rule beneath the heading — use `--taupe` (not the generic teal/green often seen on this layout pattern), keeping the mark consistent with the rest of the palette.
- **Name + credential line:** therapist's name, professional title/certification, and license number (bold, smaller size, directly under the name).
- **Bio paragraph:** short, in the brand's calm voice — should establish that she is the owner and practicing therapist at Nirvana Massage Studio (a solo-practitioner-owned studio, not a multi-therapist clinic), her qualifications, and — since she also takes private/travel bookings — a line noting that availability.

---

## 5. Internationalization (i18n) Spec

**Supported languages:** English (`en`), Polish (`pl`), Ukrainian (`uk`).

### Language detection & switching
- **Auto-detect on first visit:** read `navigator.language` / `Accept-Language` header; map to closest supported locale (`en-*` → `en`, `pl-*` → `pl`, `uk-*` → `uk`); fall back to `en` if no match.
- **Persist choice:** once a user manually picks a language, store it (cookie or `localStorage` key `nirvana_lang`) and stop auto-detecting on subsequent visits.
- **Manual switcher:** persistent control in the header/footer — three flags or language codes (`EN` / `PL` / `UA`) in a small pill/segmented control matching the taupe/sage UI language; current selection shown active-state.
- **Full-page translation on switch:** switching language re-renders all UI strings, nav, service names/descriptions, booking-flow copy, form labels, and validation/error messages — not just a partial widget. No mixed-language page state after switch.
- URL structure: locale-prefixed routes recommended (`/en/`, `/pl/`, `/uk/`) so each language is indexable/shareable and the detected/selected locale is reflected in the URL, not just client state.

### Content architecture
- All UI strings, brand copy (About/Philosophy narrative), service names/descriptions, and booking-flow labels live in per-locale translation files — e.g.:
  ```
  /locales/en.json
  /locales/pl.json
  /locales/uk.json
  ```
- Structure keys by section, not by page, so shared strings (nav, buttons, form labels) aren't duplicated:
  ```json
  {
    "nav": { "home": "...", "about": "...", "services": "...", "booking": "...", "contact": "..." },
    "hero": { "slogan": "...", "cta": "..." },
    "booking": {
      "step1_title": "...",
      "duration_label": "...",
      "time_label": "...",
      "step2_title": "...",
      "first_name": "...",
      "surname": "...",
      "email": "...",
      "confirm": "...",
      "return": "..."
    }
  }
  ```
- Dates/times must be locale-formatted (e.g. `26 August 2026` / `26 sierpnia 2026` / `26 серпня 2026`), not just string-translated — use a locale-aware date library (e.g. `Intl.DateTimeFormat`) rather than hardcoded month-name arrays.

### Typography considerations
- The chosen display serif and body sans **must** include full Polish diacritics (ą, ć, ę, ł, ń, ó, ś, ź, ż) and Cyrillic character support for Ukrainian — verify glyph coverage before finalizing font choices in §2; if the chosen display serif lacks Cyrillic, define a Cyrillic-compatible fallback that preserves the same light-weight, wide-tracked feel (e.g. a Cyrillic-supporting cut of the same type family, or a visually matched alternate for `uk` only).
- Ukrainian text tends to run ~10–15% longer than English for the same meaning; Polish similarly. Buttons, pills, and the segmented duration control in the booking flow need flexible/min-width sizing rather than fixed pixel widths so labels don't truncate or wrap awkwardly in `pl`/`uk`.

### Accessibility
- `<html lang="...">` attribute updates on language switch.
- Language switcher is keyboard-navigable and announces the current/selected language to screen readers (`aria-current`).

---

## 6. Open Questions (worth confirming before build)

- ~~Translation parity~~ — resolved: defaulting to **fallback-to-English** for any missing `pl`/`uk` string, per discussion. Flag this as an assumption to confirm before build, not a final decision.
