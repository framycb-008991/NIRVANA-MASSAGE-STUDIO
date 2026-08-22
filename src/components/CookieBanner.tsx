import React, { useState, useEffect } from 'react';
import { Locale, CookiePreferences } from '../types';
import { getTranslation } from '../services/i18n';
import { getCookiePreferences, saveCookiePreferences } from '../services/storage';
import { ShieldCheck, X } from 'lucide-react';

interface CookieBannerProps {
  currentLocale: Locale;
  isOpenExplicitly?: boolean;
  onCloseExplicit?: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  currentLocale,
  isOpenExplicitly = false,
  onCloseExplicit
}) => {
  const [, setPrefs] = useState<CookiePreferences>(getCookiePreferences());
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [analyticsChecked, setAnalyticsChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);

  const t = (key: string) => getTranslation(key, currentLocale);

  useEffect(() => {
    const current = getCookiePreferences();
    setPrefs(current);
    setAnalyticsChecked(current.analytics);
    setMarketingChecked(current.marketing);

    if (!current.hasResponded || isOpenExplicitly) {
      setShowBanner(!isOpenExplicitly);
      if (isOpenExplicitly) setShowModal(true);
    } else {
      setShowBanner(false);
    }
  }, [isOpenExplicitly]);

  const handleAcceptAll = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      hasResponded: true
    };
    saveCookiePreferences(newPrefs);
    setPrefs(newPrefs);
    setShowBanner(false);
    setShowModal(false);
    if (onCloseExplicit) onCloseExplicit();
  };

  const handleRejectNonEssential = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      hasResponded: true
    };
    saveCookiePreferences(newPrefs);
    setPrefs(newPrefs);
    setShowBanner(false);
    setShowModal(false);
    if (onCloseExplicit) onCloseExplicit();
  };

  const handleSaveCustom = () => {
    const newPrefs: CookiePreferences = {
      essential: true,
      analytics: analyticsChecked,
      marketing: marketingChecked,
      hasResponded: true
    };
    saveCookiePreferences(newPrefs);
    setPrefs(newPrefs);
    setShowBanner(false);
    setShowModal(false);
    if (onCloseExplicit) onCloseExplicit();
  };

  if (!showBanner && !showModal) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && !showModal && (
        <aside className="cookie-banner-bar" role="region" aria-label="Cookie Preferences">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <ShieldCheck size={18} color="#8A7A68" />
              <h4 style={{ fontSize: '1.05rem', margin: 0, fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                {t('cookie.title')}
              </h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', margin: 0, lineHeight: 1.5, maxWidth: '620px' }}>
              {t('cookie.desc')}
            </p>
          </div>

          <div className="cookie-actions">
            <button className="btn btn-outline" style={{ padding: '0.55rem 1.1rem', fontSize: '0.78rem' }} onClick={() => setShowModal(true)}>
              {t('cookie.customize')}
            </button>
            <button className="btn btn-ghost" style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }} onClick={handleRejectNonEssential}>
              {t('cookie.reject_non_essential')}
            </button>
            <button className="btn btn-primary" style={{ padding: '0.55rem 1.3rem', fontSize: '0.78rem' }} onClick={handleAcceptAll}>
              {t('cookie.accept_all')}
            </button>
          </div>
        </aside>
      )}

      {/* Customize Modal */}
      {showModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cookie-modal-title">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 id="cookie-modal-title" style={{ fontSize: '1.6rem', margin: 0 }}>
                {t('cookie.title')}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  if (onCloseExplicit) onCloseExplicit();
                }}
                style={{ padding: '0.5rem', color: 'var(--ink-light)' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '1.8rem', lineHeight: '1.6' }}>
              {t('cookie.desc')}
            </p>

            {/* Essential Category */}
            <div style={{ padding: '1.2rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', border: '1px solid rgba(201,190,176,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.92rem' }}>{t('cookie.essential_label')}</span>
                <span className="badge badge-sage">Always Active</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-light)', margin: 0 }}>
                {t('cookie.essential_desc')}
              </p>
            </div>

            {/* Analytics Category */}
            <div style={{ padding: '1.2rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', marginBottom: '2rem', border: '1px solid rgba(201,190,176,0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 500, fontSize: '0.92rem' }}>{t('cookie.analytics_label')}</span>
                <input
                  type="checkbox"
                  id="analytics-toggle"
                  checked={analyticsChecked}
                  onChange={(e) => setAnalyticsChecked(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--taupe)', cursor: 'pointer' }}
                />
              </div>
              <label htmlFor="analytics-toggle" style={{ fontSize: '0.82rem', color: 'var(--ink-light)', cursor: 'pointer', display: 'block' }}>
                {t('cookie.analytics_desc')}
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost" onClick={handleRejectNonEssential}>
                {t('cookie.reject_non_essential')}
              </button>
              <button className="btn btn-primary" onClick={handleSaveCustom}>
                {t('cookie.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
