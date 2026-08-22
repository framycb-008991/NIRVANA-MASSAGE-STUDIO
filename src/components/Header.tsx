import React, { useState } from 'react';
import { Locale } from '../types';
import { getTranslation, LOCALE_NAMES } from '../services/i18n';
import { HalftoneCircle } from './HalftoneCircle';
import { Menu, X, Calendar, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentLocale: Locale;
  onLocaleChange: (locale: Locale) => void;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLocale,
  onLocaleChange,
  currentPath,
  onNavigate
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const t = (key: string) => getTranslation(key, currentLocale);

  const navItems = [
    { id: 'home', label: t('nav.home'), path: `/${currentLocale}` },
    { id: 'about', label: t('nav.about'), path: `/${currentLocale}/about` },
    { id: 'services', label: t('nav.services'), path: `/${currentLocale}/services` },
    { id: 'booking', label: t('nav.booking'), path: `/${currentLocale}/booking` },
    { id: 'contact', label: t('nav.contact'), path: `/${currentLocale}/contact` }
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (itemPath: string) => {
    if (itemPath === `/${currentLocale}` && (currentPath === '/' || currentPath === `/${currentLocale}` || currentPath === `/${currentLocale}/`)) {
      return true;
    }
    return currentPath.startsWith(itemPath);
  };

  return (
    <>
      <header className="site-header" role="banner">
      <div className="container header-inner">
        {/* Brand Logo & Lockup */}
        <a
          href={`/${currentLocale}`}
          className="brand-logo-link"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick(`/${currentLocale}`);
          }}
          aria-label="Nirvana Massage Studio"
        >
          <HalftoneCircle size={38} color="#8A7A68" />
          <div className="brand-lockup">
            <span className="brand-title">NIRVANA</span>
            <span className="brand-subtitle">MASSAGE STUDIO</span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="site-nav" aria-label="Main Navigation">
          <ul className="nav-links">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={item.path}
                  className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item.path);
                  }}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions (Language Switcher & Booking / Admin CTA) */}
        <div className="header-actions">
          {/* Language Switcher Pill */}
          <div className="lang-switcher" role="group" aria-label="Select Language">
            {(['en', 'pl', 'uk'] as Locale[]).map((loc) => (
              <button
                key={loc}
                className={`lang-btn ${currentLocale === loc ? 'active' : ''}`}
                onClick={() => onLocaleChange(loc)}
                aria-current={currentLocale === loc ? 'true' : undefined}
                title={LOCALE_NAMES[loc].label}
              >
                {LOCALE_NAMES[loc].code}
              </button>
            ))}
          </div>

          {/* Quick Book CTA on desktop */}
          <button
            className="btn btn-primary header-desktop-only"
            style={{ padding: '0.6rem 1.3rem', fontSize: '0.78rem' }}
            onClick={() => handleNavClick(`/${currentLocale}/booking`)}
          >
            <Calendar size={14} />
            <span>{t('hero.cta_book')}</span>
          </button>

          {/* Practitioner Portal subtle link */}
          <button
            className="btn btn-ghost header-desktop-only"
            style={{ padding: '0.5rem', borderRadius: '50%' }}
            onClick={() => handleNavClick(`/${currentLocale}/admin`)}
            title={t('nav.admin')}
            aria-label={t('nav.admin')}
          >
            <UserCheck size={18} color="#8A7A68" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      </header>

      {/* Mobile Menu Slideout (rendered outside <header> — its backdrop-filter
          would otherwise trap this fixed panel inside the header box and the
          background would collapse, leaving links over page text) */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-panel"
          style={{
            position: 'fixed',
            top: 'var(--header-h, 80px)',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#F4F2EE',
            padding: '2.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            zIndex: 99
          }}
        >
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.path}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.8rem',
                color: isActive(item.path) ? 'var(--taupe)' : 'var(--ink)',
                borderBottom: '1px solid rgba(201, 190, 176, 0.3)',
                padding: '0.7rem 0',
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(item.path);
              }}
            >
              {item.label}
            </a>
          ))}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="lang-switcher" style={{ alignSelf: 'flex-start' }}>
              {(['en', 'pl', 'uk'] as Locale[]).map((loc) => (
                <button
                  key={loc}
                  className={`lang-btn ${currentLocale === loc ? 'active' : ''}`}
                  onClick={() => onLocaleChange(loc)}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  {LOCALE_NAMES[loc].label}
                </button>
              ))}
            </div>

            <button
              className="btn btn-outline"
              onClick={() => handleNavClick(`/${currentLocale}/admin`)}
            >
              <UserCheck size={16} />
              <span>{t('nav.admin')}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
