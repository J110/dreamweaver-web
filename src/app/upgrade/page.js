'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscriptionApi, billingApi } from '@/utils/api';
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
  const [priceInfo, setPriceInfo] = useState(null);
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [restoreMsg, setRestoreMsg] = useState(null);
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
      const { checkout_url } = await billingApi.startCheckout('monthly');
      if (checkout_url) {
        window.location.href = checkout_url;
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
                Subscribe at <strong>dreamvalley.app</strong>
              </p>
              <button
                className={styles.restoreBtn}
                onClick={() =>
                  setRestoreMsg('Restore coming soon — check back in a future update.')
                }
              >
                Restore subscription
              </button>
              {restoreMsg && (
                <p className={styles.restoreMsg}>{restoreMsg}</p>
              )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <>
      <StarField />
      <Suspense
        fallback={
          <div className={styles.root} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,246,255,0.5)', fontSize: '0.9rem' }}>
            Loading…
          </div>
        }
      >
        <UpgradeInner />
      </Suspense>
    </>
  );
}
