import React, { useState, useEffect } from 'react';
import { Locale } from './types';
import { detectInitialLocale, setPersistedLocale } from './services/i18n';
import { updatePageSEO } from './services/seo';
import { fetchWorkingHours } from './services/hours';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ServicesPage } from './pages/ServicesPage';
import { BookingPage } from './pages/BookingPage';
import { BookingSuccessPage } from './pages/BookingSuccessPage';
import { BookingCancelledPage } from './pages/BookingCancelledPage';
import { MembershipPage } from './pages/MembershipPage';
import { AccountPage } from './pages/AccountPage';
import { HealthIntakePage } from './pages/HealthIntakePage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  // Locale State
  const [currentLocale, setCurrentLocale] = useState<Locale>(() => detectInitialLocale());

  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || `/${detectInitialLocale()}`;
    }
    return '/en';
  });

  const [preselectedTreatmentId, setPreselectedTreatmentId] = useState<string | undefined>();
  const [preselectedDuration, setPreselectedDuration] = useState<number | undefined>();
  const [cookieSettingsExplicitOpen, setCookieSettingsExplicitOpen] = useState(false);

  // Parse page ID from path
  const parsedRoute = () => {
    const segments = currentPath.split('/').filter(Boolean);
    if (segments.length === 0) return { locale: currentLocale, page: 'home' };

    const firstSegment = segments[0] as Locale;
    const isLocale = ['en', 'pl', 'uk'].includes(firstSegment);

    const loc = isLocale ? firstSegment : currentLocale;
    const page = isLocale ? (segments[1] || 'home') : segments[0];
    // Sub-path under a page, e.g. /{locale}/booking/success → 'success'
    const subPage = isLocale ? segments[2] : segments[1];

    return { locale: loc, page, subPage };
  };

  const { locale: routeLocale, page: activePage, subPage: activeSubPage } = parsedRoute();

  // Sync locale state with route if needed
  useEffect(() => {
    if (routeLocale !== currentLocale) {
      setCurrentLocale(routeLocale);
      setPersistedLocale(routeLocale);
    }
  }, [routeLocale]);

  // Update SEO head tags on page or locale change
  useEffect(() => {
    updatePageSEO(activePage, currentLocale);
  }, [activePage, currentLocale]);

  // Refresh admin-editable working hours from the backend once per session
  useEffect(() => {
    void fetchWorkingHours();
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setPersistedLocale(newLocale);
    setCurrentLocale(newLocale);

    // Update URL path keeping page
    const segments = currentPath.split('/').filter(Boolean);
    const hasLocalePrefix = segments.length > 0 && ['en', 'pl', 'uk'].includes(segments[0]);
    const subpage = hasLocalePrefix ? segments.slice(1).join('/') : segments.join('/');

    const newPath = subpage ? `/${newLocale}/${subpage}` : `/${newLocale}`;
    window.history.pushState({}, '', newPath);
    setCurrentPath(newPath);
  };

  const handleSelectTreatmentForBooking = (treatmentId: string, durationMinutes?: number) => {
    setPreselectedTreatmentId(treatmentId);
    setPreselectedDuration(durationMinutes);
  };

  return (
    <div className="app-layout">
      <Header
        currentLocale={currentLocale}
        onLocaleChange={handleLocaleChange}
        currentPath={currentPath}
        onNavigate={handleNavigate}
      />

      {/* Dynamic Page Router */}
      {activePage === 'home' && (
        <HomePage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
          onSelectTreatmentForBooking={handleSelectTreatmentForBooking}
        />
      )}

      {activePage === 'about' && (
        <AboutPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'services' && (
        <ServicesPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
          onSelectTreatmentForBooking={handleSelectTreatmentForBooking}
        />
      )}

      {activePage === 'booking' && !activeSubPage && (
        <BookingPage
          currentLocale={currentLocale}
          preselectedTreatmentId={preselectedTreatmentId}
          preselectedDurationMinutes={preselectedDuration}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'booking' && activeSubPage === 'success' && (
        <BookingSuccessPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'booking' && activeSubPage === 'cancelled' && (
        <BookingCancelledPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'membership' && (
        <MembershipPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'account' && (
        <AccountPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'intake' && (
        <HealthIntakePage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'contact' && (
        <ContactPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
        />
      )}

      {activePage === 'privacy' && (
        <PrivacyPage
          currentLocale={currentLocale}
          onNavigate={handleNavigate}
          onOpenCookieSettings={() => setCookieSettingsExplicitOpen(true)}
        />
      )}

      {activePage === 'admin' && (
        <AdminPage
          currentLocale={currentLocale}
        />
      )}

      <Footer
        currentLocale={currentLocale}
        onLocaleChange={handleLocaleChange}
        onNavigate={handleNavigate}
        onOpenCookieSettings={() => setCookieSettingsExplicitOpen(true)}
      />

      {/* GDPR Cookie Consent Banner & Modal */}
      <CookieBanner
        currentLocale={currentLocale}
        isOpenExplicitly={cookieSettingsExplicitOpen}
        onCloseExplicit={() => setCookieSettingsExplicitOpen(false)}
      />
    </div>
  );
};
