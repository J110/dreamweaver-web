'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { setToken, setUser } from '@/utils/auth';
import { authApi, subscriptionApi } from '@/utils/api';
import styles from './page.module.css';

// Native bridge feature-detect (see dreamweaver/lib/native_auth_bridge.dart).
// Present + isAvailable===true only inside the 2.0 native WebView. In a plain
// browser this is undefined → restore stores the token to the normal web
// session (localStorage) and skips Keychain.
function nativeAuth() {
  if (typeof window === 'undefined') return null;
  const a = window.DreamValleyAuth;
  return a && a.isAvailable === true ? a : null;
}

function ph(event, props) {
  if (typeof window === 'undefined') return;
  import('posthog-js')
    .then(({ default: posthog }) => { try { posthog.capture(event, props || {}); } catch { /* ignore */ } })
    .catch(() => { /* ignore */ });
}

export default function RestorePage() {
  const { lang } = useI18n();
  const hi = lang === 'hi';

  const [stage, setStage] = useState('email'); // email | code | success | save_failed
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const tokenRef = useRef(null); // holds the minted token across a Keychain retry
  const redirectTimer = useRef(null);

  useEffect(() => () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const codeValid = /^[0-9]{6}$/.test(code.trim());

  const t = (en, hindi) => (hi ? hindi : en);

  async function onSendCode(e) {
    e?.preventDefault();
    if (!emailValid || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await authApi.restoreSendCode(email.trim());
      if (res?.status === 'rate_limited') {
        const mins = Math.ceil((res.retry_after_seconds || 1800) / 60);
        setError(t(
          `Too many requests. Try again in about ${mins} min.`,
          `Bahut zyada requests. Lagbhag ${mins} min baad try karein.`,
        ));
      } else {
        ph('restore_code_requested', {});
        setStage('code');
        setNotice(t(
          'If that email has a subscription, a 6-digit code is on its way.',
          'Agar us email par subscription hai, to 6-digit code aa raha hai.',
        ));
      }
    } catch {
      setError(t('Could not send the code. Check your connection and try again.',
                 'Code nahi bhej paaye. Connection check karke try karein.'));
    } finally {
      setBusy(false);
    }
  }

  async function persistAndFinish(token, uid, familyId) {
    // Always authenticate the current web session — this is what the app
    // reads (localStorage 'dreamweaver_token') for API calls, native or not.
    setToken(token);
    setUser({ uid, family_id: familyId, email_verified: true, onboarding_complete: true });

    const native = nativeAuth();
    if (!native) {
      ph('restore_succeeded', { native: false });
      goSuccess();
      return;
    }
    // Native: ALSO write the durable Keychain copy. storeToken resolves true
    // only if the native write-back-verify confirmed — honor a false return.
    setStage('storing');
    let ok = false;
    try { ok = await native.storeToken(token); } catch { ok = false; }
    if (ok) {
      ph('restore_succeeded', { native: true });
      goSuccess();
    } else {
      // The token IS live for this session, but it did NOT persist to the
      // Keychain — a cold start would drop the user back to free. Do NOT
      // claim success; offer a retry of the Keychain write (the code is
      // already consumed, so we retry the WRITE, not the verify).
      ph('restore_keychain_failed', {});
      setError('');
      setStage('save_failed');
    }
  }

  async function onVerifyCode(e) {
    e?.preventDefault();
    if (!codeValid || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await authApi.restoreVerifyCode(email.trim(), code.trim());
      const status = res?.status;
      if (status === 'claimed' && res.token) {
        tokenRef.current = res.token;
        await persistAndFinish(res.token, res.uid, res.family_id);
        return;
      }
      if (status === 'no_subscription') {
        // Wrong-EMAIL controlled leak — distinct from a wrong code.
        setStage('email');
        setCode('');
        setError(t(
          'No subscription found for this email. Use the email from your payment receipt, or contact support@dreamvalley.app.',
          'Is email par koi subscription nahi mili. Payment receipt waali email use karein, ya support@dreamvalley.app par baat karein.',
        ));
      } else if (status === 'too_many_attempts') {
        setStage('email');
        setCode('');
        setError(t(
          'Too many tries on that code. Request a fresh one.',
          'Us code par bahut try ho gaye. Naya code request karein.',
        ));
      } else {
        // invalid_or_expired — wrong code for a real sub. Stay on the code
        // stage; this is NOT the "no subscription" message.
        setError(t(
          "That code didn't match. Check it and try again.",
          'Code match nahi hua. Dobara check karke try karein.',
        ));
      }
    } catch {
      setError(t('Could not verify the code. Check your connection and try again.',
                 'Code verify nahi kar paaye. Connection check karke try karein.'));
    } finally {
      setBusy(false);
    }
  }

  async function onRetryKeychain() {
    const token = tokenRef.current;
    if (!token || busy) return;
    setBusy(true);
    const native = nativeAuth();
    let ok = false;
    try { ok = native ? await native.storeToken(token) : false; } catch { ok = false; }
    setBusy(false);
    if (ok) { ph('restore_succeeded', { native: true, retried: true }); goSuccess(); }
    else { setError(t('Still could not save on this device.', 'Ab bhi device par save nahi hua.')); }
  }

  async function goSuccess() {
    setStage('success');
    try { await subscriptionApi.getCurrent(); } catch { /* best-effort entitlement refresh */ }
    redirectTimer.current = setTimeout(() => { window.location.assign('/'); }, 1600);
  }

  return (
    <>
      <StarField />
      <div className={styles.page}>
        <div className={styles.card}>
          {stage === 'success' ? (
            <>
              <div className={styles.checkmark} aria-hidden>✓</div>
              <h1 className={styles.title}>{t('Welcome back!', 'Wapas swagat hai!')}</h1>
              <p className={styles.body}>{t('Taking you to Dream Valley...', 'Dream Valley le chal rahe hain...')}</p>
            </>
          ) : stage === 'storing' ? (
            <>
              <div className={styles.spinner} aria-hidden />
              <h1 className={styles.title}>{t('Saving your sign-in...', 'Sign-in save kar rahe hain...')}</h1>
            </>
          ) : stage === 'save_failed' ? (
            <>
              <div className={styles.warningMark} aria-hidden>⚠</div>
              <h1 className={styles.title}>{t("Couldn't save on this device", 'Device par save nahi hua')}</h1>
              <p className={styles.body}>
                {t(
                  "You're signed in for now, but we couldn't store it for next time. Tap retry so you stay signed in after closing the app.",
                  'Abhi aap signed in hain, par agli baar ke liye save nahi hua. Retry dabaayein taaki app band karne ke baad bhi signed in rahein.',
                )}
              </p>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.primaryBtn} onClick={onRetryKeychain} disabled={busy}>
                {busy ? t('Retrying...', 'Retry ho raha hai...') : t('Retry', 'Retry')}
              </button>
            </>
          ) : stage === 'code' ? (
            <form onSubmit={onVerifyCode}>
              <h1 className={styles.title}>{t('Enter your code', 'Apna code daalein')}</h1>
              <p className={styles.body}>
                {t('We emailed a 6-digit code to ', 'Humne 6-digit code bheja hai ')}<strong>{email.trim()}</strong>
                {t('. It is good for 10 minutes.', '. Yeh 10 minute tak chalega.')}
              </p>
              {notice ? <p className={styles.notice}>{notice}</p> : null}
              <input
                className={styles.input}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                aria-label={t('6-digit code', '6-digit code')}
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.primaryBtn} type="submit" disabled={!codeValid || busy}>
                {busy ? t('Verifying...', 'Verify ho raha hai...') : t('Verify & restore', 'Verify karke restore karein')}
              </button>
              <button type="button" className={styles.secondaryLink}
                      onClick={() => { setStage('email'); setCode(''); setError(''); setNotice(''); }}>
                {t('Use a different email', 'Doosri email use karein')}
              </button>
            </form>
          ) : (
            <form onSubmit={onSendCode}>
              <h1 className={styles.title}>{t('Restore your subscription', 'Apna subscription restore karein')}</h1>
              <p className={styles.body}>
                {t(
                  'Use the exact email from your payment receipt. We will send a 6-digit code to confirm.',
                  'Apni payment receipt waali exact email use karein. Confirm karne ke liye 6-digit code bhejenge.',
                )}
              </p>
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                placeholder={t('you@example.com', 'aap@example.com')}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                aria-label={t('Email', 'Email')}
              />
              {error ? <p className={styles.error}>{error}</p> : null}
              <button className={styles.primaryBtn} type="submit" disabled={!emailValid || busy}>
                {busy ? t('Sending...', 'Bhej rahe hain...') : t('Send code', 'Code bhejein')}
              </button>
              <Link href="/" className={styles.secondaryLink}>
                {t('Back to Dream Valley', 'Dream Valley wapas')}
              </Link>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
