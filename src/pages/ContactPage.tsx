import React, { useState } from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { InstagramIcon } from '../components/InstagramIcon';
import { MapPin, Phone, Mail, Clock, Plane, Send, CheckCircle2 } from 'lucide-react';

interface ContactPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const [travelName, setTravelName] = useState('');
  const [travelEmail, setTravelEmail] = useState('');
  const [travelLocation, setTravelLocation] = useState('');
  const [travelMessage, setTravelMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleTravelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '4rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background Top Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '-100px',
          right: '5%',
          pointerEvents: 'none',
          opacity: 0.06
        }}
      >
        <HalftoneCircle size={480} color="#8A7A68" withAmbientGrid={true} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="section-heading-center">
          <span className="label-caps">{t('nav.contact')}</span>
          <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', marginTop: '0.6rem' }}>
            {t('contact.title')}
          </h1>
          <p style={{ fontSize: '1.15rem' }}>{t('contact.subtitle')}</p>
          <div className="accent-underline" style={{ margin: '1.5rem auto 0' }} />
        </div>

        {/* 2-Column Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '3rem', margin: '4rem 0' }}>
          {/* Studio Details */}
          <div style={{ backgroundColor: 'var(--white)', padding: '3rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)', position: 'relative', overflow: 'hidden' }}>
            {/* Watermark in Studio Details Card */}
            <div
              style={{
                position: 'absolute',
                bottom: '-40px',
                right: '-40px',
                pointerEvents: 'none',
                opacity: 0.06
              }}
            >
              <HalftoneCircle size={240} color="#8A7A68" />
            </div>

            <h3 style={{ fontSize: '1.8rem', marginBottom: '2rem', color: 'var(--ink)' }}>
              Studio Location
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--taupe-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={18} color="#8A7A68" />
                </div>
                <div>
                  <div className="label-caps" style={{ fontSize: '0.7rem' }}>{t('contact.address_label')}</div>
                  <div style={{ fontSize: '1.05rem', color: 'var(--ink)', fontWeight: 500, marginTop: '2px' }}>
                    {t('contact.address_val')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-light)', marginTop: '4px' }}>
                    Wrocław (Szczepin / Fabryczna • near Wrocław Mikołajów)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--taupe-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} color="#8A7A68" />
                </div>
                <div>
                  <div className="label-caps" style={{ fontSize: '0.7rem' }}>{t('contact.hours_label')}</div>
                  <div style={{ fontSize: '1rem', color: 'var(--ink)', fontWeight: 500, marginTop: '2px' }}>
                    {t('contact.hours_val')}
                  </div>
                </div>
              </div>

              {/* Instagram Card & Link */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--taupe-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <InstagramIcon size={18} color="#8A7A68" />
                </div>
                <div>
                  <div className="label-caps" style={{ fontSize: '0.7rem' }}>Instagram</div>
                  <a
                    href="https://www.instagram.com/nirvana_massage.studio/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '1.05rem', color: 'var(--taupe)', fontWeight: 600, textDecoration: 'none', display: 'inline-block', marginTop: '2px' }}
                  >
                    @nirvana_massage.studio
                  </a>
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink-light)', marginTop: '3px' }}>
                    Masaż / Rehabilitacja • Wrocław PL / UA
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--taupe-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={18} color="#8A7A68" />
                </div>
                <div>
                  <div className="label-caps" style={{ fontSize: '0.7rem' }}>{t('contact.email_label')}</div>
                  <div style={{ fontSize: '1rem', color: 'var(--ink)', fontWeight: 500, marginTop: '2px' }}>
                    {t('contact.email_val')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--taupe-wash)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={18} color="#8A7A68" />
                </div>
                <div>
                  <div className="label-caps" style={{ fontSize: '0.7rem' }}>{t('contact.phone_label')}</div>
                  <div style={{ fontSize: '1rem', color: 'var(--ink)', fontWeight: 500, marginTop: '2px' }}>
                    {t('contact.phone_val')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => onNavigate(`/${currentLocale}/booking`)}
              >
                {t('hero.cta_book')}
              </button>

              <a
                href="https://nirvana-massage-studio.easyweek.pl?ref=instagram"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ width: '100%', textAlign: 'center' }}
              >
                <span>Book via EasyWeek Portal</span>
              </a>
            </div>
          </div>

          {/* Interactive Stylized Map & Arrival Experience */}
          <div
            style={{
              backgroundColor: 'var(--sage-wash)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(166, 169, 156, 0.4)',
              padding: '2.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
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
                opacity: 0.1
              }}
            >
              <HalftoneCircle size={280} color="#8A7A68" />
            </div>

            <div>
              <span className="label-caps">Arrival & Transit</span>
              <h3 style={{ fontSize: '1.8rem', margin: '0.5rem 0 1.2rem' }}>
                Studio in Wrocław
              </h3>
              <p style={{ fontSize: '0.96rem', lineHeight: '1.7', color: 'var(--ink)' }}>
                Located at <strong>ul. Przedmiejska 2/02</strong> in Wrocław (Fabryczna / Szczepin). Direct access from Legnicka and Strzegomska thoroughfares. Convenient connection via Wrocław Mikołajów railway station (3 min walk) and trams (lines 3, 10, 20, 31, 32, 33). Street and courtyard parking available.
              </p>
            </div>

            {/* Stylized Visual Map Card */}
            <div
              style={{
                backgroundColor: 'var(--white)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                border: '1px solid rgba(201, 190, 176, 0.4)',
                marginTop: '1.5rem',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, fontSize: '0.92rem' }}>
                  <MapPin size={16} color="#8A7A68" />
                  <span>Wrocław • Przedmiejska 2/02</span>
                </div>
                <span className="badge badge-sage">51.1118° N, 16.9985° E</span>
              </div>
              <div style={{ height: '140px', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px dashed var(--taupe-light)' }}>
                <div style={{ textAlign: 'center' }}>
                  <HalftoneCircle size={36} color="#8A7A68" />
                  <div style={{ fontSize: '0.82rem', color: 'var(--ink)', marginTop: '6px', fontWeight: 600 }}>
                    Nirvana Massage Studio
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--ink-light)' }}>
                    Alina Heorhiieva • ul. Przedmiejska 2/02, Wrocław
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Private Travel Inquiry Form */}
        <section
          style={{
            backgroundColor: 'var(--white)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem',
            border: '1px solid rgba(201, 190, 176, 0.4)',
            boxShadow: 'var(--shadow-card)',
            marginTop: '2rem'
          }}
        >
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
              <Plane size={20} color="#8A7A68" />
              <span className="label-caps">{t('contact.travel_title')}</span>
            </div>
            <h3 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              Request Private / International Travel Bodywork
            </h3>
            <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--ink-light)', marginBottom: '2rem' }}>
              {t('contact.travel_desc')}
            </p>

            {sent ? (
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--sage-wash)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <CheckCircle2 size={24} color="#557A55" />
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>
                  Thank you. Alina will review your travel inquiry and respond within 24 hours.
                </span>
              </div>
            ) : (
              <form onSubmit={handleTravelSubmit}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input
                      type="text"
                      className="custom-input"
                      required
                      value={travelName}
                      onChange={(e) => setTravelName(e.target.value)}
                      placeholder="e.g. David Miller"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      className="custom-input"
                      required
                      value={travelEmail}
                      onChange={(e) => setTravelEmail(e.target.value)}
                      placeholder="david@example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Requested City, Country or Hotel Residence *</label>
                  <input
                    type="text"
                    className="custom-input"
                    required
                    value={travelLocation}
                    onChange={(e) => setTravelLocation(e.target.value)}
                    placeholder="e.g. The Bridge Wrocław, Monopol Wrocław, Kraków, or Berlin Residence"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Session Details &amp; Preferred Dates</label>
                  <textarea
                    className="custom-textarea"
                    rows={3}
                    value={travelMessage}
                    onChange={(e) => setTravelMessage(e.target.value)}
                    placeholder="Describe your desired treatments, number of guests, and approximate dates..."
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  <Send size={14} />
                  <span>{t('contact.travel_btn')}</span>
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
