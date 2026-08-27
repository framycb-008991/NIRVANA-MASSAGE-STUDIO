import React, { useEffect, useState } from 'react';
import { Locale } from '../types';
import { getTranslation, formatLocaleDate, formatCurrency } from '../services/i18n';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { CheckCircle2, ArrowRight, FileText, Info } from 'lucide-react';

interface BookingSuccessPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

interface BookingStatusResponse {
  status: 'pending_payment' | 'confirmed' | 'cancelled';
  paymentStatus: string;
  treatmentName: string;
  date: string;
  timeSlot: string;
  amountPaidPLN: number | null;
}

type PageState = 'confirming' | 'confirmed' | 'unconfirmed' | 'missing';

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 12000;

export const BookingSuccessPage: React.FC<BookingSuccessPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const sessionId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('session_id')
    : null;

  const [pageState, setPageState] = useState<PageState>(sessionId ? 'confirming' : 'missing');
  const [booking, setBooking] = useState<BookingStatusResponse | null>(null);

  // Poll until the Stripe webhook confirms the booking (it usually lands a
  // moment after Checkout redirects back here).
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const res = await fetch(`/api/booking-status?session_id=${encodeURIComponent(sessionId)}`);
        if (cancelled) return;

        if (res.status === 404) {
          setPageState('missing');
          return;
        }

        if (res.ok) {
          const data = (await res.json()) as BookingStatusResponse;
          if (data.status === 'confirmed') {
            setBooking(data);
            setPageState('confirmed');
            return;
          }
          if (data.status === 'cancelled') {
            setPageState('unconfirmed');
            return;
          }
        }
      } catch {
        // Transient network/API hiccup — keep polling until the timeout.
      }

      if (cancelled) return;
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        setPageState('unconfirmed');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const watermark = (
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
  );

  // CONFIRMED VIEW
  if (pageState === 'confirmed' && booking) {
    const formattedDate = formatLocaleDate(booking.date, currentLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div className="confirmed-panel">
            {watermark}

            <CheckCircle2 size={54} color="#FFFFFF" style={{ margin: '0 auto' }} />
            <h2>{t('booking.payment_confirmed_title')}</h2>
            <p style={{ fontSize: '1.08rem', maxWidth: '520px', margin: '0 auto 2rem', opacity: 0.9 }}>
              {t('booking.payment_confirmed_subtitle')}
            </p>

            <div className="confirmed-details-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1.2rem' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Treatment
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 500, fontFamily: 'var(--font-serif)' }}>
                    {booking.treatmentName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Date &amp; Time
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                    {formattedDate} • {booking.timeSlot}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    {t('booking.amount_paid')}
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    {booking.amountPaidPLN !== null
                      ? formatCurrency(booking.amountPaidPLN, 'PLN', currentLocale)
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Post-booking Health Intake Callout */}
            <div className="intake-cta-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <FileText size={20} color="#8A7A68" />
                <h4 style={{ fontSize: '1.2rem', margin: 0 }}>
                  {t('booking.intake_card_title')}
                </h4>
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-light)', marginBottom: '1.2rem', lineHeight: '1.6' }}>
                {t('booking.intake_card_desc')}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onNavigate(`/${currentLocale}/intake`)}
              >
                <span>{t('booking.intake_button')}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '2.5rem' }}>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--ink)' }}
                onClick={() => onNavigate(`/${currentLocale}/booking`)}
              >
                {t('booking.book_another')}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // CONFIRMING / UNCONFIRMED / MISSING VIEWS
  const isConfirming = pageState === 'confirming';
  const titleKey =
    pageState === 'confirming'
      ? 'booking.payment_confirming_title'
      : pageState === 'missing'
      ? 'booking.payment_missing_session'
      : 'booking.payment_pending_title';
  const textKey =
    pageState === 'confirming'
      ? 'booking.payment_confirming_text'
      : 'booking.payment_pending_text';

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
      <div className="container">
        <div className="confirmed-panel">
          {watermark}

          <Info size={54} color="#FFFFFF" style={{ margin: '0 auto' }} />
          <h2>{t(titleKey)}</h2>
          <p style={{ fontSize: '1.08rem', maxWidth: '520px', margin: '0 auto 2rem', opacity: 0.9 }}>
            {t(textKey)}
          </p>

          {!isConfirming && (
            <div className="calendar-actions-row">
              <button
                className="btn btn-primary"
                onClick={() => onNavigate(`/${currentLocale}/booking`)}
              >
                <span>{t('booking.back_to_booking')}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
