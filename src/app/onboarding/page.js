'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { getSelectableVoices, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import { dvAnalytics } from '@/utils/analytics';
import styles from './page.module.css';

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const { setLang, t } = useI18n();
  const { setVoicePrefs } = useVoicePreferences();
  const [step, setStep] = useState(0);

  // Voice state (step 2)
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(null);

  const voiceLang = 'en';

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingVoice(null);
  }, []);

  const playVoiceSample = useCallback((voiceId) => {
    if (playingVoice === voiceId) {
      stopAudio();
      return;
    }
    stopAudio();
    const url = getSampleUrl(voiceId, voiceLang);
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingVoice(voiceId);
    audio.play().catch(() => setPlayingVoice(null));
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
  }, [playingVoice, voiceLang, stopAudio]);

  const handleVoiceSelect = (voiceId) => {
    playVoiceSample(voiceId);
    setSelectedVoice(voiceId);
  };

  const handleContinue = () => {
    if (step < 1) {
      setStep(step + 1);
    } else if (step === 1) {
      // Skip language selection — force English
      setLang('en');
      setStep(2);
    } else if (step === 2) {
      stopAudio();
      setVoicePrefs({ preferredVoice: selectedVoice });
      dvAnalytics.track('onboarding_complete', { voice: selectedVoice });
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
            <button onClick={handleContinue} className={styles.nextBtn}>
              Next
            </button>
          </div>
        )}

        {/* Step 2: Voice Selection */}
        {step === 2 && (
          <div className={`${styles.slide} ${styles.slideWide}`}>
            <div className={styles.iconLarge} style={{ fontSize: '48px', marginBottom: '8px' }}>🎙️</div>
            <h1 className={styles.title} style={{ fontSize: '24px' }}>{t('voicePreviewTitle')}</h1>
            <p className={styles.subtitle} style={{ marginBottom: '16px' }}>{t('voicePreviewSubtitle')}</p>

            <div className={styles.voiceGrid}>
              {getSelectableVoices().map(([id, meta]) => {
                const isActive = selectedVoice === id;
                const isPlaying = playingVoice === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleVoiceSelect(id)}
                    className={`${styles.voiceCard} ${isActive ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                  >
                    <span className={styles.voiceCardIcon}>{meta.icon}</span>
                    <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                    <span className={styles.voiceCardAction}>{isPlaying ? '⏸' : '▶'}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleContinue}
              className={styles.startBtn}
              disabled={!selectedVoice}
            >
              {t('getStarted')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
