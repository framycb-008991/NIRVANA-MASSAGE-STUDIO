import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { TherapistCard } from '../components/TherapistCard';
import { Feather, Heart, Sun } from 'lucide-react';

interface AboutPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const journeySteps = [
    {
      icon: <Feather size={28} color="#8A7A68" />,
      title: t('about.step1_title'),
      desc: t('about.step1_desc')
    },
    {
      icon: <Heart size={28} color="#8A7A68" />,
      title: t('about.step2_title'),
      desc: t('about.step2_desc')
    },
    {
      icon: <Sun size={28} color="#8A7A68" />,
      title: t('about.step3_title'),
      desc: t('about.step3_desc')
    }
  ];

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background Top Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-100px',
          pointerEvents: 'none',
          opacity: 0.06
        }}
      >
        <HalftoneCircle size={520} color="#8A7A68" withAmbientGrid={true} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Page Title */}
        <div className="section-heading-center">
          <span className="label-caps">{t('nav.about')}</span>
          <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', marginTop: '0.6rem' }}>
            {t('about.title')}
          </h1>
          <p style={{ fontSize: '1.15rem' }}>{t('about.subtitle')}</p>
          <div className="accent-underline" style={{ margin: '1.5rem auto 0' }} />
        </div>

        {/* The 3-Step Journey Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', margin: '4rem 0 6rem' }}>
          {journeySteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--white)',
                padding: '3rem 2.2rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(201, 190, 176, 0.4)',
                boxShadow: 'var(--shadow-subtle)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Card Watermark */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-30px',
                  right: '-30px',
                  pointerEvents: 'none',
                  opacity: 0.07
                }}
              >
                <HalftoneCircle size={150} color="#8A7A68" />
              </div>

              <div style={{ marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>{step.icon}</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--ink)', position: 'relative', zIndex: 1 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.96rem', lineHeight: '1.75', color: 'var(--ink-light)', position: 'relative', zIndex: 1 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Dynamic Studio & Clinical Methods Photo Gallery */}
        <section style={{ margin: '0 0 6rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span className="label-caps">Studio &amp; Clinical Methods</span>
            <h2 style={{ fontSize: '2.2rem', marginTop: '0.4rem', color: 'var(--ink)' }}>
              Inside Nirvana Studio Wrocław
            </h2>
            <p style={{ color: 'var(--ink-light)', maxWidth: '650px', margin: '0.6rem auto 0', fontSize: '0.96rem' }}>
              Real moments from therapeutic sessions, assisted stretching, IASTM myofascial release, and restorative cupping therapy.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              {
                src: '/assets/alina-portrait-back.jpg',
                title: 'Alina Heorhiieva',
                sub: 'Physiotherapy & Somatic Bodywork',
                desc: 'Individualized rehabilitation and gentle therapeutic back massage in calm natural light.'
              },
              {
                src: '/assets/alina-stretching-leg.jpg',
                title: 'Masaż Stretchingowy & Mobilność',
                sub: 'Assisted Musculoskeletal Stretching',
                desc: 'Restoring joint range of motion and relieving chronic lower extremity tension.'
              },
              {
                src: '/assets/treatment-blade-iastm.jpg',
                title: 'IASTM Kashalot Blade',
                sub: 'Myofascial Scraping & Sports Rehab',
                desc: 'Specialized stainless steel instrument for fascial adhesions and athletic recovery.'
              },
              {
                src: '/assets/treatment-cupping.jpg',
                title: 'Bańki Chińskie & Drenaż',
                sub: 'Vacuum Cupping Detox',
                desc: 'Stimulating deep blood flow, microcirculation, and lymphatic drainage along the spine.'
              }
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'var(--white)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '1px solid rgba(201, 190, 176, 0.4)',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(46,44,40,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-subtle)';
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', backgroundColor: 'var(--mist)' }}>
                  <img
                    src={card.src}
                    alt={card.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '0.8rem',
                      left: '0.8rem',
                      backgroundColor: 'rgba(255,255,255,0.92)',
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
                    {card.title}
                  </div>
                </div>
                <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1.05rem', margin: '0 0 0.4rem', color: 'var(--ink)' }}>{card.title}</h4>
                    <div style={{ fontSize: '0.78rem', color: 'var(--taupe)', fontWeight: 600, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {card.sub}
                    </div>
                    <p style={{ fontSize: '0.86rem', color: 'var(--ink-light)', lineHeight: '1.55', margin: 0 }}>
                      {card.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About the Therapist Module */}
        <TherapistCard
          currentLocale={currentLocale}
          onBookClick={() => onNavigate(`/${currentLocale}/booking`)}
        />

        {/* Studio Sanctuary Note */}
        <div
          style={{
            marginTop: '5rem',
            backgroundColor: 'var(--sage-wash)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem',
            border: '1px solid rgba(166, 169, 156, 0.35)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Watermark in Sanctuary Box */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              pointerEvents: 'none',
              opacity: 0.08
            }}
          >
            <HalftoneCircle size={320} color="#8A7A68" withAmbientGrid={true} />
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="label-caps">Sanctuary & Environment</span>
            <h3 style={{ fontSize: '2rem', margin: '0.6rem 0 1rem' }}>
              Organic Botanicals & Clean Air
            </h3>
            <p style={{ fontSize: '0.96rem', lineHeight: '1.75' }}>
              We source only certified organic, unrefined cold-pressed jojoba oils, therapeutic-grade botanical essences, and 100% natural beeswax candles. Every towel is unbleached organic linen and cotton, washed with zero-fragrance hypoallergenic detergents.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', zIndex: 1 }}>
            <div style={{ backgroundColor: 'var(--white)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(201,190,176,0.3)' }}>
              <strong>Pure European Basalt:</strong> Hand-selected volcanic river stones heated to calibrated therapeutic temperatures.
            </div>
            <div style={{ backgroundColor: 'var(--white)', padding: '1.2rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(201,190,176,0.3)' }}>
              <strong>Acoustic Peace:</strong> Calibrated ambient soundscapes or complete therapeutic silence, tuned to your preference.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
