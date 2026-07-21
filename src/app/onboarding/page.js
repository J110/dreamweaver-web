'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { getUser, isLoggedIn, setToken, setUser } from '@/utils/auth';
import { authApi, userApi } from '@/utils/api';
import { dvAnalytics } from '@/utils/analytics';
import { getPricingReturnPath } from '@/utils/pricingIntent';
import styles from './page.module.css';

const AGE_OPTIONS = [
  { value: '0-1', label: '0-1 yrs', emoji: '👶', numeric: 1 },
  { value: '2-5', label: '2-5 yrs', emoji: '🧒', numeric: 4 },
  { value: '6-8', label: '6-8 yrs', emoji: '📚', numeric: 7 },
  { value: '9-12', label: '9-12 yrs', emoji: '🌟', numeric: 10 },
];

function rangeForNumericAge(n) {
  if (typeof n !== 'number') return null;
  if (n <= 1) return '0-1';
  if (n <= 5) return '2-5';
  if (n <= 8) return '6-8';
  return '9-12';
}

export default function OnboardingPage() {
  const router = useRouter();
  const { setLang, t, lang } = useI18n();

  const [authed, setAuthed] = useState(false);
  const [selectedAge, setSelectedAge] = useState(null);
  const [username, setUsername] = useState('');
  const [selectedLang, setSelectedLang] = useState(lang || 'en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Same full form (username + age + language) for everyone. Anon users
    // persist to localStorage; logged-in users persist to their user
    // record AND mirror to localStorage so hasCompletedOnboarding() works
    // uniformly across both.
    const a = isLoggedIn();
    setAuthed(a);
    if (a) {
      // Pre-fill from existing user record so re-edits show current values.
      const u = getUser();
      if (u?.username) setUsername(u.username);
      const r = rangeForNumericAge(u?.child_age);
      if (r) setSelectedAge(r);
      if (u?.preferred_lang) setSelectedLang(u.preferred_lang);
    } else {
      // Pre-fill from localStorage so re-edits show current values.
      try {
        const u = localStorage.getItem('dreamvalley_anon_username');
        if (u) setUsername(u);
        const ageRange = localStorage.getItem('dreamvalley_child_age');
        if (ageRange) setSelectedAge(ageRange);
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);

    const childAge = selectedAge || '2-5';
    const opt = AGE_OPTIONS.find((o) => o.value === childAge);
    const numericAge = opt ? opt.numeric : 5;

    // Anon submit: first try username-only login against an existing
    // account. If the username resolves to an existing user, mint a
    // session token (the form doubles as the sign-in entry point since
    // magic-link UI was scrapped). On 404, fall through to the anon
    // localStorage path for new-user creation.
    if (!authed) {
      try {
        const res = await authApi.deviceAccount(trimmed, { child_age: numericAge, lang: selectedLang });
        if (res && res.token) {
          setToken(res.token);
          setUser({ ...(res.user || {}), onboarding_complete: true });
          try {
            localStorage.setItem('dreamvalley_anon_username', trimmed);
            localStorage.setItem('dreamvalley_child_age', childAge);
          } catch {}
          setLang(selectedLang);
          dvAnalytics.track('onboarding_complete', { childAge, username: trimmed, lang: selectedLang, logged_in: true });
          setLoading(false);
          router.replace(getPricingReturnPath());
          return;
        }
      } catch (err) {
        // Network error only — keep the user moving with a local username so
        // the app is usable offline; a device account mints on next load.
      }
      try {
        localStorage.setItem('dreamvalley_anon_username', trimmed);
        localStorage.setItem('dreamvalley_child_age', childAge);
      } catch {}
      setLang(selectedLang);
      dvAnalytics.track('onboarding_complete', { childAge, username: trimmed, lang: selectedLang, anon: true });
      setLoading(false);
      router.replace(getPricingReturnPath());
      return;
    }

    try {
      try {
        localStorage.setItem('dreamvalley_child_age', childAge);
        // Mirror username to localStorage so hasCompletedOnboarding()
        // returns true uniformly for both anon and logged-in users.
        localStorage.setItem('dreamvalley_anon_username', trimmed);
      } catch {}

      // Post-auth-only flow. Persist to backend.
      try {
        const res = await userApi.completeOnboarding({
          username: trimmed,
          child_age: numericAge,
          lang: selectedLang,
        });
        // Update cached user with the new fields so AppShell stops gating us.
        const u = getUser() || {};
        setUser({
          ...u,
          username: res.username || trimmed,
          child_age: res.child_age ?? numericAge,
          preferred_lang: res.preferred_lang || selectedLang,
          onboarding_complete: true,
        });
        setLang(selectedLang);
        dvAnalytics.track('onboarding_complete', {
          childAge,
          username: trimmed,
          lang: selectedLang,
        });
        router.replace(getPricingReturnPath());
      } catch (err) {
        const msg = String(err?.message || err || '');
        if (msg.includes('username_taken') || msg.includes('409')) {
          setError(
            lang === 'hi'
              ? 'Yeh username pehle se le liya gaya hai. Kuch aur try karein.'
              : 'That username is taken. Try another.'
          );
        } else {
          setError(
            lang === 'hi'
              ? 'Kuch galat hua. Phir try karein.'
              : 'Something went wrong. Try again.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <StarField />
      <div className={styles.wrapper}>
        <form className={styles.slide} onSubmit={handleSubmit}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-new.png" alt="Dream Valley" className={styles.logoImageSmall} />
          <p className={styles.subtitle}>
            {selectedLang === 'hi'
              ? 'Magical bedtime stories — aapke kid ke liye'
              : 'Where magical bedtime stories come alive'}
          </p>

          <div className={styles.ageSection}>
                <p className={styles.ageLabel}>
                  {selectedLang === 'hi'
                    ? 'Aapka kid kitne saal ka hai?'
                    : 'How old is your little one?'}
                  <span className={styles.optional}>
                    {selectedLang === 'hi' ? ' (optional)' : ' (optional)'}
                  </span>
                </p>
                <div className={styles.ageGrid}>
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      className={`${styles.ageCard} ${selectedAge === opt.value ? styles.ageCardSelected : ''}`}
                      onClick={() => setSelectedAge(opt.value)}
                    >
                      <span className={styles.ageEmoji}>{opt.emoji}</span>
                      <span className={styles.ageText}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.usernameSection}>
                <p className={styles.ageLabel}>
                  {selectedLang === 'hi' ? 'Display name kya rakhein?' : 'What should we call you?'}
                </p>
                <p className={styles.usernameHint}>
                  {selectedLang === 'hi'
                    ? 'Yeh sirf display ke liye — login email-based hai.'
                    : 'Just for display — login is email-based.'}
                </p>
                {error && <div className={styles.errorMessage}>{error}</div>}
                <input
                  type="text"
                  placeholder={selectedLang === 'hi' ? 'jaise: Aarav' : 'e.g. Alice'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={styles.usernameInput}
                  autoFocus
                  disabled={loading}
                  maxLength={24}
                  pattern="[A-Za-z0-9_ ]+"
                />
              </div>

          <div className={styles.langSection}>
            <p className={styles.ageLabel}>
              {selectedLang === 'hi' ? 'App ki language' : 'App language'}
            </p>
            <div className={styles.langToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={selectedLang === 'en'}
                className={`${styles.langBtn} ${selectedLang === 'en' ? styles.langBtnActive : ''}`}
                onClick={() => setSelectedLang('en')}
                disabled={loading}
              >
                English
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedLang === 'hi'}
                className={`${styles.langBtn} ${selectedLang === 'hi' ? styles.langBtnActive : ''}`}
                onClick={() => setSelectedLang('hi')}
                disabled={loading}
              >
                Hindi
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className={styles.startBtn}
          >
            {loading
              ? `✨ ${selectedLang === 'hi' ? 'Save ho raha hai...' : 'Saving...'}`
              : (selectedLang === 'hi' ? 'Shuru karein' : 'Get started')}
          </button>
        </form>
      </div>
    </>
  );
}
