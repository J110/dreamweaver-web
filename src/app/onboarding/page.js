'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { setLang } = useI18n();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(null);

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    } else if (selectedLang) {
      setLang(selectedLang);
      router.push('/login');
    }
  };

  return (
    <>
      <StarField />
      <div className={styles.wrapper}>
        {/* Step indicators */}
        <div className={styles.dots}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${styles.dot} ${step === i ? styles.dotActive : ''} ${step > i ? styles.dotDone : ''}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className={styles.slide}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-new.svg" alt="Dream Valley" className={styles.logoImage} />
            <h1 className={styles.title}>Dream Valley</h1>
            <p className={styles.subtitle}>
              Where magical bedtime stories come alive
            </p>
            <p className={styles.description}>
              Beautiful stories, poems & songs to help your little ones drift off to dreamland
            </p>
            <button onClick={handleContinue} className={styles.nextBtn}>
              Next →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={styles.slide}>
            <div className={styles.iconLarge}>✨</div>
            <h1 className={styles.title}>Stories for Every Night</h1>
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
            <button onClick={handleContinue} className={styles.nextBtn}>
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.slide}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedLang === 'hi' ? '/logo-hi.svg' : '/logo-new.svg'}
              alt={selectedLang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley'}
              className={styles.logoImageSmall}
            />
            <h1 className={styles.title}>Choose Your Language</h1>
            <p className={styles.subtitle}>Apni bhasha chuniye</p>

            <div className={styles.langOptions}>
              <button
                onClick={() => setSelectedLang('en')}
                className={`${styles.langCard} ${selectedLang === 'en' ? styles.langCardActive : ''}`}
              >
                <span className={styles.langFlag}>🇬🇧</span>
                <span className={styles.langName}>English</span>
                <span className={styles.langSample}>Dream Valley</span>
              </button>

              <button
                onClick={() => setSelectedLang('hi')}
                className={`${styles.langCard} ${selectedLang === 'hi' ? styles.langCardActive : ''}`}
              >
                <span className={styles.langFlag}>🇮🇳</span>
                <span className={styles.langName}>Hindi</span>
                <span className={styles.langSample}>Sapno ki Duniya</span>
              </button>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedLang}
              className={styles.startBtn}
            >
              {selectedLang === 'hi' ? 'Shuru Karein →' : 'Get Started →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
