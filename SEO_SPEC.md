# Nirvana Massage Studio — SEO & Metadata Spec

> Especially relevant for a local, appointment-based business — most new clients will find this site through local search ("massage therapist near me" / "masażysta [city]" / "масажист [city]").

---

## 1. Per-page metadata (all three languages)

| Page | Title tag | Meta description |
|---|---|---|
| Home | e.g. "Nirvana Massage Studio — [City], Poland" | Short, brand-voice description including location + slogan |
| About | Therapist name + credentials in title | Bio-based description |
| Services | Treatment names in title/description where possible | Helps surface specific treatment searches |
| Booking | Simple, functional title | Not a major SEO target page, but should still have proper metadata |
| Contact | Location-focused title | Address, hours |

Each of these needs a translated equivalent for `pl` and `uk` routes, not just the English versions — search engines index each locale route separately.

## 2. Structured data (schema.org)

- **LocalBusiness** (or more specifically **HealthAndBeautyBusiness** / **DaySpa**-type schema) markup on the homepage: name, address, phone, opening hours, price range.
- **Person** schema for the therapist, linking her credentials.
- This directly supports local search visibility (e.g. Google Maps/local pack results) — worth prioritizing given the business is appointment-based and local-discovery-dependent.

## 3. Technical SEO basics

- Locale-prefixed URLs (`/en/`, `/pl/`, `/uk/`) with proper `hreflang` tags linking the language versions of each page together, so search engines serve the right language to the right searcher instead of guessing.
- Sitemap covering all locale routes.
- Image alt text in the appropriate language per route (ties into `PHOTOGRAPHY_ASSET_SPEC.md` §4).
- Fast load times — matters for both SEO ranking and the "calm, unhurried" brand experience not being undercut by a slow site.

## 4. Local listings (outside the website itself)

- Google Business Profile (or local equivalent) should list consistent name/address/phone matching the site exactly — inconsistency hurts local search ranking. Worth flagging even though it's not literally part of the website build.

## 5. Open questions

- What city/region in Poland should be the primary local-SEO target?
- Is there a existing Google Business Profile or similar listing already, or does that need to be created alongside the site?
