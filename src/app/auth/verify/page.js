'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { authApi } from '@/utils/api';
import styles from './page.module.css';

function VerifyInner() {
  const params = useSearchParams();
  const { lang } = useI18n();
  const [state, setState] = useState('verifying'); // verifying | claimed | already_used | expired | invalid
  const [context, setContext] = useState(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    const code = params?.get('code');
    if (!code) {
      setState('invalid');
      return;
    }
    (async () => {
      try {
        const res = await authApi.verifyLink(code);
        const status = res?.status || 'invalid';
        setContext(res?.context || null);
        setState(status);
        if (status === 'claimed') {
          try {
            const ph = (await import('posthog-js')).default;
            ph.capture('auth_link_clicked', { context: res?.context || null });
          } catch { /* ignore */ }
        }
      } catch {
        setState('invalid');
      }
    })();
  }, [params]);

  if (state === 'verifying') {
    return (
      <div className={styles.card}>
        <div className={styles.spinner} aria-hidden />
        <h1 className={styles.title}>
          {lang === 'hi' ? 'Verify ho raha hai...' : 'Verifying...'}
        </h1>
      </div>
    );
  }

  if (state === 'claimed') {
    return (
      <div className={styles.card}>
        <div className={styles.checkmark} aria-hidden>✓</div>
        <h1 className={styles.title}>
          {lang === 'hi' ? 'Aap log in ho gaye' : 'You’re logged in'}
        </h1>
        <p className={styles.body}>
          {lang === 'hi'
            ? 'Aap apne pehle wale tab par wapas jaa sakte hain — wo apne aap update ho jaayega. Is tab ko close kar dein.'
            : 'Return to your other tab — it’ll update automatically. You can close this one.'}
        </p>
        <Link href="/" className={styles.secondaryLink}>
          {lang === 'hi' ? 'Ya yahin se home par jaayein' : 'Or just go home from here'}
        </Link>
      </div>
    );
  }

  if (state === 'already_used') {
    return (
      <div className={styles.card}>
        <div className={styles.warningMark} aria-hidden>↻</div>
        <h1 className={styles.title}>
          {lang === 'hi' ? 'Yeh link use ho chuka hai' : 'This link was already used'}
        </h1>
        <p className={styles.body}>
          {lang === 'hi'
            ? 'Har link sirf ek baar use ho sakta hai. Naya link request karein.'
            : 'Each link works only once. Request a fresh one.'}
        </p>
        <Link href="/login" className={styles.primaryBtn}>
          {lang === 'hi' ? 'Naya link bhejein' : 'Send a new link'}
        </Link>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className={styles.card}>
        <div className={styles.warningMark} aria-hidden>⏳</div>
        <h1 className={styles.title}>
          {lang === 'hi' ? 'Link expire ho gaya' : 'Link expired'}
        </h1>
        <p className={styles.body}>
          {lang === 'hi'
            ? 'Magic-link 15 minute tak chalte hain. Naya bhejte hain.'
            : 'Magic links work for 15 minutes. Let’s send a new one.'}
        </p>
        <Link href="/login" className={styles.primaryBtn}>
          {lang === 'hi' ? 'Naya link bhejein' : 'Send a new link'}
        </Link>
      </div>
    );
  }

  // invalid
  return (
    <div className={styles.card}>
      <div className={styles.warningMark} aria-hidden>⚠</div>
      <h1 className={styles.title}>
        {lang === 'hi' ? 'Kuch theek nahi laga' : "Something's not right"}
      </h1>
      <p className={styles.body}>
        {lang === 'hi'
          ? 'Yeh link valid nahi hai. /login se naya request karein.'
          : 'This link isn’t valid. Try requesting a new one from /login.'}
      </p>
      <Link href="/login" className={styles.primaryBtn}>
        {lang === 'hi' ? 'Login par jaayein' : 'Go to login'}
      </Link>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <>
      <StarField />
      <div className={styles.page}>
        <Suspense fallback={<div className={styles.card}><div className={styles.spinner} aria-hidden /></div>}>
          <VerifyInner />
        </Suspense>
      </div>
    </>
  );
}
