import React, { useState, useMemo, useEffect } from 'react';
import { Locale, Booking, BlockedPeriod, HealthIntake, NotificationRecord } from '../types';
import { getTranslation, formatLocaleDate } from '../services/i18n';
import {
  getBookings,
  getBlockedPeriods,
  addBlockedPeriod,
  removeBlockedPeriod,
  updateBookingStatus,
  getHealthIntakes,
  getNotifications,
  getAnalyticsEvents,
  TREATMENTS
} from '../services/storage';
import { sendCancellationNotification } from '../services/notifications';
import { getPractitionerEmail, setPractitionerEmail } from '../services/settings';
import { useAdminSchedule } from '../hooks/useAdminSchedule';
import { NotificationDrawer } from '../components/NotificationDrawer';
import {
  Calendar as CalendarIcon,
  List,
  HeartPulse,
  Mail,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  Search,
  MapPin,
  Clock,
  ShieldCheck
} from 'lucide-react';

interface AdminPageProps {
  currentLocale: Locale;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  currentLocale
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const [activeTab, setActiveTab] = useState<'calendar' | 'bookings' | 'intake' | 'notifications' | 'analytics' | 'settings'>('calendar');

  // Data state
  const [bookings, setBookings] = useState<Booking[]>(getBookings());
  const [blocked, setBlocked] = useState<BlockedPeriod[]>(getBlockedPeriods());
  const [intakes, setIntakes] = useState<HealthIntake[]>(getHealthIntakes());
  const [notifications, setNotifications] = useState<NotificationRecord[]>(getNotifications());
  const [analyticsEvents] = useState(getAnalyticsEvents());

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Block Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [blockStart, setBlockStart] = useState('12:00');
  const [blockEnd, setBlockEnd] = useState('14:00');

  // Notification Drawer
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Studio Settings (practitioner notification email)
  const adminSchedule = useAdminSchedule();
  const [practitionerEmail, setPractitionerEmailState] = useState(getPractitionerEmail());
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load the email persisted in the backend (falls back to local mirror)
  useEffect(() => {
    adminSchedule.getSettings()
      .then((s) => {
        if (s?.practitionerEmail) {
          setPractitionerEmailState(s.practitionerEmail);
          setPractitionerEmail(s.practitionerEmail);
        }
      })
      .catch(() => {
        // Backend not reachable (local dev) — local mirror already loaded
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMsg('idle');
    try {
      // Persist to Supabase via the serverless API when available
      await adminSchedule.updatePractitionerEmail(practitionerEmail);
    } catch {
      // Backend not deployed/reachable yet — local mirror still applies
    }
    // Always keep the local mirror in sync so dev-mode notifications use it
    setPractitionerEmail(practitionerEmail);
    setSettingsSaving(false);
    setSettingsMsg('saved');
  };

  const refreshData = () => {
    setBookings(getBookings());
    setBlocked(getBlockedPeriods());
    setIntakes(getHealthIntakes());
    setNotifications(getNotifications());
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;

    const newBlock: BlockedPeriod = {
      id: 'blk_' + Date.now().toString(36),
      date: blockDate,
      allDay: blockAllDay,
      startTime: blockAllDay ? undefined : blockStart,
      endTime: blockAllDay ? undefined : blockEnd,
      reason: blockReason || 'Practitioner Personal Block'
    };

    addBlockedPeriod(newBlock);
    setShowBlockModal(false);
    setBlockDate('');
    setBlockReason('');
    refreshData();
  };

  const handleRemoveBlock = (id: string) => {
    removeBlockedPeriod(id);
    refreshData();
  };

  const handleCancelBooking = (booking: Booking) => {
    if (confirm(`Are you sure you want to cancel the booking for ${booking.client.firstName} ${booking.client.surname}?`)) {
      updateBookingStatus(booking.id, 'cancelled');
      const treatment = TREATMENTS.find(t => t.id === booking.treatmentId);
      const treatmentName = treatment ? t(treatment.nameKey) : 'Massage Treatment';
      sendCancellationNotification(booking, treatmentName);
      refreshData();
      setShowNotifDrawer(true);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch =
        b.client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.client.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // Analytics Metrics
  const analyticsSummary = useMemo(() => {
    const totalStep1 = analyticsEvents.filter(e => e.step === 'step_1_view').length;
    const totalStep2 = analyticsEvents.filter(e => e.step === 'step_2_view').length;
    const totalCompleted = analyticsEvents.filter(e => e.step === 'booking_completed').length;

    const langCounts = analyticsEvents.reduce((acc: Record<string, number>, e) => {
      acc[e.locale] = (acc[e.locale] || 0) + 1;
      return acc;
    }, {});

    return { totalStep1, totalStep2, totalCompleted, langCounts };
  }, [analyticsEvents]);

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-sage">{t('admin.title')}</span>
            <h1 style={{ fontSize: '2.4rem', margin: '0.4rem 0 0' }}>
              Practitioner Schedule &amp; Client Records
            </h1>
            <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--ink-light)' }}>
              Solo Practitioner: Alina Heorhiieva • Physiotherapy &amp; Massage (Wrocław &amp; Private Travel)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowNotifDrawer(true)}
            >
              <Mail size={16} />
              <span>{t('admin.send_test_email')} ({notifications.length})</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={() => setShowBlockModal(true)}
            >
              <Plus size={16} />
              <span>{t('admin.block_time_btn')}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid rgba(201, 190, 176, 0.4)',
            marginBottom: '2rem',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
          {[
            { id: 'calendar', label: t('admin.tab_calendar'), icon: <CalendarIcon size={16} /> },
            { id: 'bookings', label: `${t('admin.tab_bookings')} (${bookings.length})`, icon: <List size={16} /> },
            { id: 'intake', label: `${t('admin.tab_intake')} (${intakes.length})`, icon: <HeartPulse size={16} /> },
            { id: 'notifications', label: `${t('admin.tab_notifications')} (${notifications.length})`, icon: <Mail size={16} /> },
            { id: 'analytics', label: t('admin.tab_analytics'), icon: <BarChart3 size={16} /> },
            { id: 'settings', label: t('admin.tab_settings'), icon: <SettingsIcon size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.8rem 1.4rem',
                fontSize: '0.88rem',
                fontWeight: 500,
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--ink-light)',
                borderBottom: activeTab === tab.id ? '2px solid var(--taupe)' : '2px solid transparent',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                background: activeTab === tab.id ? 'var(--white)' : 'transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: CALENDAR & BLOCKS */}
        {activeTab === 'calendar' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '2rem' }}>
            {/* Upcoming Sessions */}
            <div style={{ backgroundColor: 'var(--white)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '1.2rem' }}>Upcoming Client Appointments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bookings.filter(b => b.status === 'confirmed').length === 0 ? (
                  <p style={{ color: 'var(--ink-light)', fontSize: '0.9rem' }}>No confirmed upcoming bookings.</p>
                ) : (
                  bookings.filter(b => b.status === 'confirmed').map((bk) => {
                    const treatment = TREATMENTS.find(t => t.id === bk.treatmentId);
                    return (
                      <div
                        key={bk.id}
                        style={{
                          padding: '1.2rem',
                          backgroundColor: 'var(--mist)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(201,190,176,0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--ink)' }}>
                            {bk.client.firstName} {bk.client.surname}
                          </div>
                          <span className="badge badge-sage">Confirmed</span>
                        </div>

                        <div style={{ fontSize: '0.86rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock size={14} color="#8A7A68" />
                          <span>{formatLocaleDate(bk.date, currentLocale, { weekday: 'short', month: 'short', day: 'numeric' })} at <strong>{bk.timeSlot}</strong> ({bk.durationMinutes} min)</span>
                        </div>

                        <div style={{ fontSize: '0.86rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={14} color="#8A7A68" />
                          <span>{bk.bookingType === 'in_studio' ? 'Wrocław Studio' : `Private: ${bk.location}`}</span>
                        </div>

                        {bk.client.notes && (
                          <div style={{ fontSize: '0.8rem', backgroundColor: 'var(--white)', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-sm)', fontStyle: 'italic' }}>
                            "{bk.client.notes}"
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(201,190,176,0.2)' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--taupe)' }}>
                            {treatment ? t(treatment.nameKey) : 'Custom Treatment'} • Deposit: {bk.depositPLN} PLN
                          </span>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#B25E5E' }}
                            onClick={() => handleCancelBooking(bk)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Blocked Dates & Time Off */}
            <div style={{ backgroundColor: 'var(--white)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Blocked Dates &amp; Time Off</h3>
                <button
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem' }}
                  onClick={() => setShowBlockModal(true)}
                >
                  <Plus size={14} />
                  <span>Block Time</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {blocked.length === 0 ? (
                  <p style={{ color: 'var(--ink-light)', fontSize: '0.9rem' }}>No blocked dates configured.</p>
                ) : (
                  blocked.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.2rem',
                        backgroundColor: 'var(--sage-wash)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(166,169,156,0.4)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: '0.95rem' }}>
                          {b.reason}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--ink-light)' }}>
                          {formatLocaleDate(b.date, currentLocale, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                          &nbsp;•&nbsp;
                          {b.allDay ? 'All Day Block' : `${b.startTime} - ${b.endTime}`}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveBlock(b.id)}
                        style={{ color: '#B25E5E', padding: '0.4rem' }}
                        title="Remove Block"
                        aria-label="Remove Block"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div style={{ backgroundColor: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, maxWidth: '400px' }}>
                <Search size={18} color="#8A7A68" />
                <input
                  type="text"
                  className="custom-input"
                  placeholder={t('admin.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['all', 'confirmed', 'cancelled'] as const).map((s) => (
                  <button
                    key={s}
                    className={`btn ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                    onClick={() => setStatusFilter(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(201,190,176,0.4)', color: 'var(--taupe)' }}>
                    <th style={{ padding: '0.8rem 1rem' }}>Client</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Treatment &amp; Time</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Type &amp; Location</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.8rem 1rem' }}>Health Intake</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-light)' }}>
                        No bookings matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((bk) => {
                      const treatment = TREATMENTS.find(t => t.id === bk.treatmentId);
                      return (
                        <tr key={bk.id} style={{ borderBottom: '1px solid rgba(201,190,176,0.2)' }}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                              {bk.client.firstName} {bk.client.surname}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--ink-light)' }}>
                              {bk.client.email} {bk.client.phone && `• ${bk.client.phone}`}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 500 }}>{treatment ? t(treatment.nameKey) : 'Massage'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>
                              {bk.date} at {bk.timeSlot} ({bk.durationMinutes}m)
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className="badge badge-taupe" style={{ fontSize: '0.68rem' }}>
                              {bk.bookingType === 'in_studio' ? 'Wrocław Studio' : 'Private Travel'}
                            </span>
                            {bk.location && bk.bookingType === 'private' && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: '2px' }}>
                                {bk.location}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span className={`badge ${bk.status === 'confirmed' ? 'badge-sage' : 'badge-taupe'}`}>
                              {bk.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {bk.intakeCompleted ? (
                              <span style={{ color: '#557A55', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 500 }}>
                                <CheckCircle2 size={14} /> Completed
                              </span>
                            ) : (
                              <span style={{ color: 'var(--ink-muted)', fontSize: '0.8rem' }}>Pending</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {bk.status === 'confirmed' && (
                              <button
                                className="btn btn-ghost"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#B25E5E' }}
                                onClick={() => handleCancelBooking(bk)}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: HEALTH INTAKE RECORDS */}
        {activeTab === 'intake' && (
          <div style={{ backgroundColor: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <ShieldCheck size={20} color="#8A7A68" />
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>Special-Category Health Data Records (GDPR Art. 9)</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '2rem' }}>
              Sensitive health data collected solely upon explicit separate client consent for treatment safety and personalized care.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1.5rem' }}>
              {intakes.length === 0 ? (
                <p style={{ color: 'var(--ink-light)', padding: '2rem' }}>No health intake submissions yet.</p>
              ) : (
                intakes.map((intake) => (
                  <div
                    key={intake.id}
                    style={{
                      padding: '1.5rem',
                      backgroundColor: 'var(--mist)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(201,190,176,0.4)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--ink)' }}>
                          {intake.clientName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>
                          {intake.clientEmail}
                        </div>
                      </div>
                      <span className="badge badge-sage">Consent Verified</span>
                    </div>

                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      <div>
                        <strong>Pressure:</strong> {intake.pressurePreference.replace('_', ' ').toUpperCase()}
                      </div>
                      {intake.injuriesOrPain && (
                        <div>
                          <strong>Injuries/Pain:</strong> {intake.injuriesOrPain}
                        </div>
                      )}
                      {intake.medicalConditions && (
                        <div>
                          <strong>Medical / Allergies:</strong> {intake.medicalConditions}
                        </div>
                      )}
                      {intake.pregnancyStatus && (
                        <div>
                          <strong>Pregnancy:</strong> {intake.pregnancyStatus}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '1.2rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(201,190,176,0.3)', fontSize: '0.74rem', color: 'var(--ink-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Submitted: {new Date(intake.dateSubmitted).toLocaleDateString()}</span>
                      <span>Ref: {intake.bookingId || 'Direct'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS DISPATCHED */}
        {activeTab === 'notifications' && (
          <div style={{ backgroundColor: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.6rem', margin: 0 }}>Automated Notification Dispatch Records</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', margin: '4px 0 0' }}>
                  Multi-lingual notifications sent to client in their selected booking language and practitioner in Polish.
                </p>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => setShowNotifDrawer(true)}
              >
                <Eye size={16} />
                <span>Open Full Email Previewer</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '1.2rem',
                    backgroundColor: 'var(--mist)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(201,190,176,0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
                      <span className="badge badge-taupe" style={{ fontSize: '0.65rem' }}>{n.recipient.toUpperCase()}</span>
                      <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem' }}>{n.subject}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>
                      To: {n.recipientEmail} • Language: {n.locale.toUpperCase()} • {new Date(n.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
                    onClick={() => setShowNotifDrawer(true)}
                  >
                    View Email
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FUNNEL ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ backgroundColor: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
            <h3 style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>Booking Funnel &amp; Language Metrics</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '2.5rem' }}>
              Privacy-first funnel tracking without personal identifiers, strictly respecting cookie consent.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <div style={{ padding: '1.5rem', backgroundColor: 'var(--sage-wash)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(166,169,156,0.4)' }}>
                <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                  Step 1 (Select Time) Views
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-serif)', color: 'var(--ink)', marginTop: '4px' }}>
                  {analyticsSummary.totalStep1}
                </div>
              </div>

              <div style={{ padding: '1.5rem', backgroundColor: 'var(--sage-wash)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(166,169,156,0.4)' }}>
                <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                  Step 2 (Information) Views
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-serif)', color: 'var(--ink)', marginTop: '4px' }}>
                  {analyticsSummary.totalStep2}
                </div>
              </div>

              <div style={{ padding: '1.5rem', backgroundColor: 'var(--taupe-wash)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(138,122,104,0.4)' }}>
                <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)' }}>
                  Bookings Completed
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 300, fontFamily: 'var(--font-serif)', color: 'var(--ink)', marginTop: '4px' }}>
                  {analyticsSummary.totalCompleted}
                </div>
              </div>
            </div>

            {/* Language Usage Breakdown */}
            <div style={{ borderTop: '1px solid rgba(201,190,176,0.3)', paddingTop: '2rem' }}>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Language Usage Distribution</h4>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {Object.entries(analyticsSummary.langCounts).map(([lang, count]) => (
                  <div key={lang} style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--mist)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)', textTransform: 'uppercase' }}>Locale: {lang}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--ink)' }}>{count} events</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STUDIO SETTINGS */}
        {activeTab === 'settings' && (
          <div style={{ backgroundColor: 'var(--white)', padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(201,190,176,0.4)', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <SettingsIcon size={20} color="#8A7A68" />
              <h3 style={{ fontSize: '1.6rem', margin: 0 }}>{t('admin.settings_title')}</h3>
            </div>

            <form onSubmit={handleSaveSettings} style={{ maxWidth: '480px', marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="practitioner-email">
                  {t('admin.settings_email_label')}
                </label>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-light)', margin: '0 0 0.6rem' }}>
                  {t('admin.settings_email_desc')}
                </p>
                <input
                  id="practitioner-email"
                  type="email"
                  className="custom-input"
                  required
                  value={practitionerEmail}
                  onChange={(e) => {
                    setPractitionerEmailState(e.target.value);
                    setSettingsMsg('idle');
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.2rem' }}>
                <button type="submit" className="btn btn-primary" disabled={settingsSaving}>
                  {t('admin.settings_save')}
                </button>
                {settingsMsg === 'saved' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#557A55', fontSize: '0.88rem', fontWeight: 500 }}>
                    <CheckCircle2 size={16} />
                    {t('admin.settings_saved')}
                  </span>
                )}
                {settingsMsg === 'error' && (
                  <span style={{ color: '#B25E5E', fontSize: '0.88rem' }}>
                    {t('admin.settings_error')}
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Block Off Time Modal */}
      {showBlockModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>{t('admin.block_modal_title')}</h3>
            <form onSubmit={handleAddBlock}>
              <div className="form-group">
                <label className="form-label">{t('admin.date_label')} *</label>
                <input
                  type="date"
                  className="custom-input"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('admin.reason_label')}</label>
                <input
                  type="text"
                  className="custom-input"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Travel to Kraków, Vacation, Personal"
                />
              </div>

              <div style={{ margin: '1.2rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="block-all-day"
                  checked={blockAllDay}
                  onChange={(e) => setBlockAllDay(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--taupe)' }}
                />
                <label htmlFor="block-all-day" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  {t('admin.all_day')}
                </label>
              </div>

              {!blockAllDay && (
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="time"
                      className="custom-input"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="time"
                      className="custom-input"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowBlockModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Blocked Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Drawer Modal */}
      <NotificationDrawer
        notifications={notifications}
        isOpen={showNotifDrawer}
        onClose={() => setShowNotifDrawer(false)}
      />
    </main>
  );
};
