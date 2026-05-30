'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { subscriptionApi, billingApi } from '@/utils/api';
import { isNativeApp } from '@/utils/platformDetect';
import { captureIntentFromQuery } from '@/utils/upgradeIntent';

const BENEFITS = [
  'Full story library — every story, poem, and lullaby',
  'Complete bedtime routine (playlists)',
  'Save up to 30 days of stories',
  '7-day free trial — no charge until day 8',
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
        if (premium && premium.price != null && premium.trial_days_monthly != null) {
          setPriceInfo({ price: premium.price, trialDays: premium.trial_days_monthly });
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
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '2rem 1.25rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Try Premium free for 7 days
      </h1>
      <p style={{ fontSize: '1rem', color: '#888', marginBottom: '1.75rem' }}>
        A full bedtime routine for your little one — stories, playlists, and more. Cancel anytime.
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
        {BENEFITS.map((b) => (
          <li key={b} style={{ padding: '0.5rem 0', borderBottom: '1px solid #222', fontSize: '0.95rem' }}>
            {b}
          </li>
        ))}
      </ul>

      {native ? (
        <div>
          <p style={{ fontSize: '0.95rem', color: '#aaa', marginBottom: '1.25rem' }}>
            Subscribe at <strong>dreamvalley.app</strong>
          </p>
          <button
            onClick={() => setRestoreMsg('Restore coming soon — check back in a future update.')}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: '0.875rem', cursor: 'pointer', padding: 0 }}
          >
            Restore subscription
          </button>
          {restoreMsg && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.825rem', color: '#666' }}>
              {restoreMsg}
            </p>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={handleStartTrial}
            disabled={submitting}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.875rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: '#6c47ff',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginBottom: '0.75rem',
            }}
          >
            {submitting ? 'Taking you to checkout...' : 'Start my free trial'}
          </button>

          {priceLoaded && priceInfo && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#777', margin: 0 }}>
              Free for {priceInfo.trialDays} days, then ${priceInfo.price}/month. Cancel anytime.
            </p>
          )}

          {error && (
            <p style={{ marginTop: '0.75rem', color: '#e55', fontSize: '0.875rem', textAlign: 'center' }}>
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading...</div>}>
      <UpgradeInner />
    </Suspense>
  );
}
