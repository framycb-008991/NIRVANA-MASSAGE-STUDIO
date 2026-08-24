/**
 * Shared admin authentication helpers.
 *
 * Model: the practitioner logs in once with a shared password
 * (ADMIN_PASSWORD env var) and receives a stateless, HMAC-signed session
 * token. Protected admin routes verify that token instead of seeing the
 * password again. No database table is required.
 *
 * Token format (base64url):  "<expiryUnixMs>.<hmacHex>"
 *   - payload  : expiry timestamp in milliseconds
 *   - signature: HMAC-SHA256 of the payload string, keyed with the session
 *                secret (ADMIN_SESSION_SECRET, falling back to ADMIN_API_KEY)
 *
 * Verification accepts either:
 *   - `Authorization: Bearer <token>`  (login-issued session token), or
 *   - `x-admin-key: <ADMIN_API_KEY>`   (legacy shared-secret header, kept for
 *                                       backward compatibility / scripting)
 */

import crypto from 'node:crypto';

/** Session lifetime: 12 hours. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY || '';
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function fromBase64url(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function sign(payload) {
  return crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
}

/** Timing-safe string comparison that never throws on length mismatch. */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Issues a new session token. Returns { token, expiresAt } where expiresAt
 * is the expiry time as an ISO string.
 */
export function issueAdminToken() {
  if (!getSessionSecret()) {
    throw new Error('ADMIN_SESSION_SECRET (or ADMIN_API_KEY) is not configured.');
  }
  const expiry = Date.now() + SESSION_TTL_MS;
  const payload = String(expiry);
  const token = base64url(`${payload}.${sign(payload)}`);
  return { token, expiresAt: new Date(expiry).toISOString() };
}

/** Validates a token string. Returns true only for well-formed, unexpired tokens. */
export function verifyAdminToken(token) {
  if (!getSessionSecret() || typeof token !== 'string') return false;
  let decoded;
  try {
    decoded = fromBase64url(token);
  } catch {
    return false;
  }
  const dot = decoded.lastIndexOf('.');
  if (dot <= 0) return false;

  const payload = decoded.slice(0, dot);
  const signature = decoded.slice(dot + 1);

  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;

  return safeEqual(sign(payload), signature);
}

/**
 * Express/Vercel-style request guard for admin routes.
 * Accepts a Bearer session token or the legacy x-admin-key header.
 */
export function verifyAdminRequest(req) {
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    if (verifyAdminToken(auth.slice('Bearer '.length).trim())) return true;
  }

  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && req.headers['x-admin-key'] === adminKey) return true;

  return false;
}
