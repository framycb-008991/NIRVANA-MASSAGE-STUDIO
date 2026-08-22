import React, { useState, useEffect, useMemo } from 'react';
import { Locale, BookingType, Booking, BookingClient } from '../types';
import { getTranslation, formatLocaleDate, formatMonthYear, formatCurrency } from '../services/i18n';
import { TREATMENTS, saveBooking } from '../services/storage';
import { calculateAvailableSlots, generateICS, createGoogleCalendarUrl } from '../services/calendar';
import { sendBookingConfirmedNotification } from '../services/notifications';
import { trackAnalyticsEvent } from '../services/storage';
import { StepIndicator } from '../components/StepIndicator';
import { HalftoneCircle } from '../components/HalftoneCircle';
import {
  Clock,
  MapPin,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  CalendarPlus,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';

interface BookingPageProps {
  currentLocale: Locale;
  preselectedTreatmentId?: string;
  preselectedDurationMinutes?: number;
  onNavigate: (path: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  currentLocale,
  preselectedTreatmentId,
  preselectedDurationMinutes,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  // Flow State
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form selections (Step 1)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string>(
    preselectedTreatmentId || TREATMENTS[0].id
  );

  const selectedTreatment = useMemo(() => {
    return TREATMENTS.find(t => t.id === selectedTreatmentId) || TREATMENTS[0];
  }, [selectedTreatmentId]);

  const [selectedDuration, setSelectedDuration] = useState<number>(
    preselectedDurationMinutes || selectedTreatment.durations[0]?.minutes || 60
  );

  // If treatment changes and current duration is not supported, reset duration
  useEffect(() => {
    const valid = selectedTreatment.durations.some(d => d.minutes === selectedDuration);
    if (!valid && selectedTreatment.durations[0]) {
      setSelectedDuration(selectedTreatment.durations[0].minutes);
    }
  }, [selectedTreatment]);

  const [bookingType, setBookingType] = useState<BookingType>('in_studio');
  const [privateLocation, setPrivateLocation] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('Europe/Warsaw');

  // Calendar State (Defaults to tomorrow)
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Form Inputs (Step 2)
  const [clientInfo, setClientInfo] = useState<BookingClient>({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate live available slots
  const availableSlots = useMemo(() => {
    return calculateAvailableSlots(selectedDateStr, selectedDuration);
  }, [selectedDateStr, selectedDuration]);

  // Track Step 1 View
  useEffect(() => {
    trackAnalyticsEvent({
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      event: 'booking_funnel',
      step: 'step_1_view',
      treatmentId: selectedTreatmentId,
      bookingType,
      locale: currentLocale,
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    });
  }, []);

  // Price calculations
  const durationOption = selectedTreatment.durations.find(d => d.minutes === selectedDuration) || selectedTreatment.durations[0];
  const pricePLN = durationOption.pricePLN;
  const priceEUR = durationOption.priceEUR;
  const depositPLN = 50;

  // Calendar Grid builder
  const calendarDays = useMemo(() => {
    const year = viewDate.year;
    const month = viewDate.month;

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dayNumber: number; dateStr: string; isPast: boolean; isToday: boolean }[] = [];

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const monthPadded = String(month + 1).padStart(2, '0');
      const dayPadded = String(i).padStart(2, '0');
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;

      const dayEnd = new Date(year, month, i, 23, 59, 59);
      const isPast = dayEnd.getTime() < now.getTime() && dateStr !== todayStr;
      const isToday = dateStr === todayStr;

      days.push({ dayNumber: i, dateStr, isPast, isToday });
    }

    return { firstDayIndex, days };
  }, [viewDate]);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  const handleProceedToStep2 = () => {
    if (!selectedTimeSlot) return;

    if (bookingType === 'private' && !privateLocation.trim()) {
      alert('Please specify your city or address for the private travel session.');
      return;
    }

    trackAnalyticsEvent({
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      event: 'booking_funnel',
      step: 'step_2_view',
      treatmentId: selectedTreatmentId,
      bookingType,
      locale: currentLocale,
      timestamp: new Date().toISOString(),
      path: window.location.pathname
    });

    setStep(2);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!clientInfo.firstName.trim()) errs.firstName = 'First name is required';
    if (!clientInfo.surname.trim()) errs.surname = 'Surname is required';
    if (!clientInfo.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientInfo.email)) {
      errs.email = 'Please enter a valid email address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2() || !selectedTimeSlot) return;

    setIsSubmitting(true);

    const newBooking: Booking = {
      id: 'nirvana_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      treatmentId: selectedTreatmentId,
      durationMinutes: selectedDuration,
      pricePLN,
      priceEUR,
      depositPLN,
      bookingType,
      location: bookingType === 'private' ? privateLocation : 'Nirvana Massage Studio (ul. Przedmiejska 2/02, Wrocław)',
      timezone,
      date: selectedDateStr,
      timeSlot: selectedTimeSlot,
      client: clientInfo,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      locale: currentLocale
    };

    // Save and send notifications
    setTimeout(() => {
      saveBooking(newBooking);
      sendBookingConfirmedNotification(newBooking, t(selectedTreatment.nameKey));

      trackAnalyticsEvent({
        id: 'evt_' + Math.random().toString(36).substr(2, 9),
        event: 'booking_funnel',
        step: 'booking_completed',
        treatmentId: selectedTreatmentId,
        bookingType,
        locale: currentLocale,
        timestamp: new Date().toISOString(),
        path: window.location.pathname
      });

      setConfirmedBooking(newBooking);
      setIsSubmitting(false);
      window.scrollTo({ top: 80, behavior: 'smooth' });
    }, 600);
  };

  const handleDownloadICS = () => {
    if (!confirmedBooking) return;
    const icsContent = generateICS(confirmedBooking, t(selectedTreatment.nameKey));
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `nirvana-appointment-${confirmedBooking.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CONFIRMATION VIEW
  if (confirmedBooking) {
    const treatmentName = t(selectedTreatment.nameKey);
    const formattedDate = formatLocaleDate(confirmedBooking.date, currentLocale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

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

            <CheckCircle2 size={54} color="#FFFFFF" style={{ margin: '0 auto' }} />
            <h2>{t('booking.confirmed_title')}</h2>
            <p style={{ fontSize: '1.08rem', maxWidth: '520px', margin: '0 auto 2rem', opacity: 0.9 }}>
              {t('booking.confirmed_subtitle')}
            </p>

            <div className="confirmed-details-card">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '1.2rem' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Treatment
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 500, fontFamily: 'var(--font-serif)' }}>
                    {treatmentName} ({confirmedBooking.durationMinutes} min)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Date &amp; Time
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 500 }}>
                    {formattedDate} • {confirmedBooking.timeSlot}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Location
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    {confirmedBooking.bookingType === 'in_studio' ? 'Studio (ul. Przedmiejska 2/02, Wrocław)' : confirmedBooking.location}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                    Deposit Paid
                  </div>
                  <div style={{ fontSize: '0.95rem' }}>
                    {confirmedBooking.depositPLN} PLN (Remainder: {confirmedBooking.pricePLN - confirmedBooking.depositPLN} PLN at session)
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar Actions */}
            <div className="calendar-actions-row">
              <button className="btn btn-primary" onClick={handleDownloadICS}>
                <CalendarPlus size={16} />
                <span>{t('booking.add_calendar')}</span>
              </button>

              <a
                href={createGoogleCalendarUrl(confirmedBooking, treatmentName)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: 'none', color: 'var(--ink)' }}
              >
                <span>{t('booking.google_calendar')}</span>
              </a>
            </div>

            {/* Post-booking Health Intake Callout (HEALTH_INTAKE_SPEC Option B) */}
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
                onClick={() => onNavigate(`/${currentLocale}/intake?booking_id=${confirmedBooking.id}`)}
              >
                <span>{t('booking.intake_button')}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ marginTop: '2.5rem' }}>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--ink)' }}
                onClick={() => {
                  setConfirmedBooking(null);
                  setStep(1);
                }}
              >
                {t('booking.book_another')}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // MAIN TWO-STEP BOOKING FLOW
  return (
    <main id="main-content" className="booking-flow-container">
      {/* Title */}
      <div className="section-heading-center" style={{ marginBottom: '2rem' }}>
        <span className="label-caps">{t('nav.booking')}</span>
        <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', marginTop: '0.4rem' }}>
          {t('booking.title')}
        </h1>
        <p>{t('booking.subtitle')}</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator
        currentStep={step}
        currentLocale={currentLocale}
        onStepClick={(s) => setStep(s)}
      />

      {/* STEP 1: SELECT TIME */}
      {step === 1 && (
        <div className="booking-step1-grid" style={{ position: 'relative' }}>
          {/* Left Column (Sage Panel) */}
          <div className="booking-left-sage" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Watermark in Left Sage Panel */}
            <div
              style={{
                position: 'absolute',
                bottom: '-40px',
                right: '-40px',
                pointerEvents: 'none',
                opacity: 0.08
              }}
            >
              <HalftoneCircle size={280} color="#2E2C28" />
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Therapist Mini Profile */}
              <div className="practitioner-mini-badge">
                <img
                  src="/assets/therapist.jpg"
                  alt="Alina Heorhiieva"
                  className="practitioner-avatar"
                />
                <div>
                  <div className="practitioner-mini-name">Alina Heorhiieva</div>
                  <div className="practitioner-mini-role">{t('booking.solo_note')}</div>
                </div>
              </div>

              {/* Treatment Selected Header */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-light)', marginBottom: '2px' }}>
                  {t('booking.choose_treatment')}
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', lineHeight: '1.2' }}>
                  {t(selectedTreatment.nameKey)}
                </h3>
              </div>

              {/* Month Calendar Grid */}
              <div className="calendar-widget">
                <div className="calendar-header">
                  <button
                    className="cal-nav-btn"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="calendar-month-title">
                    {formatMonthYear(viewDate.year, viewDate.month, currentLocale)}
                  </div>

                  <button
                    className="cal-nav-btn"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="calendar-weekdays">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>

                <div className="calendar-days-grid">
                  {/* Empty cells for starting day offset */}
                  {Array.from({ length: calendarDays.firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {/* Day cells */}
                  {calendarDays.days.map((day) => {
                    const isSelected = selectedDateStr === day.dateStr;
                    return (
                      <button
                        key={day.dateStr}
                        className={`cal-day-cell ${isSelected ? 'selected' : ''} ${day.isToday ? 'today' : ''}`}
                        disabled={day.isPast}
                        onClick={() => {
                          setSelectedDateStr(day.dateStr);
                          setSelectedTimeSlot(null);
                        }}
                        aria-label={`Select ${day.dateStr}`}
                        aria-pressed={isSelected}
                      >
                        {day.dayNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Buffer note */}
            <div style={{ marginTop: '1.5rem', fontSize: '0.76rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={13} color="#6E6152" />
              <span>30-minute restorative buffer between all appointments</span>
            </div>
          </div>

          {/* Right Column (White Panel) */}
          <div className="booking-right-white">
            {/* Booking Type Segmented Toggle */}
            <div>
              <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                {t('booking.treatment_location')}
              </label>
              <div className="booking-type-segmented" role="radiogroup" aria-label="Session Format">
                <button
                  type="button"
                  className={`type-seg-btn ${bookingType === 'in_studio' ? 'active' : ''}`}
                  onClick={() => setBookingType('in_studio')}
                >
                  <MapPin size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  {t('booking.type_instudio')}
                </button>
                <button
                  type="button"
                  className={`type-seg-btn ${bookingType === 'private' ? 'active' : ''}`}
                  onClick={() => setBookingType('private')}
                >
                  <Globe size={14} style={{ display: 'inline', marginRight: '6px' }} />
                  {t('booking.type_private')}
                </button>
              </div>

              {/* Private Session Extra Fields */}
              {bookingType === 'private' && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(201,190,176,0.3)' }}>
                  <label className="form-label">
                    {t('booking.private_location_label')} *
                  </label>
                  <input
                    type="text"
                    className="custom-input"
                    placeholder={t('booking.private_location_placeholder')}
                    value={privateLocation}
                    onChange={(e) => setPrivateLocation(e.target.value)}
                    style={{ marginTop: '4px' }}
                  />
                  <div style={{ fontSize: '0.74rem', color: 'var(--ink-light)', marginTop: '4px', marginBottom: '0.8rem' }}>
                    {t('booking.private_location_help')}
                  </div>

                  <label className="form-label">
                    {t('booking.timezone_label')} *
                  </label>
                  <select
                    className="custom-input"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    style={{ marginTop: '4px' }}
                  >
                    <option value="Europe/Warsaw">Europe/Warsaw (CET / UTC+1)</option>
                    <option value="Europe/London">Europe/London (GMT / UTC+0)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET / UTC+1)</option>
                    <option value="Europe/Kyiv">Europe/Kyiv (EET / UTC+2)</option>
                    <option value="America/New_York">America/New York (EST / UTC-5)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Treatment Selector Dropdown */}
            <div>
              <label className="form-label">{t('booking.choose_treatment')}</label>
              <div className="treatment-select-wrap">
                <select
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                >
                  {TREATMENTS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {t(tr.nameKey)} ({tr.categoryKey})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration Segmented Pills */}
            <div>
              <label className="form-label">{t('booking.choose_length')}</label>
              <div className="duration-pills-row">
                {selectedTreatment.durations.map((d) => {
                  const isActive = selectedDuration === d.minutes;
                  return (
                    <button
                      key={d.minutes}
                      type="button"
                      className={`duration-pill-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedDuration(d.minutes);
                        setSelectedTimeSlot(null);
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>
                        {d.minutes === 30
                          ? (currentLocale === 'pl' ? '30 min' : currentLocale === 'uk' ? '30 хв' : '30 min')
                          : d.minutes === 60
                          ? (currentLocale === 'pl' ? '1 godz.' : currentLocale === 'uk' ? '1 год.' : '1 hour')
                          : (currentLocale === 'pl' ? '1 godz. 30 min' : currentLocale === 'uk' ? '1 год. 30 хв' : '1 hr 30 min')}
                      </span>
                      <span className="pill-price">{formatCurrency(d.pricePLN, 'PLN', currentLocale)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div className="slots-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label" style={{ margin: 0 }}>
                  {t('booking.showing_times_for')}: <strong style={{ color: 'var(--taupe)' }}>{formatLocaleDate(selectedDateStr, currentLocale, { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--ink-light)' }}>
                  ({timezone})
                </span>
              </div>

              {availableSlots.filter(s => s.available).length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-light)', fontSize: '0.9rem' }}>
                  <Info size={20} style={{ margin: '0 auto 0.5rem', color: 'var(--taupe)' }} />
                  {t('booking.no_slots')}
                </div>
              ) : (
                <div className="slots-grid">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        className={`slot-btn ${isSelected ? 'selected' : ''}`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTimeSlot(slot.time)}
                        aria-pressed={isSelected}
                      >
                        <Clock size={12} style={{ marginRight: '5px' }} />
                        <span>{slot.time}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action to Step 2 */}
            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(201,190,176,0.3)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!selectedTimeSlot}
                onClick={handleProceedToStep2}
              >
                <span>Continue to Information</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: YOUR INFORMATION */}
      {step === 2 && (
        <div className="step2-card">
          {/* Halftone watermark */}
          <div
            style={{
              position: 'absolute',
              bottom: '-40px',
              right: '-40px',
              pointerEvents: 'none',
              opacity: 0.08
            }}
          >
            <HalftoneCircle size={300} color="#8A7A68" />
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '1.2rem', textAlign: 'center' }}>
            {t('booking.step2_title')}
          </h2>

          {/* Selected Summary Banner with Edit Back Link */}
          <div className="summary-banner">
            <div className="summary-details">
              <h4>{t(selectedTreatment.nameKey)} ({selectedDuration} min)</h4>
              <div className="summary-meta">
                {formatLocaleDate(selectedDateStr, currentLocale, { weekday: 'long', day: 'numeric', month: 'long' })} at {selectedTimeSlot}
                &nbsp;•&nbsp;
                {bookingType === 'in_studio' ? 'Wrocław Studio (ul. Przedmiejska 2/02)' : `Private: ${privateLocation}`}
              </div>
            </div>
            <button
              type="button"
              className="edit-back-link"
              onClick={() => setStep(1)}
            >
              {t('booking.edit_link')}
            </button>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleConfirmBooking}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">{t('booking.first_name')} *</label>
                <input
                  type="text"
                  className="custom-input"
                  value={clientInfo.firstName}
                  onChange={(e) => setClientInfo({ ...clientInfo, firstName: e.target.value })}
                  placeholder="e.g. Maria"
                />
                {errors.firstName && <span className="inline-error">{errors.firstName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">{t('booking.surname')} *</label>
                <input
                  type="text"
                  className="custom-input"
                  value={clientInfo.surname}
                  onChange={(e) => setClientInfo({ ...clientInfo, surname: e.target.value })}
                  placeholder="e.g. Kowalska"
                />
                {errors.surname && <span className="inline-error">{errors.surname}</span>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">{t('booking.email')} *</label>
                <input
                  type="email"
                  className="custom-input"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                  placeholder="maria@example.com"
                />
                {errors.email && <span className="inline-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('booking.phone')} <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>{t('booking.phone_optional')}</span>
                </label>
                <input
                  type="tel"
                  className="custom-input"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                  placeholder="+48 600 000 000"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('booking.notes')}</label>
              <textarea
                className="custom-textarea"
                rows={3}
                value={clientInfo.notes}
                onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                placeholder={t('booking.notes_placeholder')}
              />
            </div>

            {/* Deposit & Cancellation Notice (PAYMENTS_SPEC Option B) */}
            <div className="deposit-notice-card">
              <div style={{ fontWeight: 500, marginBottom: '0.3rem' }}>
                {t('booking.deposit_title')}
              </div>
              <div style={{ marginBottom: '0.4rem' }}>{t('booking.deposit_text')}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', fontStyle: 'italic' }}>
                {t('booking.cancellation_policy')}
              </div>
            </div>

            {/* Actions */}
            <div className="step2-actions-row">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep(1)}
              >
                {t('booking.btn_back')}
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('booking.processing') : t('booking.btn_confirm')}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};
