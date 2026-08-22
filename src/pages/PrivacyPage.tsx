import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { ShieldCheck } from 'lucide-react';

interface PrivacyPageProps {
  currentLocale: Locale;
  onNavigate?: (path: string) => void;
  onOpenCookieSettings: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({
  currentLocale,
  onOpenCookieSettings
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem' }}>
      <div className="container-narrow">
        {/* Header */}
        <div className="section-heading-center">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <ShieldCheck size={18} color="#8A7A68" />
            <span className="label-caps">GDPR Compliance &amp; Polish Law</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 4.5vw, 3.2rem)' }}>
            {t('privacy.title')}
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--ink-light)' }}>
            {t('privacy.updated')} • Regulation (EU) 2016/679 (GDPR)
          </p>
          <div className="accent-underline" style={{ margin: '1.5rem auto 0' }} />
        </div>

        {/* Content Box */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 3rem',
            border: '1px solid rgba(201, 190, 176, 0.4)',
            boxShadow: 'var(--shadow-card)',
            fontSize: '0.98rem',
            lineHeight: '1.8',
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem'
          }}
        >
          {/* Intro */}
          <div style={{ backgroundColor: 'var(--sage-wash)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(166, 169, 156, 0.3)' }}>
            <p style={{ margin: 0, color: 'var(--ink)' }}>{t('privacy.intro')}</p>
          </div>

          {/* Section 1 */}
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
              {t('privacy.s1_title')}
            </h3>
            <p>{t('privacy.s1_text')}</p>
          </div>

          {/* Section 2 */}
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
              {t('privacy.s2_title')}
            </h3>
            <p>{t('privacy.s2_text')}</p>
          </div>

          {/* Section 3 */}
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
              {t('privacy.s3_title')}
            </h3>
            <p style={{ whiteSpace: 'pre-line' }}>{t('privacy.s3_text')}</p>
          </div>

          {/* Section 4 */}
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
              {t('privacy.s4_title')}
            </h3>
            <p>{t('privacy.s4_text')}</p>
          </div>

          {/* Section 5 */}
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', marginBottom: '0.6rem' }}>
              {t('privacy.s5_title')}
            </h3>
            <p>{t('privacy.s5_text')}</p>
          </div>

          {/* Data Subject Request Action Box */}
          <div style={{ borderTop: '1px solid rgba(201,190,176,0.3)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ display: 'block', marginBottom: '2px' }}>Exercise Your Rights or Update Consent</strong>
              <span style={{ fontSize: '0.86rem', color: 'var(--ink-light)' }}>
                Email privacy@nirvanamassage.pl with "GDPR Request" in the subject line.
              </span>
            </div>

            <button className="btn btn-outline" onClick={onOpenCookieSettings}>
              {t('footer.cookie_settings')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
