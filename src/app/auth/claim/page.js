'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { getUser, isLoggedIn, setToken, setUser } from '@/utils/auth';
import { authApi } from '@/utils/api';
import styles from './page.module.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

export default function ClaimPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const [stage, setStage] = useState('enter_email'); // enter_email | check_email | expired | rate_limited
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    const u = getUser();
    setUsername(u?.username || '');
  }, [router]);

  const stopPolling = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  function startPolling(sessionId) {
    stopPolling();
    const tick = async () => {
      try {
        const data = await authApi.pollSession(sessionId);
        if (data?.status === 'ready') {
          setToken(data.token);
          setUser({
            uid: data.uid,
            username: data.username,
            family_id: data.family_id,
            email_verified: !!data.email_verified,
            onboarding_complete: data.onboarding_complete,
            child_age: data.child_age,
            preferred_lang: data.preferred_lang,
          });
          try {
            const ph = (await import('posthog-js')).default;
            ph.capture('auth_verified', { context: data.context });
          } catch { /* ignore */ }
          sessionStorage.removeItem('dv_claim_session_id');
          stopPolling();
          router.replace('/');
          return;
        }
        if (data?.status === 'expired') {
          sessionStorage.removeItem('dv_claim_session_id');
          stopPolling();
          setStage('expired');
        }
      } catch {
        /* network blip — keep polling */
      }
    };
    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      sessionStorage.removeItem('dv_claim_session_id');
      stopPolling();
      setStage((s) => (s === 'check_email' ? 'expired' : s));
    }, POLL_TIMEOUT_MS);
  }

  // Clear any stale dv_claim_session_id on mount. Auto-resuming polling
  // on a 15-min-stale id raced the user's new submit and showed
  // 'Link expired' before any interaction. Same fix as /login.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('dv_claim_session_id');
    }
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError(lang === 'hi' ? 'Sahi email daalein.' : 'Please enter a valid email.');
      return;
    }
    setError(null);
    setSubmitting(true);
    sessionStorage.removeItem('dv_claim_session_id');
    try {
      const res = await authApi.claimExisting(trimmed, lang);
      try {
        const ph = (await import('posthog-js')).default;
        const { emailHash } = await import('@/utils/auth');
        const hash = await emailHash(trimmed);
        ph.capture('auth_request_link', { email_hash: hash, lang, context: 'claim_existing' });
      } catch { /* ignore */ }
      if (res?.status === 'rate_limited') {
        setRetryAfter(res.retry_after_seconds || 0);
        setStage('rate_limited');
      } else if (res?.initiator_session_id) {
        sessionStorage.setItem('dv_claim_session_id', res.initiator_session_id);
        setStage('check_email');
        startPolling(res.initiator_session_id);
      } else {
        setError(lang === 'hi' ? 'Kuch galat hua. Phir try karein.' : 'Something went wrong. Try again.');
      }
    } catch {
      setError(
        lang === 'hi'
          ? 'Server abhi reachable nahi hai. Thoda baad try karein.'
          : "We can't reach our servers right now. Please try again in a moment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetToEntry() {
    sessionStorage.removeItem('dv_claim_session_id');
    stopPolling();
    setStage('enter_email');
    setError(null);
  }

  // ── Render ────────────────────────────────────────────────

  if (stage === 'check_email') {
    return (
      <>
        <StarField />
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.spinner} aria-hidden />
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Apna inbox check karein' : 'Check your inbox'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? <>Humne <strong>{email}</strong> par link bheja hai. Email kholkar tap karein. Yahin wait karein — page apne aap update ho jaayega.</>
                : <>We sent a verification link to <strong>{email}</strong>. Open the email and tap the link. Stay here — this page will update automatically.</>}
            </p>
            <p className={styles.fineprint}>
              {lang === 'hi' ? 'Link 15 minute tak chalega.' : 'The link works for 15 minutes.'}
            </p>
            <button onClick={resetToEntry} className={styles.secondaryLink}>
              {lang === 'hi' ? 'Kuch aur email use karein' : 'Use a different email'}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (stage === 'expired') {
    return (
      <>
        <StarField />
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>⏳</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Link expire ho gaya' : 'Link expired'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi' ? 'Naya link bhejte hain.' : 'Let’s send a new one.'}
            </p>
            <button onClick={resetToEntry} className={styles.primaryBtn}>
              {lang === 'hi' ? 'Naya link bhejein' : 'Send a new link'}
            </button>
          </div>
        </div>
      </>
    );
  }

  if (stage === 'rate_limited') {
    const timeStr = retryAfter >= 60
      ? `${Math.ceil(retryAfter / 60)} ${lang === 'hi' ? 'minute' : 'minutes'}`
      : `${Math.max(retryAfter, 1)} ${lang === 'hi' ? 'seconds' : 'seconds'}`;
    return (
      <>
        <StarField />
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.warningMark} aria-hidden>⏳</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Bahut zyada requests' : 'Too many requests'}
            </h1>
            <p className={styles.body}>
              {lang === 'hi'
                ? `Bahut zyada login link requests ho gayi hain. ${timeStr} ruk kar dobara try karein.`
                : `Too many login link requests. Please wait ${timeStr} before trying again.`}
            </p>
            <button onClick={resetToEntry} className={styles.primaryBtn}>
              {lang === 'hi' ? 'Doosra email use karein' : 'Use a different email'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StarField />
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {lang === 'hi' ? 'Aapka account secure ho raha hai' : 'Securing your account'}
          </h1>
          <p className={styles.body}>
            {lang === 'hi'
              ? <>Hum login ko email-based magic links par migrate kar rahe hain — passwords ki zarurat nahi. Apna email daalein, hum verify link bhejenge. <strong>Aapka username{username ? ` (${username})` : ''} aur kahaniyaan jaisi thi waisi hi rahengi.</strong></>
              : <>We’re upgrading login to email-based magic links — no more passwords. Enter your email and we’ll send a verification link. <strong>Your username{username ? ` (${username})` : ''}, kid profiles, and stories stay exactly the same.</strong></>}
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={lang === 'hi' ? 'aap@example.com' : 'you@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoFocus
              disabled={submitting}
              maxLength={120}
            />
            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className={styles.primaryBtn}
            >
              {submitting
                ? (lang === 'hi' ? 'Bhej rahe hain...' : 'Sending...')
                : (lang === 'hi' ? 'Verify link bhejein' : 'Send verify link')}
            </button>
          </form>

          <p className={styles.fineprint}>
            {lang === 'hi'
              ? 'Email sirf account aur transactional emails ke liye. Marketing nahi.'
              : 'Email is used for your account and transactional emails only. No marketing.'}
          </p>
        </div>
      </div>
    </>
  );
}
