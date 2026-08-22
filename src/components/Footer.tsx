import React from 'react';
import { Locale } from '../types';
import { getTranslation, LOCALE_NAMES } from '../services/i18n';
import { HalftoneCircle } from './HalftoneCircle';
import { InstagramIcon } from './InstagramIcon';
import { MapPin, Phone, Mail, ShieldCheck } from 'lucide-react';

interface FooterProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onNavigate: (path: string) => void;
  onOpenCookieSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentLocale,
  onLocaleChange,
  onNavigate,
  onOpenCookieSettings
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  return (
    <footer className="site-footer" role="contentinfo">
      {/* Background oversized watermark halftone circle */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-100px',
          pointerEvents: 'none',
          opacity: 0.05
        }}
      >
        <HalftoneCircle size={460} color="#FFFFFF" />
      </div>

      <div className="container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem' }}>
              <HalftoneCircle size={34} color="#C9BEB0" />
              <h3 style={{ letterSpacing: '0.28em', whiteSpace: 'nowrap', margin: 0 }}>NIRVANA</h3>
            </div>
            <p style={{ color: 'var(--taupe-light)', fontSize: '0.92rem', maxWidth: '320px', lineHeight: '1.7' }}>
              {t('footer.brand_desc')}
            </p>
            <div style={{ marginTop: '1.5rem', fontStyle: 'italic', color: 'var(--sage)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem' }}>
              "{t('brand.slogan')}"
            </div>
          </div>

          {/* Nav Col */}
          <div className="footer-col">
            <h4>{t('footer.quick_links')}</h4>
            <ul className="footer-links">
              <li>
                <a href={`/${currentLocale}`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}`); }}>
                  {t('nav.home')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/about`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/about`); }}>
                  {t('nav.about')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/services`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/services`); }}>
                  {t('nav.services')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/booking`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/booking`); }}>
                  {t('nav.booking')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/contact`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/contact`); }}>
                  {t('nav.contact')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/privacy`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/privacy`); }}>
                  {t('nav.privacy')}
                </a>
              </li>
              <li>
                <a href={`/${currentLocale}/admin`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/admin`); }}>
                  {t('nav.admin')}
                </a>
              </li>
            </ul>
          </div>

          {/* Location & Hours */}
          <div className="footer-col">
            <h4>{t('contact.title')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.88rem', color: 'var(--mist-darker)' }}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <MapPin size={16} color="#C9BEB0" style={{ flexShrink: 0, marginTop: '4px' }} />
                <span>{t('contact.address_val')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Phone size={16} color="#C9BEB0" style={{ flexShrink: 0, marginTop: '4px' }} />
                <span>{t('contact.phone_val')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Mail size={16} color="#C9BEB0" style={{ flexShrink: 0, marginTop: '4px' }} />
                <span>{t('contact.email_val')}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem' }}>
                <a
                  href="https://www.instagram.com/nirvana_massage.studio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--white)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    border: '1px solid rgba(201,190,176,0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <InstagramIcon size={14} color="#C9BEB0" />
                  <span>@nirvana_massage.studio</span>
                </a>
              </div>
            </div>
          </div>

          {/* Language & Compliance */}
          <div className="footer-col">
            <h4>Languages / Języki</h4>
            <div className="lang-switcher" style={{ display: 'inline-flex', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.1)' }}>
              {(['en', 'pl', 'uk'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  className={`lang-btn ${currentLocale === loc ? 'active' : ''}`}
                  onClick={() => onLocaleChange(loc)}
                  style={{ color: currentLocale === loc ? '#FFFFFF' : '#C9BEB0' }}
                >
                  {LOCALE_NAMES[loc].label}
                </button>
              ))}
            </div>

            <div>
              <button
                onClick={onOpenCookieSettings}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--taupe-light)',
                  fontSize: '0.8rem',
                  border: '1px solid rgba(201,190,176,0.3)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                <ShieldCheck size={14} />
                <span>{t('footer.cookie_settings')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} {t('footer.rights')}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href={`/${currentLocale}/privacy`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/privacy`); }}>
              GDPR & Privacy Policy
            </a>
            <span>•</span>
            <a href={`/${currentLocale}/intake`} onClick={(e) => { e.preventDefault(); onNavigate(`/${currentLocale}/intake`); }}>
              {t('intake.title')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
