'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscriptionApi, billingApi } from '@/utils/api';
import { openCheckoutUrl } from '@/utils/checkoutPending';
import { isNativeApp } from '@/utils/platformDetect';
import { captureIntentFromQuery, returnToIntent } from '@/utils/upgradeIntent';
import {
  confirmEntitlementAfterPurchase,
  getNativeOfferings,
  identifyNative,
  isAmbiguousPurchaseResult,
  pollEntitlementUntilPremium,
  purchaseNative,
  recoverActivePurchase,
  restoreNativeForUser,
} from '@/utils/nativePurchase';
import { getUser } from '@/utils/auth';
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
    const subscription = await subscriptionApi.getCurrent({ fresh: true });
    return subscription?.effective_premium === true
      || subscription?.current_tier?.id === 'premium';
  } catch {
    return false;
  }
}

function PlanOption({ pkg, label, selected, best, onSelect, disabled }) {
  return (
    <button
      type="button"
      className={`${styles.planOption} ${selected ? styles.planOptionSelected : ''}`}
      onClick={onSelect}
      disabled={disabled}
    >
      <span className={styles.planCopy}>
        <span>{label}</span>
        {best && <span className={styles.bestValue}>BEST VALUE</span>}
      </span>
      <span className={styles.planPrice}>{pkg.priceString}</span>
    </button>
  );
}

function NativePaywall({ router }) {
  const [offerings, setOfferings] = useState(undefined);
  const [plan, setPlan] = useState('annual');
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [showEmailRestore, setShowEmailRestore] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getNativeOfferings().then((result) => {
      if (!cancelled) setOfferings(result);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  async function confirmAndRoute(controller, { ambiguous = false } = {}) {
    setPhase('confirming');
    let status = 'failed';
    try {
      const reconciled = await subscriptionApi.reconcileRevenueCat();
      status = reconciled?.effective_premium
        ? 'premium'
        : 'failed';
    } catch {}

    if (status !== 'premium' && ambiguous) {
      setPhase('activating');
      const ready = await pollEntitlementUntilPremium(fetchIsPremium, {
        attempts: 20,
        delayMs: 3000,
        signal: controller.signal,
      });
      status = ready ? 'premium' : 'pending';
    } else if (status !== 'premium') {
      status = await confirmEntitlementAfterPurchase(fetchIsPremium, { signal: controller.signal });
    }

    if (status === 'activating' && !controller.signal.aborted) {
      setPhase('activating');
      const ready = await pollEntitlementUntilPremium(fetchIsPremium, {
        attempts: 20,
        delayMs: 3000,
        signal: controller.signal,
      });
      status = ready ? 'premium' : 'stuck';
    }

    if (controller.signal.aborted) return;
    setPhase('idle');
    if (status === 'premium') {
      returnToIntent(router);
    } else if (status === 'failed') {
      setError('We couldn’t confirm your subscription. Please try again.');
    } else {
      setError('Payment received — your subscription is activating and will unlock automatically in a moment.');
    }
  }

  async function handleBuy() {
    if (!offerings) return;
    const pkg = plan === 'annual' ? offerings.annual : offerings.monthly;
    if (!pkg) return;

    setError(null);
    setShowEmailRestore(false);
    setPhase('purchasing');

    const user = getUser();
    if (user?.uid) await identifyNative(user.uid);
    let result = await purchaseNative(pkg.id);

    if (!result.success && result.error === 'not_identified' && user?.uid) {
      if (await identifyNative(user.uid)) result = await purchaseNative(pkg.id);
    }
    if (isAmbiguousPurchaseResult(result)) {
      const controller = new AbortController();
      abortRef.current = controller;
      await confirmAndRoute(controller, { ambiguous: true });
      abortRef.current = null;
      return;
    }
    if (!result.success) {
      result = await recoverActivePurchase(
        result,
        () => restoreNativeForUser(user?.uid),
      );
    }
    if (!result.success) {
      setPhase('idle');
      if (result.error === 'cancelled') return;
      setError(
        result.error === 'not_identified'
          ? 'Please sign in again, then retry.'
          : 'That purchase didn’t go through. Please try again.',
      );
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    await confirmAndRoute(controller);
    abortRef.current = null;
  }

  async function handleRestore() {
    setError(null);
    setShowEmailRestore(false);
    setPhase('restoring');

    const result = await restoreNativeForUser(getUser()?.uid);
    if (isAmbiguousPurchaseResult(result)) {
      const controller = new AbortController();
      abortRef.current = controller;
      await confirmAndRoute(controller, { ambiguous: true });
      abortRef.current = null;
      return;
    }
    if (!result.success) {
      setPhase('idle');
      setError(
        result.error === 'identity_mismatch'
          ? 'This subscription is linked to a different account. Sign in with that account to restore.'
          : 'Couldn’t restore. Please try again.',
      );
      return;
    }
    if (!result.active) {
      setPhase('idle');
      setShowEmailRestore(true);
      setError('No App Store subscription found to restore.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    await confirmAndRoute(controller);
    abortRef.current = null;
  }

  if (offerings === undefined) {
    return <p className={styles.nativeText}>Loading plans…</p>;
  }

  if (!offerings || (!offerings.monthly && !offerings.annual)) {
    return (
      <div className={styles.nativeWrap}>
        <p className={styles.nativeText}>
          Subscription plans are temporarily unavailable. Please try again shortly.
        </p>
        <button className={styles.restoreBtn} onClick={handleRestore}>
          Restore subscription
        </button>
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>
    );
  }

  const busy = phase !== 'idle';
  const selected = plan === 'annual' ? offerings.annual : offerings.monthly;

  return (
    <div className={styles.nativeWrap}>
      <div className={styles.planList}>
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

      {error && <p className={styles.errorMsg}>{error}</p>}

      <p className={styles.nativeText}>Already subscribed?</p>
      <button className={styles.restoreBtn} onClick={handleRestore} disabled={busy}>
        {phase === 'restoring' ? 'Restoring…' : 'Restore subscription'}
      </button>
      {showEmailRestore && (
        <button className={styles.restoreBtn} onClick={() => router.push('/restore')}>
          Subscribed on the web? Restore by email
        </button>
      )}
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
    if (native) return undefined;
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
    return () => { cancelled = true; };
  }, [native]);

  async function handleStartTrial() {
    setError(null);
    setSubmitting(true);
    try {
      let subscription;
      try {
        subscription = await subscriptionApi.getCurrent();
      } catch {
        setError('We could not confirm your subscription status. Please try again.');
        return;
      }
      if (subscription?.effective_premium === true) {
        setError('You already have Premium. Manage your subscription in settings.');
        return;
      }
      if (subscription?.effective_premium !== false) {
        setError('We could not confirm your subscription status. Please try again.');
        return;
      }
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
        <div className={styles.headerRow}>
          <button
            type="button"
            aria-label="Back to Dream Valley"
            onClick={() => router.back()}
            className={styles.backButton}
          >
            ← Back
          </button>
          <div className={styles.eyebrow}>Dream Valley Premium</div>
        </div>

        <h1 className={styles.headline}>
          Get the{' '}
          <span className={styles.headlineAccent}>sweetest sleep</span>{' '}
          every night
        </h1>

        <p className={styles.subheadline}>
          A warm, full bedtime routine for your little one — calming stories,
          poems, and lullabies, every single night.
        </p>

        <div className={styles.showcaseWrap}>
          <UpgradeShowcase />
        </div>

        <ul className={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <li key={i} className={styles.benefit}>
              <span className={styles.benefitIcon} aria-hidden="true">{b.icon}</span>
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
              <button
                className={styles.ctaBtn}
                onClick={handleStartTrial}
                disabled={submitting}
              >
                {submitting ? 'Taking you to checkout…' : 'Start my free trial'}
              </button>

              {priceLoaded && priceInfo && (
                <p className={styles.priceDisclosure}>
                  Free for {priceInfo.trialDays} days, then ${priceInfo.price}/month. Cancel anytime.
                </p>
              )}

              {error && (
                <p className={styles.errorMsg}>{error}</p>
              )}

              <p className={styles.nativeText} style={{ marginTop: 18 }}>Already subscribed?</p>
              <button
                className={styles.restoreBtn}
                onClick={() => router.push('/restore')}
              >
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
          <div className={styles.root} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dv-text-dim)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        }
      >
        <UpgradeInner />
      </Suspense>
    </>
  );
}
