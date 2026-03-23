'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { dvAnalytics } from '@/utils/analytics';
import styles from './page.module.css';

const TOTAL_STEPS = 2;

export default function OnboardingPage() {
  const router = useRouter();
  const { setLang, t } = useI18n();
  const [step, setStep] = useState(0);

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setLang('en');
      dvAnalytics.track('onboarding_complete');
      router.push('/login');
    }
  };

  return (
    <>
      <StarField />
      <div className={styles.wrapper}>
        {/* Step indicators */}
        <div className={styles.dots}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${step === i ? styles.dotActive : ''} ${step > i ? styles.dotDone : ''}`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className={styles.slide}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-new.png" alt="Dream Valley" className={styles.logoImage} />
            <p className={styles.subtitle}>
              Where magical bedtime stories come alive
            </p>
            <p className={styles.description}>
              Beautiful stories, poems & songs to help your little ones drift off to dreamland
            </p>
            <button onClick={handleContinue} className={styles.nextBtn}>
              Next
            </button>
          </div>
        )}

        {/* Step 1: Stories Preview */}
        {step === 1 && (
          <div className={styles.slide}>
            <div className={styles.iconLarge}>✨</div>
            <h1 className={styles.title}>Short Stories for Every Night</h1>
            <p className={styles.subtitle}>
              Fantasy, Adventure, Space, Animals & more
            </p>
            <div className={styles.themePreview}>
              <span>🧙</span>
              <span>🚀</span>
              <span>🦁</span>
              <span>🐚</span>
              <span>🌲</span>
              <span>👫</span>
            </div>
            <button onClick={handleContinue} className={styles.startBtn}>
              {t('getStarted')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
