import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Locale } from '../types';
import { getTranslation, formatLocaleDate, formatCurrency } from '../services/i18n';
import { getTierById } from '../services/tiers';
import {
  isMemberAuthEnabled,
  getMemberSession,
  getMemberAccessToken,
  onMemberAuthChange,
  signOutMember
} from '../services/memberAuth';
import { MemberAuthForm } from '../components/MemberAuthForm';
import { CheckCircle2, LogOut } from 'lucide-react';

interface AccountPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

interface AccountSubscription {
  tierId: string;
  status: 'active' | 'past_due' | 'canceled';
  monthlyPricePLN: number;
  creditsPerCycle: number;
  currentPeriodEnd: string;
}

interface AccountBooking {
  id: string;
  treatmentName: string;
  date: string;
  timeSlot: string;
  status: string;
  paymentStatus: string;
}

interface AccountData {
  member: { id: string; email: string; fullName: string | null };
  subscription: AccountSubscription | null;
  creditBalance: number;
  bookings: AccountBooking[];
}

export const AccountPage: React.FC<AccountPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  const memberAuthEnabled = isMemberAuthEnabled();
  const [memberSession, setMemberSession] = useState<Session | null>(null);
  const [authResolved, setAuthResolved] = useState(!memberAuthEnabled);

  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ?subscribed=1 welcome banner (query param removed once shown)
  const [showWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('subscribed') === '1';
  });

  useEffect(() => {
    if (showWelcome) {
      const url = new URL(window.location.href);
      url.searchParams.delete('subscribed');
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!memberAuthEnabled) return;
    void getMemberSession().then((s) => {
      setMemberSession(s);
      setAuthResolved(true);
    });
    return onMemberAuthChange(setMemberSession);
  }, [memberAuthEnabled]);

  const loadAccount = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const token = await getMemberAccessToken();
      if (!token) throw new Error('no token');
      const res = await fetch('/api/account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`account failed (${res.status})`);
      setAccount((await res.json()) as AccountData);
    } catch {
      setLoadError(true);
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (memberSession) void loadAccount();
    else setAccount(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberSession]);

  // Cancel flow
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState(false);

  const handleCancelSubscription = async () => {
    setCancelBusy(true);
    setCancelError(false);
    try {
      const token = await getMemberAccessToken();
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error(`cancel failed (${res.status})`);
      setCancelConfirmOpen(false);
      await loadAccount();
    } catch {
      setCancelError(true);
    } finally {
      setCancelBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutMember();
  };

  const statusBadge = (status: AccountSubscription['status']) => {
    const label =
      status === 'active'
        ? t('account.status_active')
        : status === 'past_due'
        ? t('account.status_past_due')
        : t('account.status_canceled');
    return (
      <span className={`badge ${status === 'active' ? 'badge-sage' : 'badge-taupe'}`}>
        {label}
      </span>
    );
  };

  // Member auth not configured — the page has nothing to show
  if (!memberAuthEnabled) {
    return (
      <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>{t('account.title')}</h1>
          <p style={{ color: 'var(--ink-light)' }}>{t('member.unavailable')}</p>
        </div>
      </main>
    );
  }

  // Signed out — magic-link gate
  if (authResolved && !memberSession) {
    return (
      <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
        <div className="container">
          <div className="step2-card" style={{ maxWidth: '520px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem', textAlign: 'center' }}>
              {t('account.title')}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', textAlign: 'center', lineHeight: 1.6 }}>
              {t('member.signin_desc')}
            </p>
            <MemberAuthForm currentLocale={currentLocale} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        <div className="section-heading-center" style={{ marginBottom: '2rem' }}>
          <span className="label-caps">{t('member.my_account')}</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginTop: '0.4rem' }}>
            {t('account.title')}
          </h1>
          {memberSession?.user?.email && (
            <p>
              {t('account.signed_in_as')} <strong>{memberSession.user.email}</strong>
            </p>
          )}
        </div>

        {/* Welcome banner after a successful subscription checkout */}
        {showWelcome && (
          <div className="deposit-notice-card" style={{ margin: '0 0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, marginBottom: '0.3rem' }}>
              <CheckCircle2 size={16} color="#557A55" />
              {t('account.welcome_title')}
            </div>
            <div>{t('account.welcome_text')}</div>
          </div>
        )}

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--ink-light)' }}>{t('account.loading')}</p>
        )}

        {loadError && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#B25E5E', fontSize: '0.9rem' }}>{t('account.load_error')}</p>
            <button className="btn btn-outline" onClick={() => void loadAccount()}>
              {t('account.retry')}
            </button>
          </div>
        )}

        {account && (
          <>
            {/* Membership card */}
            <div className="step2-card" style={{ maxWidth: 'none', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t('account.membership_title')}</h2>

              {account.subscription ? (
                <>
                  <div className="summary-banner" style={{ marginBottom: '1.2rem' }}>
                    <div className="summary-details">
                      <h4>
                        {getTierById(account.subscription.tierId)?.name || account.subscription.tierId}
                        &nbsp;{statusBadge(account.subscription.status)}
                      </h4>
                      <div className="summary-meta">
                        {formatCurrency(account.subscription.monthlyPricePLN, 'PLN', currentLocale)}{t('membership.per_month')}
                        &nbsp;•&nbsp;
                        {account.subscription.status === 'canceled'
                          ? `${t('account.ends_on')} ${formatLocaleDate(account.subscription.currentPeriodEnd.slice(0, 10), currentLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`
                          : `${t('account.renews_on')} ${formatLocaleDate(account.subscription.currentPeriodEnd.slice(0, 10), currentLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.95rem', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--taupe)', display: 'block', marginBottom: '2px' }}>
                      {t('account.credits_label')}
                    </span>
                    <strong>{account.creditBalance}</strong> {t('account.credits_of')}{' '}
                    {account.subscription.creditsPerCycle} {t('account.credits_remaining')}
                  </div>

                  {account.subscription.status !== 'canceled' && (
                    <>
                      {!cancelConfirmOpen ? (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ color: '#B25E5E', fontSize: '0.82rem' }}
                          onClick={() => {
                            setCancelConfirmOpen(true);
                            setCancelError(false);
                          }}
                        >
                          {t('account.cancel_button')}
                        </button>
                      ) : (
                        <div className="deposit-notice-card" style={{ margin: '0.5rem 0 0' }}>
                          <div style={{ fontWeight: 500, marginBottom: '0.3rem' }}>
                            {t('account.cancel_confirm_title')}
                          </div>
                          <div style={{ marginBottom: '0.8rem' }}>
                            {t('account.cancel_confirm_text')}
                          </div>
                          {cancelError && (
                            <div className="inline-error" style={{ marginBottom: '0.6rem' }}>
                              {t('account.cancel_error')}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', color: '#B25E5E' }}
                              disabled={cancelBusy}
                              onClick={() => void handleCancelSubscription()}
                            >
                              {cancelBusy ? t('booking.processing') : t('account.cancel_confirm_yes')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                              disabled={cancelBusy}
                              onClick={() => setCancelConfirmOpen(false)}
                            >
                              {t('account.cancel_confirm_no')}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--ink-light)', marginBottom: '1.2rem' }}>
                    {t('account.membership_none')}
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => onNavigate(`/${currentLocale}/membership`)}
                  >
                    <span>{t('account.browse_memberships')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Booking history */}
            <div className="step2-card" style={{ maxWidth: 'none' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{t('account.bookings_title')}</h2>

              {account.bookings.length === 0 ? (
                <p style={{ color: 'var(--ink-light)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  {t('account.bookings_empty')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {account.bookings.map((bk) => (
                    <div
                      key={bk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        padding: '0.7rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(201,190,176,0.4)',
                        backgroundColor: 'var(--mist)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.92rem', color: 'var(--ink)' }}>
                          {bk.treatmentName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--ink-light)' }}>
                          {formatLocaleDate(bk.date, currentLocale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} · {bk.timeSlot}
                        </div>
                      </div>
                      <span className={`badge ${bk.status === 'confirmed' ? 'badge-sage' : 'badge-taupe'}`}>
                        {bk.status === 'confirmed' ? t('account.booking_confirmed') : bk.status === 'cancelled' ? t('account.booking_cancelled') : bk.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                className="btn btn-ghost"
                style={{ color: 'var(--ink)' }}
                onClick={() => void handleSignOut()}
              >
                <LogOut size={14} />
                <span>{t('member.sign_out')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};
