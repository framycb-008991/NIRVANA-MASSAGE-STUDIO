/**
 * POST /api/admin/login
 *
 * Exchanges the shared admin password (ADMIN_PASSWORD env var) for a
 * stateless session token used in the `Authorization: Bearer` header of
 * subsequent admin API calls.
 *
 * Body:     { password: string }
 * Response: 200 { token: string, expiresAt: string (ISO) }
 *           400 { error } — missing password
 *           401 { error } — wrong password
 *           500 { error } — server misconfiguration (env vars unset)
 */

import { issueAdminToken, safeEqual } from '../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Fail closed: without a configured password, nobody gets a token.
    console.error('[admin/login] ADMIN_PASSWORD is not configured.');
    return res.status(500).json({ error: 'Admin login is not configured on the server.' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const password = typeof body.password === 'string' ? body.password : '';

    if (!password) {
      return res.status(400).json({ error: 'password is required.' });
    }

    if (!safeEqual(password, adminPassword)) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const { token, expiresAt } = issueAdminToken();
    return res.status(200).json({ token, expiresAt });
  } catch (error) {
    console.error('[admin/login] failed:', error);
    return res.status(500).json({ error: 'Login failed.' });
  }
}
