# Nirvana Massage Studio — Access Control Spec

> Defines how the Practitioner Admin Panel is locked behind authentication, how the backend verifies admin requests, and the limits of the model. Implemented in `api/_lib/auth.js`, `api/admin/login.js`, `src/services/auth.ts`, `src/components/AdminLogin.tsx`, and `src/pages/AdminPage.tsx`.

---

## 1. Model

Single-user system: one practitioner (the studio owner), one shared password, no roles or accounts.

- The password is a **server-side env var** (`ADMIN_PASSWORD`) — it is never shipped to the browser.
- Login exchanges the password for a **stateless session token** (HMAC-signed, expiring). The browser stores only the token, never the password.
- All admin API routes verify the token (or the legacy shared-secret header) before touching data.

## 2. Token format

```
base64url( "<expiryUnixMs>.<HMAC-SHA256-hex>" )
```

- Payload: expiry timestamp in milliseconds.
- Signature: HMAC-SHA256 over the payload, keyed with `ADMIN_SESSION_SECRET` (falls back to `ADMIN_API_KEY`).
- Lifetime: **12 hours**. Expired tokens are rejected server-side and discarded client-side.
- Stateless: no sessions table; verification is pure computation. Revocation happens by rotating the secret.

## 3. API contracts

### `POST /api/admin/login`
| | |
|---|---|
| Body | `{ "password": string }` |
| 200 | `{ "token": string, "expiresAt": string (ISO) }` |
| 400 | `{ "error" }` — missing password |
| 401 | `{ "error" }` — wrong password (timing-safe comparison) |
| 500 | `{ "error" }` — `ADMIN_PASSWORD` unset (**fail-closed**: no tokens issued) |

### Protected routes (`/api/admin/*`)
Accepted credentials, checked by `verifyAdminRequest(req)` in `api/_lib/auth.js`:

1. `Authorization: Bearer <session-token>` — from login, or
2. `x-admin-key: <ADMIN_API_KEY>` — legacy header, kept for scripts/backward compatibility.

Failure: `401 { "error": "Unauthorized." }`. If neither `ADMIN_SESSION_SECRET`/`ADMIN_API_KEY` is configured, verification always fails (fail-closed).

## 4. Frontend gate

- `AdminPage` renders `<AdminLogin>` until a valid (unexpired) token exists in `localStorage` (`nirvana_admin_token` + `nirvana_admin_token_exp`).
- On success the token is stored and every admin API call (`useAdminSchedule`, photo uploads) attaches `Authorization: Bearer <token>`.
- A **Log Out** button clears the token and returns to the login screen.
- Locale keys: `admin.login_*`, `admin.logout` in all three locales (en/pl/uk).

### Offline-dev fallback
When the fetch to `/api/admin/login` fails at the network level (plain `npm run dev` without `vercel dev`), the login form falls back to comparing the input against the build-time `VITE_ADMIN_API_KEY` and issues a local-only token. This mirrors the pre-existing low-trust gate so local development keeps working. It provides no real security (the value ships in the client bundle) and only exists for dev convenience — production protection is server-side.

## 5. Environment variables

| Var | Purpose |
|---|---|
| `ADMIN_PASSWORD` | The password typed into the login screen (server-only) |
| `ADMIN_SESSION_SECRET` | HMAC key for signing session tokens (server-only; falls back to `ADMIN_API_KEY`) |
| `ADMIN_API_KEY` | Legacy shared secret accepted via `x-admin-key` (server-only) |
| `VITE_ADMIN_API_KEY` | Dev fallback + legacy header value sent by the frontend (public by design — low-trust gate only) |

Generate secrets with e.g. `openssl rand -hex 32`. See `.env.example`.

## 6. Limitations (accepted)

- Single shared password — no per-user audit trail, no roles.
- Password changes require editing the env var (no self-service UI yet).
- No rate limiting on `/api/admin/login` (add Vercel WAF / Upstash rate limit if brute-force becomes a concern).
- Client-side route gate is UX, not security — the real boundary is the server-side token check on every admin API route.
