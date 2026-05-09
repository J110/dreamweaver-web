'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { isLoggedIn } from '@/utils/auth';
import { subscriptionApi } from '@/utils/api';
import styles from './page.module.css';

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10000;

export default function UpgradeSuccessPage() {
  const { lang } = useI18n();
  const [state, setState] = useState('polling'); // polling | confirmed | timeout | error
  const [tierName, setTierName] = useState(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      // Stripe sometimes redirects without auth context. Show timeout
      // state with a "log in to continue" affordance instead of polling
      // forever.
      setState('timeout');
      return;
    }

    let cancelled = false;
    let errCount = 0;

    const tick = async () => {
      try {
        const data = await subscriptionApi.getCurrent();
        if (cancelled) return;
        const tier = data?.current_tier?.id;
        if (tier === 'premium') {
          setTierName(data?.current_tier?.name || 'Premium');
          setState('confirmed');
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      } catch {
        errCount += 1;
        if (errCount >= 3) {
          if (cancelled) return;
          setState('error');
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      if (cancelled) return;
      setState((s) => (s === 'polling' ? 'timeout' : s));
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, POLL_TIMEOUT_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <StarField />
      <div className={styles.page}>
        {state === 'polling' && (
          <div className={styles.card}>
            <div className={styles.spinner} aria-hidden />
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Premium set ho raha hai...' : 'Setting up your Premium...'}
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
            <div className={styles.checkmark} aria-hidden>✓</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Sab ho gaya!' : "You're all set!"}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? `Aap ab ${tierName || 'Premium'} par hain. Aaj raat se sab features unlock hain.`
                : `You're now on ${tierName || 'Premium'}. All features unlocked starting tonight.`}
            </p>
            <Link href="/" className={styles.primaryBtn}>
              {lang === 'hi' ? 'Dream Valley jaayein' : 'Continue to Dream Valley'}
            </Link>
          </div>
        )}

        {state === 'timeout' && (
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>⏳</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Abhi bhi process ho raha hai' : 'Still processing'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? 'Stripe ko kabhi-kabhi ek minute lag jaata hai. Confirmation email aa jaayega. Agar 5 minute me kuch nahi dikhe to support@dreamvalley.app par contact karein.'
                : "Stripe sometimes takes a minute. We've sent a confirmation email. If nothing shows up after 5 minutes, contact support@dreamvalley.app."}
            </p>
            <Link href="/" className={styles.primaryBtn}>
              {lang === 'hi' ? 'Wapas home' : 'Back to home'}
            </Link>
            <Link href="/settings" className={styles.secondaryLink}>
              {lang === 'hi' ? 'Settings me check karein' : 'Check status in settings'}
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>⚠</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Kuch theek nahi lag raha' : "Something's not right"}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? 'Hum status fetch nahi kar paaye. support@dreamvalley.app par contact karein.'
                : "We couldn't fetch your subscription status. Please contact support@dreamvalley.app."}
            </p>
            <Link href="/" className={styles.primaryBtn}>
              {lang === 'hi' ? 'Wapas home' : 'Back to home'}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
