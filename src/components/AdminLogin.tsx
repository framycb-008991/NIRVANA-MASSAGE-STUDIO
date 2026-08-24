import React, { useState } from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { setAdminToken } from '../services/auth';
import { Lock, LogIn } from 'lucide-react';

interface AdminLoginProps {
  currentLocale: Locale;
  onSuccess: () => void;
}

/** Reads the build-time fallback key without vite/client ambient types. */
function getOfflineKey(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_ADMIN_API_KEY ?? '';
}

/**
 * Admin panel login gate. Exchanges the shared password for a session token
 * at /api/admin/login. When the backend is unreachable (plain `npm run dev`
 * without `vercel dev`), falls back to the build-time VITE_ADMIN_API_KEY so
 * local development keeps working — see ACCESS_CONTROL_SPEC.md.
 */
export const AdminLogin: React.FC<AdminLoginProps> = ({ currentLocale, onSuccess }) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.token) {
        setError(data.error || t('admin.login_error'));
        setSubmitting(false);
        return;
      }
      setAdminToken(data.token, data.expiresAt);
      onSuccess();
    } catch {
      // Backend unreachable (local dev without serverless functions):
      // fall back to the build-time low-trust gate.
      const offlineKey = getOfflineKey();
      if (offlineKey && password === offlineKey) {
        setAdminToken(`local-${Date.now()}`);
        onSuccess();
        return;
      }
      setError(t('admin.login_error'));
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem' }}>
      <div className="container" style={{ maxWidth: '440px' }}>
        <div
          style={{
            backgroundColor: 'var(--white)',
            padding: '2.5rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(201,190,176,0.4)',
            boxShadow: 'var(--shadow-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: 'var(--taupe-wash)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Lock size={19} color="#8A7A68" />
            </div>
            <h1 style={{ fontSize: '1.7rem', margin: 0 }}>{t('admin.login_title')}</h1>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '1.8rem' }}>
            {t('admin.login_desc')}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">
                {t('admin.login_password_label')}
              </label>
              <input
                id="admin-password"
                type="password"
                className="custom-input"
                autoComplete="current-password"
                required
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
              />
            </div>

            {error && (
              <p style={{ color: '#B25E5E', fontSize: '0.85rem', margin: '0.4rem 0 0' }} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.4rem', justifyContent: 'center' }}
              disabled={submitting}
            >
              <LogIn size={16} />
              <span>{submitting ? t('admin.login_submitting') : t('admin.login_submit')}</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};
