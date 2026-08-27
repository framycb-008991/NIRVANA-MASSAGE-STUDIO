import React from 'react';
import { Locale } from '../types';
import { getTranslation } from '../services/i18n';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { ArrowRight, Info } from 'lucide-react';

interface BookingCancelledPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

export const BookingCancelledPage: React.FC<BookingCancelledPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
      <div className="container">
        <div className="confirmed-panel">
          {/* Halftone watermark */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-80px',
              pointerEvents: 'none',
              opacity: 0.12
            }}
          >
            <HalftoneCircle size={380} color="#FFFFFF" />
          </div>

          <Info size={54} color="#FFFFFF" style={{ margin: '0 auto' }} />
          <h2>{t('booking.payment_cancelled_title')}</h2>
          <p style={{ fontSize: '1.08rem', maxWidth: '520px', margin: '0 auto 2rem', opacity: 0.9 }}>
            {t('booking.payment_cancelled_text')}
          </p>

          <div className="calendar-actions-row">
            <button
              className="btn btn-primary"
              onClick={() => onNavigate(`/${currentLocale}/booking`)}
            >
              <span>{t('booking.payment_cancelled_cta')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};
