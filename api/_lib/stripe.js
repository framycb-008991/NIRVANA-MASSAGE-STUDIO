/**
 * Lazily-initialised Stripe client with graceful degradation.
 *
 * When STRIPE_SECRET_KEY is unset (local dev without payments), getStripe()
 * returns null and payment endpoints answer 503 — the rest of the site keeps
 * working, matching the no-op pattern of _lib/googleCalendar.js.
 */

import Stripe from 'stripe';

let client = null;

/**
 * @returns {Stripe|null} the client, or null when Stripe is not configured
 */
export function getStripe() {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key);
  return client;
}

/** @returns {boolean} true when the secret key is present */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Public base URL of the site, for building Stripe redirect URLs.
 * Falls back to the request's Host header when SITE_URL is unset.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string} e.g. "https://nirvanamassage.pl"
 */
export function siteBaseUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}
