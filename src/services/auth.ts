// Admin session token storage (localStorage, `nirvana_` prefix convention).
// The token itself is an HMAC-signed, expiring string issued by
// /api/admin/login — see ACCESS_CONTROL_SPEC.md.

const TOKEN_KEY = 'nirvana_admin_token';
const EXPIRY_KEY = 'nirvana_admin_token_exp';

/** Returns the stored session token, or null when missing/expired. */
export function getAdminToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!token) return null;
    if (expiry && Date.now() >= Number(expiry)) {
      clearAdminToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setAdminToken(token: string, expiresAtIso?: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    const expiryMs = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
    // Local-only (offline-dev) tokens get the same 12h lifetime as server ones.
    localStorage.setItem(
      EXPIRY_KEY,
      String(Number.isFinite(expiryMs) ? expiryMs : Date.now() + 12 * 60 * 60 * 1000)
    );
  } catch {
    // storage unavailable — session simply won't persist
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    // ignore
  }
}
