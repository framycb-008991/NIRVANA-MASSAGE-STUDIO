import React, { useState } from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { signInWithEmail } from '../services/memberAuth';
import { Mail, CheckCircle2 } from 'lucide-react';

interface MemberAuthFormProps {
  currentLocale: Locale;
}

/**
 * Magic-link sign-in form (email → "check your inbox"). Used by the Header
 * member widget, the Membership page subscribe gate, and the Account page.
 * Only render this when isMemberAuthEnabled() is true.
 */
export const MemberAuthForm: React.FC<MemberAuthFormProps> = ({ currentLocale }) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch {
      setError(t('member.signin_error'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="deposit-notice-card" style={{ margin: '1rem 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, marginBottom: '0.3rem' }}>
          <CheckCircle2 size={16} color="#557A55" />
          {t('member.check_email_title')}
        </div>
        <div>{t('member.check_email_desc')}</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <div className="form-group">
        <label className="form-label" htmlFor="member-email">
          {t('booking.email')}
        </label>
        <input
          id="member-email"
          type="email"
          className="custom-input"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="maria@example.com"
        />
        {error && <span className="inline-error">{error}</span>}
      </div>

      <button type="submit" className="btn btn-primary" disabled={sending}>
        <Mail size={15} />
        <span>{sending ? t('member.sending') : t('member.send_link')}</span>
      </button>
    </form>
  );
};
