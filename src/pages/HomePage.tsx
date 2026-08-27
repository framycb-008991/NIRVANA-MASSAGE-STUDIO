import React from 'react';
import { Locale } from '../types';
import { getTranslation, formatCurrency } from '../services/i18n';
import { getAllTreatments, treatmentImageSrc } from '../services/treatments';
import { usePhotos } from '../hooks/usePhotos';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { DynamicPhotoShowcase, PhotoSlide } from '../components/DynamicPhotoShowcase';
import { TherapistCard } from '../components/TherapistCard';
import { ArrowRight, Sparkles, Clock, CheckCircle2 } from 'lucide-react';

interface HomePageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
  onSelectTreatmentForBooking: (treatmentId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentLocale,
  onNavigate,
  onSelectTreatmentForBooking
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);
  const { photo } = usePhotos();

  const featuredTreatments = getAllTreatments().filter(t => t.featured);

  const heroSlides: PhotoSlide[] = [
    {
      src: photo('home-hero-1'),
      alt: 'Alina Heorhiieva performing therapeutic back massage at Nirvana Studio Wrocław',
      badge: 'Alina Heorhiieva • 7+ Years Experience',
      caption: 'Alina Heorhiieva — Physiotherapist & Massage Specialist'
    },
    {
      src: photo('home-hero-2'),
      alt: 'Alina performing assisted stretching and joint mobility therapy',
      badge: 'Masaż stretchingowy & Mobility',
      caption: 'Assisted Stretching & Musculoskeletal Rehabilitation'
    },
    {
      src: photo('home-hero-3'),
      alt: 'Specialized IASTM Kashalot Blade for myofascial scraping and sports recovery',
      badge: 'IASTM Myofascial Therapy',
      caption: 'Precision Fascial Scraping & Muscle Decompression'
    },
    {
      src: photo('home-hero-4'),
      alt: 'Vacuum cupping therapy along client back and shoulders',
      badge: 'Bańki Chińskie & Drenaż',
      caption: 'Vacuum Cupping Therapy & Deep Circulation'
    },
    {
      src: photo('home-hero-5'),
      alt: 'Nirvana Massage Studio sanctuary with serene treatment table and natural light',
      badge: 'Wrocław Studio Sanctuary',
      caption: 'Nirvana Massage Studio • ul. Przedmiejska 2/02'
    }
  ];

  return (
    <main id="main-content">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        {/* Background Halftone Watermark */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '5%',
            pointerEvents: 'none',
            opacity: 0.09
          }}
        >
          <HalftoneCircle size={480} color="#8A7A68" />
        </div>

        <div className="container hero-grid" style={{ alignItems: 'center' }}>
          {/* Content */}
          <div className="hero-content">
            <span className="badge badge-taupe" style={{ marginBottom: '1.2rem' }}>
              <Sparkles size={13} />
              <span>{t('hero.eyebrow')}</span>
            </span>

            <h1 id="hero-title" className="hero-title">
              {t('hero.title')}
            </h1>

            <p className="hero-subtitle">
              {t('hero.subtitle')}
            </p>

            <div className="hero-cta-row">
              <button
                className="btn btn-primary"
                onClick={() => onNavigate(`/${currentLocale}/booking`)}
              >
                <span>{t('hero.cta_book')}</span>
                <ArrowRight size={16} />
              </button>

              <button
                className="btn btn-outline"
                onClick={() => onNavigate(`/${currentLocale}/services`)}
              >
                <span>{t('hero.cta_explore')}</span>
              </button>
            </div>

            {/* Quick trust metrics */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', marginTop: '2.5rem', paddingTop: '1.8rem', borderTop: '1px solid rgba(201,190,176,0.35)', fontSize: '0.84rem', color: 'var(--ink-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} color="#8A7A68" />
                <span>Solo Practice (Alina Heorhiieva)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} color="#8A7A68" />
                <span>Praktyka na Tajwanie &amp; dyp. med.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={15} color="#8A7A68" />
                <span>Wrocław Przedmiejska 2/02</span>
              </div>
            </div>
          </div>

          {/* Dynamic Hero Visual Showcase */}
          <div style={{ maxWidth: '480px', width: '100%', margin: '0 auto' }}>
            <DynamicPhotoShowcase
              slides={heroSlides}
              autoPlayInterval={4000}
              aspectRatio="4/5"
            />
          </div>
        </div>
      </section>

      {/* Philosophy Scroll Excerpt */}
      <section className="section-spacing" style={{ backgroundColor: 'var(--white)', position: 'relative', overflow: 'hidden' }}>
        {/* Halftone Watermark behind Philosophy */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            opacity: 0.05
          }}
        >
          <HalftoneCircle size={600} color="#8A7A68" withAmbientGrid={true} />
        </div>

        <div className="container-narrow" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="label-caps">{t('home.philosophy_badge')}</span>
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginTop: '0.8rem', marginBottom: '1.5rem', lineHeight: '1.25' }}>
              {t('home.philosophy_title')}
            </h2>
            <div className="accent-underline" style={{ margin: '0 auto 2.5rem' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '2.5rem', fontSize: '1.05rem', lineHeight: '1.8' }}>
            <p>{t('home.philosophy_text_1')}</p>
            <p>{t('home.philosophy_text_2')}</p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => onNavigate(`/${currentLocale}/about`)}
            >
              <span>{t('home.read_more')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Featured Treatments Teaser */}
      <section className="section-spacing" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Floating background watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-100px',
            pointerEvents: 'none',
            opacity: 0.06
          }}
        >
          <HalftoneCircle size={440} color="#8A7A68" withAmbientGrid={true} />
        </div>

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-heading-center">
            <span className="label-caps">{t('nav.services')}</span>
            <h2>{t('home.featured_title')}</h2>
            <p>{t('home.featured_subtitle')}</p>
          </div>

          <div className="treatments-grid">
            {featuredTreatments.map((treatment) => {
              return (
                <article key={treatment.id} className="treatment-card">
                  <div>
                    <div style={{ position: 'relative', height: '170px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '1.2rem', backgroundColor: 'var(--mist)' }}>
                      <img
                        src={treatmentImageSrc(treatment, photo)}
                        alt={t(treatment.nameKey)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }}
                        loading="lazy"
                      />
                      <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem' }}>
                        <span className="badge badge-sage" style={{ fontSize: '0.68rem', backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.9)' }}>
                          {treatment.categoryKey}
                        </span>
                      </div>
                    </div>

                    <div className="treatment-card-header">
                      <h3 className="treatment-card-title">{t(treatment.nameKey)}</h3>
                    </div>

                    <p className="treatment-card-desc">{t(treatment.shortDescKey)}</p>

                    <div className="treatment-durations-row">
                      {treatment.durations.map((d) => (
                        <div key={d.minutes} className="duration-tag">
                          <Clock size={12} color="#8A7A68" />
                          <span>
                            {d.minutes === 30
                              ? (currentLocale === 'pl' ? '30 min' : currentLocale === 'uk' ? '30 хв' : '30 min')
                              : d.minutes === 60
                              ? (currentLocale === 'pl' ? '1 godz.' : currentLocale === 'uk' ? '1 год.' : '1 hr')
                              : (currentLocale === 'pl' ? '1 godz. 30 min' : currentLocale === 'uk' ? '1 год. 30 хв' : '1.5 hr')}
                          </span>
                          <span className="tag-price">
                            {formatCurrency(d.pricePLN, 'PLN', currentLocale)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1.2rem', borderTop: '1px solid rgba(201,190,176,0.3)' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.65rem 1.4rem', fontSize: '0.8rem', width: '100%' }}
                      onClick={() => {
                        onSelectTreatmentForBooking(treatment.id);
                        onNavigate(`/${currentLocale}/booking`);
                      }}
                    >
                      <span>{t('services.book_this')}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => onNavigate(`/${currentLocale}/services`)}
            >
              <span>{t('home.view_all_services')}</span>
              <ArrowRight size={14} />
            </button>

            <div style={{ marginTop: '1.6rem', fontSize: '0.88rem', color: 'var(--ink-light)' }}>
              {t('membership.home_teaser')}{' '}
              <button
                type="button"
                className="edit-back-link"
                style={{ fontSize: '0.88rem' }}
                onClick={() => onNavigate(`/${currentLocale}/membership`)}
              >
                {t('membership.home_teaser_link')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Therapist Module on Home */}
      <section className="section-spacing" style={{ paddingTop: 0 }}>
        <div className="container">
          <TherapistCard
            currentLocale={currentLocale}
            onBookClick={() => onNavigate(`/${currentLocale}/booking`)}
          />
        </div>
      </section>
    </main>
  );
};
