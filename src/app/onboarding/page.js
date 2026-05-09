'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { dvAnalytics } from '@/utils/analytics';
import styles from './page.module.css';

const AGE_OPTIONS = [
  { value: '0-1', label: '0-1 yrs', emoji: '👶' },
  { value: '2-5', label: '2-5 yrs', emoji: '🧒' },
  { value: '6-8', label: '6-8 yrs', emoji: '📚' },
  { value: '9-12', label: '9-12 yrs', emoji: '🌟' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setLang, t } = useI18n();
  const [selectedAge, setSelectedAge] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGetStarted = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setError(null);
    setLoading(true);

    // Save age preference
    const childAge = selectedAge || '2-5';
    try { localStorage.setItem('dreamvalley_child_age', childAge); } catch {}

    // Parse numeric age for API (use midpoint of range)
    const ageMap = { '0-1': 1, '2-5': 4, '6-8': 7, '9-12': 10 };
    const numericAge = ageMap[childAge] || 5;

    try {
      // Phase 0 step 1.5 — onboarding no longer mints an account. We stash
      // the user-chosen display name as a local hint, save age preference
      // (already saved above), and redirect to /login. The magic-link flow
      // owns auth from here. Hardcoded 'dreamvalley_default' password path
      // and the offline fake-user fallback both deleted with this commit.
      try { localStorage.setItem('dreamvalley_pending_username', username.trim()); } catch {}
      setLang('en');
      dvAnalytics.track('onboarding_complete', { childAge: childAge, username: username.trim() });
      router.push('/login');
    } catch (err) {
      setError(t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StarField />
      <div className={styles.wrapper}>
        <form className={styles.slide} onSubmit={handleGetStarted}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-new.png" alt="Dream Valley" className={styles.logoImageSmall} />
          <p className={styles.subtitle}>
            Where magical bedtime stories come alive
          </p>

          <div className={styles.ageSection}>
            <p className={styles.ageLabel}>How old is your little one? <span className={styles.optional}>(optional)</span></p>
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
            <p className={styles.ageLabel}>{t('loginTitle')}</p>
            <p className={styles.usernameHint}>{t('loginSubtitle')}</p>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <input
              type="text"
              placeholder={t('loginPlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={styles.usernameInput}
              autoFocus
              disabled={loading}
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className={styles.startBtn}
          >
            {loading ? `✨ ${t('loginLoading')}` : t('getStarted')}
          </button>
        </form>
      </div>
    </>
  );
}
