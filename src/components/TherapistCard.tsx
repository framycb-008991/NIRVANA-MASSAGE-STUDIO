import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { usePhotos } from '../hooks/usePhotos';
import { useContent } from '../hooks/useContent';
import { HalftoneCircle } from './HalftoneCircle';
import { InstagramIcon } from './InstagramIcon';
import { DynamicPhotoShowcase } from './DynamicPhotoShowcase';
import { Plane, GraduationCap, Globe2, Activity } from 'lucide-react';

interface TherapistCardProps {
  currentLocale: Locale;
  onBookClick?: () => void;
}

export const TherapistCard: React.FC<TherapistCardProps> = ({
  currentLocale,
  onBookClick
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);
  const { photo } = usePhotos();
  const { content } = useContent();

  const skills = [
    'Therapeutic, Sports & Relaxation Massage',
    'Musculoskeletal Rehabilitation & Injury Prevention',
    'Korekcja biustu i dekoltu (Chest & Postural Correction)',
    'Individualized Recovery & Conditioning Programs for All Ages'
  ];

  const education = [
    { year: '2020–2024', title: 'University Degree in Physiotherapy', note: 'Major: Physiotherapy & Rehabilitation' },
    { year: '2016–2020', title: 'Medical College (dyp. med.)', note: 'Major: Nursing & Clinical Anatomy' },
    { year: '2023', title: 'Academic Exchange Program', note: 'University in Hualien City, Taiwan' }
  ];

  const languages = [
    { lang: 'Ukrainian', level: 'Fluent' },
    { lang: 'Polish', level: 'Intermediate' },
    { lang: 'English', level: 'Intermediate' },
    { lang: 'Chinese (Trad.)', level: 'Beginner' }
  ];

  return (
    <section className="therapist-module" aria-labelledby="therapist-heading">
      {/* Halftone subtle watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '-60px',
          right: '-50px',
          pointerEvents: 'none',
          opacity: 0.08
        }}
      >
        <HalftoneCircle size={320} color="#8A7A68" withAmbientGrid={true} />
      </div>

      <div className="therapist-grid">
        {/* Photo Column (Left) with Dynamic Showcase */}
        <div>
          <DynamicPhotoShowcase
            slides={[
              {
                src: photo('therapist-card-1'),
                alt: 'Alina Heorhiieva performing therapeutic back massage',
                badge: 'Alina Heorhiieva • 7+ Years Experience',
                caption: 'Alina Heorhiieva — Physiotherapy & Massage Specialist'
              },
              {
                src: photo('therapist-card-2'),
                alt: 'Alina performing assisted leg stretching and physical therapy',
                badge: 'Stretching & Rehabilitacja',
                caption: 'Assisted Stretching & Musculoskeletal Mobilization'
              },
              {
                src: photo('therapist-card-3'),
                alt: 'Alina with Kashalot Blade for myofascial scraping and sports recovery',
                badge: 'IASTM Myofascial Therapy',
                caption: 'IASTM Kashalot Blade — Precision Fascial Release'
              },
              {
                src: photo('therapist-card-4'),
                alt: 'Vacuum cupping therapy along back and shoulders',
                badge: 'Bańki Chińskie & Drenaż',
                caption: 'Vacuum Cupping Therapy — Circulatory Detox'
              }
            ]}
            autoPlayInterval={4200}
            aspectRatio="4/5"
          />

          {/* Social and Location Badges below photo */}
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <a
              href={`https://www.instagram.com/${content('instagram_handle').replace(/^@/, '')}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                fontSize: '0.82rem',
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <InstagramIcon size={16} color="currentColor" />
              <span>{content('instagram_handle')}</span>
            </a>

            <div style={{ padding: '0.8rem 1rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--ink-light)', border: '1px solid rgba(201,190,176,0.3)' }}>
              <strong>Studio Wrocław:</strong> {content('contact_address')}
            </div>
          </div>
        </div>

        {/* Text Column (Right) */}
        <div>
          <span className="label-caps">{t('about.therapist_section_title')}</span>
          <h3 id="therapist-heading" className="therapist-heading">
            {t('about.therapist_name')}
          </h3>
          <div className="accent-underline" />

          <div className="therapist-name-line">
            <div className="therapist-credentials">
              {t('about.therapist_credentials')}
            </div>
          </div>

          <p style={{ fontSize: '1.02rem', lineHeight: '1.75', marginBottom: '1.2rem', color: 'var(--ink)' }}>
            {t('about.therapist_bio_1')}
          </p>

          <p style={{ fontSize: '0.96rem', lineHeight: '1.75', color: 'var(--ink-light)', marginBottom: '1.5rem' }}>
            {t('about.therapist_bio_2')}
          </p>

          {/* Skills & Specializations */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)', fontWeight: 600, marginBottom: '0.6rem' }}>
              <Activity size={16} />
              <span>Clinical Skills &amp; Focus Areas</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.5rem' }}>
              {skills.map((skill, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--white)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,190,176,0.35)', fontSize: '0.82rem', color: 'var(--ink)' }}>
                  • {skill}
                </div>
              ))}
            </div>
          </div>

          {/* Academic Background & Qualifications */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)', fontWeight: 600, marginBottom: '0.6rem' }}>
              <GraduationCap size={16} />
              <span>Academic Training &amp; Education</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.6rem' }}>
              {education.map((edu, i) => (
                <div key={i} style={{ backgroundColor: 'var(--mist)', padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,190,176,0.3)' }}>
                  <span className="badge badge-taupe" style={{ padding: '0.15rem 0.45rem', fontSize: '0.65rem', marginBottom: '3px' }}>{edu.year}</span>
                  <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--ink)' }}>{edu.title}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--ink-light)' }}>{edu.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Languages Spoken */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)', fontWeight: 600, marginBottom: '0.5rem' }}>
              <Globe2 size={15} />
              <span>Languages</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {languages.map((l, i) => (
                <span key={i} className="badge badge-sage" style={{ textTransform: 'none', fontSize: '0.78rem' }}>
                  <strong>{l.lang}:</strong>&nbsp;{l.level}
                </span>
              ))}
            </div>
          </div>

          {/* Travel Availability Note */}
          <div className="therapist-travel-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.3rem' }}>
              <Plane size={16} color="#8A7A68" />
              <span>Wrocław Studio &amp; Private Travel Sessions</span>
            </div>
            <div>{t('about.therapist_travel_note')}</div>
          </div>

          {onBookClick && (
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={onBookClick}>
                {t('hero.cta_book')}
              </button>

              <a
                href="https://nirvana-massage-studio.easyweek.pl?ref=instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <span>EasyWeek Booking Link</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
