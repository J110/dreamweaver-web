'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { isLoggedIn } from '@/utils/auth';
import { subscriptionApi } from '@/utils/api';
import fetchApi from '@/utils/api';
import { returnToIntent } from '@/utils/upgradeIntent';
import styles from './page.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 9; // ~18s window

export default function UpgradeSuccessPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const [state, setState] = useState('polling'); // polling | confirmed | timeout | error
  const [tierName, setTierName] = useState(null);
  const intervalRef = useRef(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!isLoggedIn()) {
      setState('timeout');
      return;
    }

    let cancelled = false;
    let errCount = 0;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const tick = async () => {
      attemptsRef.current += 1;

      // Bust the 3-minute GET cache before every poll so the backend is
      // actually re-queried each time instead of returning the stale
      // pre-payment free-tier response.
      fetchApi.invalidate('/api/v1/subscriptions/current');

      try {
        const data = await subscriptionApi.getCurrent();
        if (cancelled) return;

        if (data?.effective_premium === true) {
          setTierName(data?.current_tier?.name || 'Premium');
          setState('confirmed');
          stopPolling();
          // Brief celebration window before navigating away.
          setTimeout(() => {
            if (!cancelled) returnToIntent(router);
          }, 1500);
          return;
        }
      } catch {
        errCount += 1;
        if (errCount >= 3) {
          if (cancelled) return;
          setState('error');
          stopPolling();
          return;
        }
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (cancelled) return;
        setState((s) => (s === 'polling' ? 'timeout' : s));
        stopPolling();
      }
    };

    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [router]);

  return (
    <>
      <StarField />
      <div className={styles.page}>
        {state === 'polling' && (
          <div className={styles.card}>
            <div className={styles.spinner} aria-hidden />
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Payment mil gaya, account set ho raha hai...' : 'Payment received, setting up your account…'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? 'Yeh kuch seconds le sakta hai.'
                : 'This usually takes a few seconds.'}
            </p>
          </div>
        )}

        {state === 'confirmed' && (
          <div className={styles.card}>
            <div className={styles.checkmark} aria-hidden>&#x2713;</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Sab ho gaya!' : "You're all set!"}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? `Aap ab ${tierName || 'Premium'} par hain. Aaj raat se sab features unlock hain.`
                : `You're now on ${tierName || 'Premium'}. All features are unlocked — taking you back now.`}
            </p>
          </div>
        )}

        {state === 'timeout' && (
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>&#x23F3;</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Abhi bhi process ho raha hai' : 'Payment received — almost there'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? 'Payment mil gaya. Premium abhi activate nahi dikh raha — ek minute mein page refresh karein ya support@dreamvalley.app par contact karein.'
                : 'Payment received — if Premium does not appear shortly, refresh this page or contact support@dreamvalley.app.'}
            </p>
            <button
              className={styles.primaryBtn}
              onClick={() => window.location.reload()}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {lang === 'hi' ? 'Page refresh karein' : 'Refresh'}
            </button>
            <Link href="/settings" className={styles.secondaryLink}>
              {lang === 'hi' ? 'Settings me check karein' : 'Check status in settings'}
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>&#x26A0;</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Payment receive hua, status check nahi ho paya' : 'Payment received — status check failed'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? 'Aapka payment safe hai. Agar premium nahi dikh raha, support@dreamvalley.app par contact karein.'
                : 'Your payment is safe. If Premium does not appear in settings, contact support@dreamvalley.app.'}
            </p>
            <button
              className={styles.primaryBtn}
              onClick={() => window.location.reload()}
              style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {lang === 'hi' ? 'Page refresh karein' : 'Refresh'}
            </button>
            <Link href="/" className={styles.secondaryLink}>
              {lang === 'hi' ? 'Wapas home' : 'Back to home'}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
