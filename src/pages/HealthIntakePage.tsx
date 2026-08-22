import React, { useState, useEffect } from 'react';
import { Locale, HealthIntake } from '../types';
import { getTranslation } from '../services/i18n';
import { saveHealthIntake, getBookings } from '../services/storage';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { ShieldCheck, CheckCircle2, ArrowRight, HeartPulse } from 'lucide-react';

interface HealthIntakePageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

export const HealthIntakePage: React.FC<HealthIntakePageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const [bookingId, setBookingId] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [injuries, setInjuries] = useState<string>('');
  const [medicalConditions, setMedicalConditions] = useState<string>('');
  const [pregnancyStatus, setPregnancyStatus] = useState<string>('');
  const [pressure, setPressure] = useState<'gentle' | 'medium' | 'firm' | 'therapeutic_deep'>('medium');
  const [consentGiven, setConsentGiven] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Parse ?booking_id from URL
    const urlParams = new URLSearchParams(window.location.search);
    const bId = urlParams.get('booking_id');
    if (bId) {
      setBookingId(bId);
      const bookings = getBookings();
      const matched = bookings.find(b => b.id === bId);
      if (matched) {
        setClientName(`${matched.client.firstName} ${matched.client.surname}`);
        setClientEmail(matched.client.email);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGiven) {
      setErrorMessage('Explicit GDPR consent is required to submit health and contraindication information.');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim()) {
      setErrorMessage('Please provide your name and email address.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const intake: HealthIntake = {
      id: 'intake_' + Date.now().toString(36),
      bookingId: bookingId || undefined,
      clientName,
      clientEmail,
      dateSubmitted: new Date().toISOString(),
      injuriesOrPain: injuries,
      pregnancyStatus,
      medicalConditions,
      pressurePreference: pressure,
      gdprExplicitConsent: consentGiven,
      locale: currentLocale
    };

    setTimeout(() => {
      saveHealthIntake(intake);
      setIsSubmitting(false);
      setSubmitted(true);
      window.scrollTo({ top: 80, behavior: 'smooth' });
    }, 500);
  };

  if (submitted) {
    return (
      <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem' }}>
        <div className="container-narrow">
          <div className="confirmed-panel" style={{ backgroundColor: 'var(--sage)' }}>
            <CheckCircle2 size={54} color="#FFFFFF" style={{ margin: '0 auto 1.2rem' }} />
            <h2>{t('intake.success_title')}</h2>
            <p style={{ fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2.5rem' }}>
              {t('intake.success_desc')}
            </p>
            <button
              className="btn btn-primary"
              style={{ backgroundColor: 'var(--ink)', color: 'var(--white)' }}
              onClick={() => onNavigate(`/${currentLocale}`)}
            >
              <span>Return to Home</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem' }}>
      <div className="container-narrow">
        {/* Header */}
        <div className="section-heading-center">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <HeartPulse size={18} color="#8A7A68" />
            <span className="label-caps">Client Health & Safety</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.4rem)' }}>
            {t('intake.title')}
          </h1>
          <p>{t('intake.subtitle')}</p>
          <div className="accent-underline" style={{ margin: '1.5rem auto 0' }} />
        </div>

        {/* Intake Form Card */}
        <div
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 3rem',
            border: '1px solid rgba(201, 190, 176, 0.4)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Halftone watermark */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              pointerEvents: 'none',
              opacity: 0.07
            }}
          >
            <HalftoneCircle size={260} color="#8A7A68" />
          </div>

          <form onSubmit={handleSubmit}>
            {bookingId && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1.2rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <strong>{t('intake.booking_ref')}:</strong> {bookingId}
              </div>
            )}

            {/* Client Info */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">{t('intake.client_name')} *</label>
                <input
                  type="text"
                  className="custom-input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Aleksandra Kowalska"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('intake.client_email')} *</label>
                <input
                  type="email"
                  className="custom-input"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="aleksandra@example.pl"
                  required
                />
              </div>
            </div>

            {/* Injuries / Pain Areas */}
            <div className="form-group">
              <label className="form-label">{t('intake.injuries_title')}</label>
              <textarea
                className="custom-textarea"
                rows={3}
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                placeholder={t('intake.injuries_placeholder')}
              />
            </div>

            {/* Medical Conditions & Allergies */}
            <div className="form-group">
              <label className="form-label">{t('intake.medical_title')}</label>
              <textarea
                className="custom-textarea"
                rows={3}
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder={t('intake.medical_placeholder')}
              />
            </div>

            {/* Pregnancy Status */}
            <div className="form-group">
              <label className="form-label">{t('intake.pregnancy_title')}</label>
              <input
                type="text"
                className="custom-input"
                value={pregnancyStatus}
                onChange={(e) => setPregnancyStatus(e.target.value)}
                placeholder={t('intake.pregnancy_placeholder')}
              />
            </div>

            {/* Pressure Preference */}
            <div className="form-group" style={{ margin: '2rem 0' }}>
              <label className="form-label" style={{ marginBottom: '0.8rem' }}>
                {t('intake.pressure_title')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
                {[
                  { key: 'gentle', label: t('intake.pressure_gentle') },
                  { key: 'medium', label: t('intake.pressure_medium') },
                  { key: 'firm', label: t('intake.pressure_firm') },
                  { key: 'therapeutic_deep', label: t('intake.pressure_deep') }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPressure(item.key as any)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: pressure === item.key ? 'var(--taupe-wash)' : 'var(--mist)',
                      border: `1.5px solid ${pressure === item.key ? 'var(--taupe)' : 'rgba(201,190,176,0.4)'}`,
                      color: 'var(--ink)',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      fontWeight: pressure === item.key ? 500 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* GDPR Article 9 Explicit Consent Checkbox (HEALTH_INTAKE_SPEC & GDPR_PRIVACY_SPEC) */}
            <div
              style={{
                backgroundColor: 'var(--sage-wash)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                border: '1px solid rgba(166, 169, 156, 0.4)',
                margin: '2.5rem 0'
              }}
            >
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  id="gdpr-health-consent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    accentColor: 'var(--taupe)',
                    marginTop: '3px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  required
                />
                <div>
                  <label
                    htmlFor="gdpr-health-consent"
                    style={{
                      fontWeight: 500,
                      fontSize: '0.92rem',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      display: 'block',
                      marginBottom: '0.4rem'
                    }}
                  >
                    {t('intake.consent_text')}
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-light)', margin: 0, lineHeight: '1.5' }}>
                    {t('intake.consent_sub')}
                  </p>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div style={{ color: '#B25E5E', fontSize: '0.88rem', marginBottom: '1.5rem', padding: '0.8rem', backgroundColor: '#FDF2F2', borderRadius: 'var(--radius-sm)' }}>
                {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !consentGiven}
              >
                <ShieldCheck size={16} />
                <span>{isSubmitting ? t('intake.submitting') : t('intake.btn_submit')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};
