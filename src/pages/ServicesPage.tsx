import React from 'react';
import { Locale } from '../types';
import { getTranslation, formatCurrency } from '../services/i18n';
import { TREATMENTS } from '../services/storage';
import { usePhotos } from '../hooks/usePhotos';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { Clock, Sparkles, CheckCircle2 } from 'lucide-react';

interface ServicesPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
  onSelectTreatmentForBooking: (treatmentId: string, durationMinutes?: number) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  currentLocale,
  onNavigate,
  onSelectTreatmentForBooking
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);
  const { photo } = usePhotos();

  const handleBook = (treatmentId: string, durationMinutes: number) => {
    onSelectTreatmentForBooking(treatmentId, durationMinutes);
    onNavigate(`/${currentLocale}/booking`);
  };

  const formatDurationDisplay = (mins: number) => {
    if (mins === 30) return currentLocale === 'pl' ? '30 min' : currentLocale === 'uk' ? '30 хв' : '30 min';
    if (mins === 60) return currentLocale === 'pl' ? '1 godz.' : currentLocale === 'uk' ? '1 год.' : '1 hour';
    if (mins === 90) return currentLocale === 'pl' ? '1 godz. 30 min' : currentLocale === 'uk' ? '1 год. 30 хв' : '1 hr 30 min';
    return `${mins} min`;
  };

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background Top Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          left: '5%',
          pointerEvents: 'none',
          opacity: 0.05
        }}
      >
        <HalftoneCircle size={480} color="#8A7A68" withAmbientGrid={true} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="section-heading-center">
          <span className="label-caps">{t('nav.services')}</span>
          <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', marginTop: '0.6rem' }}>
            {t('services.title')}
          </h1>
          <p style={{ fontSize: '1.15rem' }}>{t('services.subtitle')}</p>
          <div className="accent-underline" style={{ margin: '1.5rem auto 0' }} />
        </div>

        {/* Custom Note Banner */}
        <div
          style={{
            maxWidth: '820px',
            margin: '2rem auto 4rem',
            backgroundColor: 'var(--sage-wash)',
            border: '1px solid rgba(166, 169, 156, 0.4)',
            borderRadius: 'var(--radius-full)',
            padding: '0.85rem 1.8rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--ink)',
            position: 'relative'
          }}
        >
          <Sparkles size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--taupe)' }} />
          <span>{t('services.custom_note')}</span>
        </div>

        {/* Full Treatments List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '1080px', margin: '0 auto' }}>
          {TREATMENTS.map((treatment) => (
            <article
              key={treatment.id}
              style={{
                backgroundColor: 'var(--white)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(201, 190, 176, 0.4)',
                boxShadow: 'var(--shadow-subtle)',
                padding: '2.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                gap: '2.5rem',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Card Watermark */}
              <div
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  pointerEvents: 'none',
                  opacity: 0.06
                }}
              >
                <HalftoneCircle size={220} color="#8A7A68" />
              </div>

              {/* Treatment Photo Column */}
              <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', aspectRatio: '4/3', border: '1px solid rgba(201, 190, 176, 0.3)', backgroundColor: 'var(--mist)' }}>
                <img
                  src={photo(`treatment-${treatment.id}`)}
                  alt={t(treatment.nameKey)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
                  loading="lazy"
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0.8rem',
                    left: '0.8rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(6px)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--taupe)'
                  }}
                >
                  {treatment.categoryKey}
                </div>
              </div>

              {/* Treatment Details Column */}
              <div>
                <span className="badge badge-sage" style={{ marginBottom: '0.8rem' }}>
                  {treatment.categoryKey}
                </span>
                <h2 style={{ fontSize: '1.85rem', marginBottom: '1rem', color: 'var(--ink)', lineHeight: '1.25' }}>
                  {t(treatment.nameKey)}
                </h2>
                <p style={{ fontSize: '0.96rem', lineHeight: '1.75', color: 'var(--ink-light)', marginBottom: '1.5rem' }}>
                  {t(treatment.fullDescKey)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--taupe)' }}>
                  <CheckCircle2 size={16} />
                  <span>Alina Heorhiieva • Indywidualne podejście &amp; aromaterapia</span>
                </div>
              </div>

              {/* Durations & Booking CTAs */}
              <div
                style={{
                  backgroundColor: 'var(--mist)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.8rem',
                  border: '1px solid rgba(201, 190, 176, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--taupe)', fontWeight: 600 }}>
                  {t('services.duration_label')} &amp; {t('services.price_label')}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {treatment.durations.map((d) => (
                    <div
                      key={d.minutes}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--white)',
                        padding: '0.85rem 1.2rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(201, 190, 176, 0.4)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Clock size={16} color="#8A7A68" />
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--ink)' }}>
                          {formatDurationDisplay(d.minutes)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--taupe)', fontSize: '1.05rem' }}>
                          {formatCurrency(d.pricePLN, 'PLN', currentLocale)}
                        </span>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.45rem 0.95rem', fontSize: '0.78rem' }}
                          onClick={() => handleBook(treatment.id, d.minutes)}
                        >
                          <span>{t('services.book_this')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};
