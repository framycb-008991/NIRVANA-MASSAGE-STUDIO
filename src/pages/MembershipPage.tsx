import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Locale } from '../types';
import { getTranslation, formatCurrency } from '../services/i18n';
import { getSubscriptionTiers, SubscriptionTier } from '../services/tiers';
import { useContent } from '../hooks/useContent';
import {
  isMemberAuthEnabled,
  getMemberSession,
  getMemberAccessToken,
  onMemberAuthChange
} from '../services/memberAuth';
import { MemberAuthForm } from '../components/MemberAuthForm';
import { HalftoneCircle } from '../components/HalftoneCircle';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface MembershipPageProps {
  currentLocale: Locale;
  onNavigate: (path: string) => void;
}

const INTENDED_TIER_KEY = 'nirvana_intended_tier';

export const MembershipPage: React.FC<MembershipPageProps> = ({
  currentLocale,
  onNavigate
}) => {
  const t = (key: string) => getTranslation(key, currentLocale);

  // Tiers refresh from the public content cache once /api/content lands
  const { version: contentVersion } = useContent();
  const tiers = useMemo(() => getSubscriptionTiers(), [contentVersion]);

  // Optional member auth
  const memberAuthEnabled = isMemberAuthEnabled();
  const [memberSession, setMemberSession] = useState<Session | null>(null);
  const [authResolved, setAuthResolved] = useState(!memberAuthEnabled);

  useEffect(() => {
    if (!memberAuthEnabled) return;
    void getMemberSession().then((s) => {
      setMemberSession(s);
      setAuthResolved(true);
    });
    return onMemberAuthChange(setMemberSession);
  }, [memberAuthEnabled]);

  const [busyTierId, setBusyTierId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'already' | 'error'; tierId: string } | null>(null);

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (busyTierId) return;
    setNotice(null);

    if (!memberAuthEnabled) {
      // Member accounts are not configured — subscriptions can't be started
      // online; the disabled buttons + note below guide to direct contact.
      return;
    }

    if (!memberSession) {
      // Not signed in — remember the pick and guide the member to the
      // magic-link form below the tier grid.
      try {
        sessionStorage.setItem(INTENDED_TIER_KEY, tier.id);
      } catch {
        // storage unavailable — the member simply clicks again after sign-in
      }
      document.getElementById('membership-signin')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setBusyTierId(tier.id);
    try {
      const token = await getMemberAccessToken();
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ tierId: tier.id, locale: currentLocale })
      });

      if (res.status === 409) {
        setNotice({ kind: 'already', tierId: tier.id });
        setBusyTierId(null);
        return;
      }

      const data = (await res.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;

      if (!res.ok || !data?.checkoutUrl) {
        setNotice({ kind: 'error', tierId: tier.id });
        setBusyTierId(null);
        return;
      }

      try {
        sessionStorage.removeItem(INTENDED_TIER_KEY);
      } catch {
        // ignore
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setNotice({ kind: 'error', tierId: tier.id });
      setBusyTierId(null);
    }
  };

  // Tier the member picked before signing in — highlight it so they can
  // simply click Subscribe again now that they're authenticated.
  const intendedTierId = useMemo(() => {
    if (!memberSession) return null;
    try {
      return sessionStorage.getItem(INTENDED_TIER_KEY);
    } catch {
      return null;
    }
  }, [memberSession]);

  return (
    <main id="main-content" className="section-spacing" style={{ paddingTop: '3rem', position: 'relative', overflow: 'hidden' }}>
      {/* Halftone watermark */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-120px',
          pointerEvents: 'none',
          opacity: 0.06
        }}
      >
        <HalftoneCircle size={420} color="#8A7A68" withAmbientGrid={true} />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div className="section-heading-center" style={{ marginBottom: '2rem' }}>
          <span className="label-caps">{t('nav.membership')}</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', marginTop: '0.4rem' }}>
            {t('membership.title')}
          </h1>
          <p>{t('membership.subtitle')}</p>
        </div>

        {/* Benefits */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.4rem', marginBottom: '3rem', fontSize: '0.86rem', color: 'var(--ink-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={15} color="#8A7A68" />
            <span>{t('membership.benefit_carryover')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={15} color="#8A7A68" />
            <span>{t('membership.benefit_cancel')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircle2 size={15} color="#8A7A68" />
            <span>{t('membership.benefit_priority')}</span>
          </div>
        </div>

        {/* Tier cards */}
        <div className="tier-grid">
          {tiers.map((tier) => (
            <article key={tier.id} className="tier-card">
              <div className="tier-card-focus">{tier.focus}</div>
              <h3 className="tier-card-name">{tier.name}</h3>
              <div className="tier-card-sessions">
                {tier.sessionsPerCycle}× {tier.sessionMinutes} min · {t('membership.per_cycle')}
              </div>
              <div className="tier-card-price">
                {formatCurrency(tier.monthlyPricePLN, 'PLN', currentLocale)}
                <span className="tier-card-price-suffix">{t('membership.per_month')}</span>
              </div>
              <p className="tier-card-persona">{tier.persona}</p>

              {notice && notice.tierId === tier.id && (
                <div className="inline-error" style={{ fontSize: '0.82rem', marginBottom: '0.6rem' }} role="alert">
                  {notice.kind === 'already' ? (
                    <>
                      {t('membership.already_subscribed')}{' '}
                      <button
                        type="button"
                        className="edit-back-link"
                        onClick={() => onNavigate(`/${currentLocale}/account`)}
                      >
                        {t('membership.view_account')}
                      </button>
                    </>
                  ) : (
                    t('membership.subscribe_error')
                  )}
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 'auto', justifyContent: 'center' }}
                disabled={busyTierId !== null || !memberAuthEnabled}
                onClick={() => void handleSubscribe(tier)}
              >
                <span>
                  {busyTierId === tier.id
                    ? t('booking.processing')
                    : intendedTierId === tier.id
                    ? t('membership.subscribe_resume')
                    : t('membership.subscribe')}
                </span>
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
        </div>

        {/* When member auth isn't configured, subscribing online isn't possible */}
        {!memberAuthEnabled && (
          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', marginBottom: '0.9rem' }}>
              {t('membership.unavailable_note')}
            </p>
            <button
              className="btn btn-outline"
              onClick={() => onNavigate(`/${currentLocale}/contact`)}
            >
              <span>{t('nav.contact')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Sign-in gate (only relevant when auth is configured and signed out) */}
        {memberAuthEnabled && authResolved && !memberSession && (
          <div id="membership-signin" className="step2-card" style={{ maxWidth: '520px', marginTop: '3rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.4rem', textAlign: 'center' }}>
              {t('membership.signin_title')}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-light)', textAlign: 'center', lineHeight: 1.6 }}>
              {t('membership.signin_desc')}
            </p>
            <MemberAuthForm currentLocale={currentLocale} />
          </div>
        )}
      </div>
    </main>
  );
};
