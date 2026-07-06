'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscriptionApi, billingApi } from '@/utils/api';
import { openCheckoutUrl } from '@/utils/checkoutPending';
import { isNativeApp } from '@/utils/platformDetect';
import { captureIntentFromQuery, returnToIntent } from '@/utils/upgradeIntent';
import {
  getNativeOfferings,
  purchaseNative,
  confirmEntitlementAfterPurchase,
  pollEntitlementUntilPremium,
  identifyNative,
} from '@/utils/nativePurchase';
import { getUser } from '@/utils/auth';
import { PARENTAL_GATE_ENABLED } from '@/utils/paywallConfig';
import { useParentalGate } from '@/components/ParentalGate';
import StarField from '@/components/StarField';
import UpgradeShowcase from '@/components/UpgradeShowcase';
import styles from './page.module.css';

const BENEFITS = [
  { icon: '✦', text: 'Full story library — every story, poem & lullaby' },
  { icon: '✦', text: 'Complete bedtime routine with playlists' },
  { icon: '✦', text: 'Save up to 30 days of bedtime favorites' },
  { icon: '✦', text: '7-day free trial — no charge until day 8' },
];

async function fetchIsPremium() {
  try {
    const d = await subscriptionApi.getCurrent();
    return d?.effective_premium === true || d?.current_tier?.id === 'premium';
  } catch {
    return false;
  }
}

function PlanOption({ pkg, label, selected, best, onSelect, disabled }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '12px 16px',
        borderRadius: 14,
        cursor: disabled ? 'default' : 'pointer',
        border: selected ? '2px solid #b9a3ff' : '1px solid rgba(248,246,255,0.18)',
        background: selected ? 'rgba(185,163,255,0.12)' : 'rgba(255,255,255,0.03)',
        color: '#f8f6ff',
        textAlign: 'left',
      }}
    >
      <span style={{ fontWeight: 600 }}>
        {label}
        {best && (
          <span style={{ marginLeft: 8, fontSize: '0.68rem', color: '#b9a3ff' }}>BEST VALUE</span>
        )}
      </span>
      <span style={{ fontWeight: 600 }}>{pkg.priceString}</span>
    </button>
  );
}

// Native paywall: renders the RevenueCat offering at native store prices and
// drives the on-device purchase. Degrades gracefully — until the RevenueCat
// SDK is provisioned (keys + ASC products), getNativeOfferings() returns null
// and we fall back to the text-only "subscribe on web, then restore" CTA, so
// the same build is safe before and after provisioning.
function NativePaywall({ router }) {
  const [offerings, setOfferings] = useState(undefined); // undefined=loading, null=none
  const [plan, setPlan] = useState('annual');
  const [phase, setPhase] = useState('idle'); // idle | purchasing | confirming
  const [err, setErr] = useState(null);
  const { runGate, gate } = useParentalGate();
  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getNativeOfferings().then((o) => {
      if (!cancelled) setOfferings(o);
    });
    return () => {
      cancelled = true;
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  async function attempt(pkgId, gateFn) {
    return purchaseNative(pkgId, gateFn ? { gate: gateFn } : {});
  }

  async function handleBuy() {
    if (!offerings) return;
    const pkg = plan === 'annual' ? offerings.annual : offerings.monthly;
    if (!pkg) return;
    setErr(null);
    setPhase('purchasing');

    const gateFn = PARENTAL_GATE_ENABLED ? runGate : undefined;
    let res = await attempt(pkg.id, gateFn);
    // Safety net: if identity wasn't linked yet, re-identify and retry once.
    if (!res.success && res.error === 'not_identified') {
      const u = getUser();
      if (u?.uid && (await identifyNative(u.uid))) {
        res = await attempt(pkg.id, gateFn);
      }
    }
    if (!res.success) {
      setPhase('idle');
      if (res.error === 'cancelled' || res.error === 'gate_failed') return; // user backed out
      if (res.error === 'not_identified') {
        setErr('Please sign in again, then retry.');
        return;
      }
      setErr('That purchase didn’t go through. Please try again.');
      return;
    }

    // Purchase succeeded on-device (bridge already truth-checked it attached to
    // this uid). The backend is authoritative for audio: content stays locked
    // (audio stripped) until the async RevenueCat webhook flips premium — so we
    // must NOT enter the player until the backend confirms, or it re-locks in
    // the user's face right after they paid. Poll the backend; if it's slow but
    // the SDK confirms the purchase is real, hold an 'activating' state and keep
    // polling — route to the player ONLY once premium (audio serveable).
    setPhase('confirming');
    const ac = new AbortController();
    abortRef.current = ac;
    let status = await confirmEntitlementAfterPurchase(fetchIsPremium, { signal: ac.signal });
    if (status === 'activating' && !ac.signal.aborted) {
      setPhase('activating');
      const ready = await pollEntitlementUntilPremium(fetchIsPremium, {
        attempts: 20,
        delayMs: 3000,
        signal: ac.signal,
      });
      status = ready ? 'premium' : 'stuck';
    }
    abortRef.current = null;
    if (ac.signal.aborted) return;
    setPhase('idle');
    if (status === 'premium') {
      // Resume the exact content the user tapped (intent = /player/<id>?autoplay=1
      // from the player's locked gate); '/' for a direct /upgrade visit.
      returnToIntent(router);
    } else if (status === 'failed') {
      setErr('That purchase didn’t go through. Please try again.');
    } else {
      // 'stuck' — payment is real but the webhook is unusually slow. Never route
      // into a still-locked player; reassure + self-heal (RevenueCat retries the
      // webhook; reopening re-reads entitlement on boot).
      setErr('Payment received — your subscription is activating and will unlock automatically in a moment.');
    }
  }

  if (offerings === undefined) {
    return <p className={styles.nativeText}>Loading plans…</p>;
  }

  if (!offerings || (!offerings.monthly && !offerings.annual)) {
    return (
      <div className={styles.nativeWrap}>
        <p className={styles.nativeText}>
          Subscribe at <strong>dreamvalley.app</strong>, then restore below.
        </p>
        <button className={styles.restoreBtn} onClick={() => router.push('/restore')}>
          Restore subscription
        </button>
      </div>
    );
  }

  const busy = phase !== 'idle';
  const selected = plan === 'annual' ? offerings.annual : offerings.monthly;

  return (
    <div className={styles.nativeWrap}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {offerings.annual && (
          <PlanOption
            pkg={offerings.annual}
            label="Annual"
            best
            selected={plan === 'annual'}
            onSelect={() => setPlan('annual')}
            disabled={busy}
          />
        )}
        {offerings.monthly && (
          <PlanOption
            pkg={offerings.monthly}
            label="Monthly"
            selected={plan === 'monthly'}
            onSelect={() => setPlan('monthly')}
            disabled={busy}
          />
        )}
      </div>

      <button className={styles.ctaBtn} onClick={handleBuy} disabled={busy || !selected}>
        {phase === 'purchasing'
          ? 'Opening secure checkout…'
          : phase === 'confirming'
            ? 'Confirming your subscription…'
            : phase === 'activating'
              ? 'Activating your subscription…'
              : 'Start my 7-day free trial'}
      </button>

      {selected && (
        <p className={styles.priceDisclosure}>
          Free for 7 days, then {selected.priceString}
          {plan === 'annual' ? '/year' : '/month'}. Cancel anytime.
        </p>
      )}

      {err && <p className={styles.errorMsg}>{err}</p>}

      <p className={styles.nativeText} style={{ marginTop: 18 }}>
        Already subscribed?
      </p>
      <button
        className={styles.restoreBtn}
        onClick={() => router.push('/restore')}
        disabled={busy}
      >
        Restore subscription
      </button>

      {gate}
    </div>
  );
}

function UpgradeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [priceInfo, setPriceInfo] = useState(null);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const native = isNativeApp();

  useEffect(() => {
    captureIntentFromQuery(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (native) return undefined; // native prices come from the store offering
    let cancelled = false;
    subscriptionApi
      .getTiers()
      .then((data) => {
        if (cancelled) return;
        const premium = data?.tiers?.find?.((t) => t.id === 'premium') ?? data?.premium ?? null;
        if (premium && premium.price != null) {
          setPriceInfo({ price: premium.price, trialDays: premium.trial_days_monthly ?? 7 });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPriceLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [native]);

  async function handleStartTrial() {
    setError(null);
    setSubmitting(true);
    try {
      const { checkout_url } = await billingApi.startCheckout('monthly');
      if (checkout_url) {
        openCheckoutUrl(checkout_url);
        return;
      }
      setError("Couldn't start checkout. Please try again in a moment.");
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`${styles.root} ${styles.page}`}>
      <div className={styles.card}>
        <div className={styles.eyebrow}>Dream Valley Premium</div>

        <h1 className={styles.headline}>
          Get the <span className={styles.headlineAccent}>sweetest sleep</span> every night
        </h1>

        <p className={styles.subheadline}>
          A warm, full bedtime routine for your little one — calming stories, poems, and lullabies,
          every single night.
        </p>

        <div className={styles.showcaseWrap}>
          <UpgradeShowcase />
        </div>

        <ul className={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <li key={i} className={styles.benefit}>
              <span className={styles.benefitIcon} aria-hidden="true">
                {b.icon}
              </span>
              {b.text}
            </li>
          ))}
        </ul>

        <div className={styles.divider} />

        <div className={styles.ctaGroup}>
          {native ? (
            <NativePaywall router={router} />
          ) : (
            <>
              <button className={styles.ctaBtn} onClick={handleStartTrial} disabled={submitting}>
                {submitting ? 'Taking you to checkout…' : 'Start my free trial'}
              </button>

              {priceLoaded && priceInfo && (
                <p className={styles.priceDisclosure}>
                  Free for {priceInfo.trialDays} days, then ${priceInfo.price}/month. Cancel anytime.
                </p>
              )}

              {error && <p className={styles.errorMsg}>{error}</p>}

              <p className={styles.nativeText} style={{ marginTop: 18 }}>
                Already subscribed?
              </p>
              <button className={styles.restoreBtn} onClick={() => router.push('/restore')}>
                Restore subscription
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpgradeClient() {
  return (
    <>
      <StarField />
      <Suspense
        fallback={
          <div
            className={styles.root}
            style={{
              minHeight: '100dvh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(248,246,255,0.5)',
              fontSize: '0.9rem',
            }}
          >
            Loading…
          </div>
        }
      >
        <UpgradeInner />
      </Suspense>
    </>
  );
}
