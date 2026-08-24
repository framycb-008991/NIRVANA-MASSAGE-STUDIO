# Nirvana Massage Studio — Photo Management Spec

> Defines how the practitioner personally replaces photos on the website from the Admin Panel (Photos tab) without a code deploy. Implemented in `supabase/schema.sql` (`photo_slots`, `site-photos` bucket), `api/photos.js`, `api/admin/photos.js`, `api/_lib/photoSlots.js`, `src/services/photos.ts`, `src/hooks/usePhotos.ts`, and the Photos tab in `src/pages/AdminPage.tsx`.

---

## 1. Concept

Every manageable image on the site is a **photo slot**. A slot always has a **bundled default** (`public/assets/*.jpg`). When the practitioner uploads a replacement:

1. The file is stored in the Supabase Storage bucket `site-photos`.
2. The `photo_slots` table maps `slot_id → storage_path`.
3. Public pages resolve each slot to the override URL when one exists, else the bundled default.

Deleting the override ("Reset") instantly reverts the slot to its default.

## 2. Slot registry

Source of truth (server): `api/_lib/photoSlots.js`. Frontend mirror: `src/services/photos.ts` — **keep the two in sync**.

| Slot id | Where it appears | Default asset |
|---|---|---|
| `home-hero-1` … `home-hero-5` | Home page hero carousel | `alina-portrait-back.jpg`, `alina-stretching-leg.jpg`, `treatment-blade-iastm.jpg`, `treatment-cupping.jpg`, `hero.jpg` |
| `therapist-card-1` … `therapist-card-4` | Therapist card carousel (Home + About) | first four of the above |
| `about-gallery-1` … `about-gallery-4` | About page gallery grid | first four of the above |
| `booking-avatar` | Booking page practitioner badge | `therapist.jpg` |
| `treatment-<treatmentId>` | Services page cards + Home featured cards (one per treatment in `TREATMENTS`) | per-treatment image in `storage.ts` |

Adding a new slot: add it to both registries with a default asset, then resolve it at render with `photo('<slot-id>')`.

## 3. Data & storage layout

- **Table `public.photo_slots`**: `slot_id text pk`, `storage_path text`, `alt_text text`, `updated_at timestamptz`. RLS enabled, no anon policies — API routes use the service-role key.
- **Bucket `site-photos`** (public read, service-role write). Object names: `<slot_id>/<unixMs>-<sanitized-original-name>` — a new file per upload, so CDN caches never serve a stale image for a URL.

## 4. API contracts

### `GET /api/photos` (public)
- `200 { "photos": { "<slotId>": "<publicUrl>" } }` — only overridden slots appear.
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` — changes go live within ~1 minute.

### `POST /api/admin/photos` (admin — see `ACCESS_CONTROL_SPEC.md`)
| | |
|---|---|
| Body | `{ slot, fileName, contentType, dataBase64, alt? }` |
| Constraints | `slot` must be in the registry; `contentType` ∈ `image/jpeg`, `image/png`, `image/webp`; decoded size ≤ **4 MB** |
| 200 | `{ slot, url }` — uploaded, row upserted |
| Errors | 400 validation · 401 unauthorized · 413 too large · 500 server |

### `DELETE /api/admin/photos` (admin)
- Body `{ slot }` → deletes the `photo_slots` row and best-effort removes the file. `200 { ok: true }`.

## 5. Frontend behavior

- `usePhotos()` loads cached overrides from `localStorage` (`nirvana_photo_overrides`) for instant paint, then refreshes from `GET /api/photos`. `photo(slot)` returns override-or-default.
- Consumers (`HomePage`, `TherapistCard`, `AboutPage`, `ServicesPage`, `BookingPage`) resolve every managed `src` through `photo()` — presentational components (`DynamicPhotoShowcase`) are untouched.
- **Admin → Photos tab**: grid of all slots with thumbnail, `Custom`/`Default` badge, upload button (hidden file input) and reset button, inline success/error messages. Localized in en/pl/uk.
- **Offline-dev fallback**: if the backend is unreachable, uploads store a base64 data-URL in `localStorage` so the feature still works locally; resets simply remove the local override. Data-URL overrides are dev-only — production uses Supabase Storage.

## 6. Constraints & notes

- Max upload size 4 MB; no server-side resizing (practitioner should export web-sized JPGs, see `PHOTOGRAPHY_ASSET_SPEC.md` for style guidance).
- Alt text on public slots stays the curated copy in the page components; the optional `alt` field is stored for future use.
- Replacing a treatment photo changes it everywhere that treatment image renders (Services + Home featured cards).
