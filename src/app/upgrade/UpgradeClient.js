'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscriptionApi, billingApi } from '@/utils/api';
import { openCheckoutUrl } from '@/utils/checkoutPending';
import { isNativeApp } from '@/utils/platformDetect';
import { captureIntentFromQuery } from '@/utils/upgradeIntent';
import StarField from '@/components/StarField';
import UpgradeShowcase from '@/components/UpgradeShowcase';
import styles from './page.module.css';

const BENEFITS = [
  { icon: '✦', text: 'Full story library — every story, poem & lullaby' },
  { icon: '✦', text: 'Complete bedtime routine with playlists' },
  { icon: '✦', text: 'Save up to 30 days of bedtime favorites' },
  { icon: '✦', text: '7-day free trial — no charge until day 8' },
];

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
  }, []);

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
        <div className={styles.eyebrow}>Dream Valley Premium</div>

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
            <div className={styles.nativeWrap}>
              <p className={styles.nativeText}>
                Subscribe at <strong>dreamvalley.app</strong>, then restore below.
              </p>
              <button
                className={styles.restoreBtn}
                onClick={() => router.push('/restore')}
              >
                Restore subscription
              </button>
            </div>
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
