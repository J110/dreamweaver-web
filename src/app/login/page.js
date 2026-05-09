'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { setToken, setUser, signin } from '@/utils/auth';
import { authApi } from '@/utils/api';
import styles from './page.module.css';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // matches code expiry per spec

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useI18n();
  const [showSessionBanner, setShowSessionBanner] = useState(
    searchParams?.get('reason') === 'session_expired'
  );

  useEffect(() => {
    if (!showSessionBanner) return;
    // Banner self-clears after 5s. CSS handles the 0.5s fade in the last
    // 0.5s of the window via animation-delay; we then unmount it.
    const t = setTimeout(() => setShowSessionBanner(false), 5000);
    return () => clearTimeout(t);
  }, [showSessionBanner]);

  const [mode, setMode] = useState('login_existing'); // 'signup_new' | 'login_existing'
  const [stage, setStage] = useState('enter_email'); // enter_email | check_email | expired | error
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

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
          });
          try {
            const ph = (await import('posthog-js')).default;
            ph.capture('auth_verified', { context: data.context });
          } catch { /* ignore */ }
          sessionStorage.removeItem('dv_login_session_id');
          stopPolling();
          router.replace('/');
          return;
        }
        if (data?.status === 'expired') {
          sessionStorage.removeItem('dv_login_session_id');
          stopPolling();
          setStage('expired');
          try {
            const ph = (await import('posthog-js')).default;
            ph.capture('auth_link_expired', {});
          } catch { /* ignore */ }
        }
      } catch {
        // Network error — keep polling. Total wait capped by timeout below.
      }
    };
    tick();
    intervalRef.current = setInterval(tick, POLL_INTERVAL_MS);
    timeoutRef.current = setTimeout(() => {
      sessionStorage.removeItem('dv_login_session_id');
      stopPolling();
      setStage((s) => (s === 'check_email' ? 'expired' : s));
    }, POLL_TIMEOUT_MS);
  }

  // Resume polling if a previous request_link result is still in sessionStorage.
  useEffect(() => {
    const saved = (typeof window !== 'undefined') && sessionStorage.getItem('dv_login_session_id');
    if (saved) {
      setStage('check_email');
      startPolling(saved);
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
    try {
      const res = await signin(trimmed, mode, lang);
      if (res?.initiator_session_id) {
        sessionStorage.setItem('dv_login_session_id', res.initiator_session_id);
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
    sessionStorage.removeItem('dv_login_session_id');
    stopPolling();
    setStage('enter_email');
    setError(null);
  }

  // ── Render ────────────────────────────────────────────────

  if (stage === 'check_email') {
    return (
      <>
        <StarField />
        <div className={styles.pageWrapper}>
          <div className={styles.container}>
            <div className={styles.spinner} aria-hidden />
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Apna inbox check karein' : 'Check your inbox'}
            </h1>
            <p className={styles.subtitle}>
              {lang === 'hi'
                ? <>Humne <strong>{email}</strong> par ek login link bheja hai. Email kholkar link click karein. Yahin wait karein — yeh page apne aap update ho jaayega.</>
                : <>We sent a login link to <strong>{email}</strong>. Open the email and tap the link. Stay on this page — it&apos;ll update automatically once you&apos;re logged in.</>}
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
        <div className={styles.pageWrapper}>
          <div className={styles.container}>
            <div className={styles.warningMark} aria-hidden>⏳</div>
            <h1 className={styles.title}>
              {lang === 'hi' ? 'Link expire ho gaya' : 'Link expired'}
            </h1>
            <p className={styles.subtitle}>
              {lang === 'hi'
                ? 'Yeh login link 15 minute se zyada purana ho gaya. Naya bhejte hain.'
                : 'That login link is over 15 minutes old. Let’s send a new one.'}
            </p>
            <button onClick={resetToEntry} className={styles.submitBtn}>
              {lang === 'hi' ? 'Naya link bhejein' : 'Send a new link'}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StarField />
      <div className={styles.pageWrapper}>
        <div className={styles.container}>
          {showSessionBanner && (
            <div className={styles.sessionExpiredBanner} role="status">
              {lang === 'hi'
                ? 'Session expire ho gaya. Dobara log in karein.'
                : 'Your session expired — please log in again.'}
            </div>
          )}
          <div className={styles.iconLarge}>🌙</div>
          <h1 className={styles.title}>Dream Valley</h1>
          <p className={styles.subtitle}>
            {lang === 'hi'
              ? 'Apna email daalein. Hum ek login link bhejenge. Koi password yaad rakhne ki zarurat nahi.'
              : 'Enter your email. We’ll send you a login link. No passwords to remember.'}
          </p>

          <div className={styles.modeToggle} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login_existing'}
              className={`${styles.modeBtn} ${mode === 'login_existing' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('login_existing')}
              disabled={submitting}
            >
              {lang === 'hi' ? 'Log in' : 'Log in'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup_new'}
              className={`${styles.modeBtn} ${mode === 'signup_new' ? styles.modeBtnActive : ''}`}
              onClick={() => setMode('signup_new')}
              disabled={submitting}
            >
              {lang === 'hi' ? 'Naya account' : "I'm new"}
            </button>
          </div>

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
              className={styles.submitBtn}
            >
              {submitting
                ? (lang === 'hi' ? 'Bhej rahe hain...' : 'Sending...')
                : (lang === 'hi' ? 'Login link bhejein' : 'Send login link')}
            </button>
          </form>

          <p className={styles.fineprint}>
            {lang === 'hi'
              ? 'Aapka email sirf account aur transactional emails (receipt, security) ke liye use hota hai. Marketing nahi.'
              : 'Your email is used only for your account and transactional emails (receipts, security). No marketing.'}
          </p>
        </div>
      </div>
    </>
  );
}
