'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { VOICES, getVoicesForGender, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

const TOTAL_STEPS = 3; // Hindi hidden for now — lang step skipped

export default function OnboardingPage() {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { setVoicePrefs } = useVoicePreferences();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en'); // Hindi hidden for now

  // Voice state (step 3 — single combined page)
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);
  const [preferredGender, setPreferredGender] = useState(null);
  const [primaryVoice, setPrimaryVoice] = useState(null);
  const [secondaryVoice, setSecondaryVoice] = useState(null);
  const [alternateVoice, setAlternateVoice] = useState(null);

  const voiceLang = selectedLang || 'en';

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

  // Handle gender selection (same as settings page)
  const handleGenderSelect = (gender) => {
    if (preferredGender === gender) return;
    setPreferredGender(gender);
    // Reset selections for the new gender
    const voices = getVoicesForGender(gender);
    if (voices.length >= 2) {
      setPrimaryVoice(voices[0][0]);
      setSecondaryVoice(voices[1][0]);
    }
    // Reset alternate to first of other gender
    const otherVoices = getVoicesForGender(gender === 'female' ? 'male' : 'female');
    if (otherVoices.length > 0) {
      setAlternateVoice(otherVoices[0][0]);
    }
  };

  // Handle primary voice selection (same as settings page)
  const handlePrimarySelect = (voiceId) => {
    playVoiceSample(voiceId);
    if (primaryVoice === voiceId) return;
    if (secondaryVoice === voiceId) {
      setSecondaryVoice(primaryVoice);
    }
    setPrimaryVoice(voiceId);
  };

  // Handle secondary voice selection (same as settings page)
  const handleSecondarySelect = (voiceId) => {
    playVoiceSample(voiceId);
    if (secondaryVoice === voiceId) return;
    if (primaryVoice === voiceId) {
      setPrimaryVoice(secondaryVoice);
    }
    setSecondaryVoice(voiceId);
  };

  // Handle alternate voice selection (same as settings page)
  const handleAlternateSelect = (voiceId) => {
    playVoiceSample(voiceId);
    setAlternateVoice(voiceId);
  };

  const handleContinue = () => {
    if (step < 1) {
      setStep(step + 1);
    } else if (step === 1) {
      // Skip language selection — force English
      setLang('en');
      setStep(2);
    } else if (step === 2) {
      // Gender selection auto-picks defaults, so voices are always complete
      stopAudio();
      setVoicePrefs({ preferredGender, primaryVoice, secondaryVoice, alternateVoice });
      router.push('/login');
    }
  };

  const otherGender = preferredGender === 'female' ? 'male' : 'female';

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
              Next
            </button>
          </div>
        )}

        {/* Step 2: Voice Selection (matches settings page layout) */}
        {/* Language selection step hidden — Hindi content temporarily disabled */}
        {step === 2 && (
          <div className={`${styles.slide} ${styles.slideWide}`}>
            <div className={styles.iconLarge} style={{ fontSize: '48px', marginBottom: '8px' }}>🎙️</div>
            <h1 className={styles.title} style={{ fontSize: '24px' }}>{t('voicePreviewTitle')}</h1>
            <p className={styles.subtitle} style={{ marginBottom: '12px' }}>{t('voicePreviewSubtitle')}</p>

            {/* Gender Preference */}
            <p className={styles.subStepLabel}>{t('genderPrefer')}</p>
            <div className={styles.genderRow}>
              <button
                onClick={() => handleGenderSelect('female')}
                className={`${styles.genderCard} ${preferredGender === 'female' ? styles.genderCardActive : ''}`}
              >
                <span className={styles.genderIcon}>👩</span>
                <span className={styles.genderName}>{t('femaleNarrators')}</span>
              </button>
              <button
                onClick={() => handleGenderSelect('male')}
                className={`${styles.genderCard} ${preferredGender === 'male' ? styles.genderCardActive : ''}`}
              >
                <span className={styles.genderIcon}>👨</span>
                <span className={styles.genderName}>{t('maleNarrators')}</span>
              </button>
            </div>

            {/* Primary Voice */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>Primary Voice</p>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender(preferredGender).map(([id, meta]) => {
                    const isActive = primaryVoice === id;
                    const isPlaying = playingVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handlePrimarySelect(id)}
                        className={`${styles.voiceCard} ${isActive ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                      >
                        {isActive && <span className={styles.voiceRank}>{t('primaryBadge')}</span>}
                        <span className={styles.voiceCardIcon}>{meta.icon}</span>
                        <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                        <span className={styles.voiceCardAction}>{isPlaying ? '⏸' : '▶'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Secondary Voice */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>Secondary Voice</p>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender(preferredGender).map(([id, meta]) => {
                    const isActive = secondaryVoice === id;
                    const isPlaying = playingVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleSecondarySelect(id)}
                        className={`${styles.voiceCard} ${isActive ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                      >
                        {isActive && <span className={styles.voiceRankSecondary}>{t('secondaryBadge')}</span>}
                        <span className={styles.voiceCardIcon}>{meta.icon}</span>
                        <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                        <span className={styles.voiceCardAction}>{isPlaying ? '⏸' : '▶'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Alternate Voice */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>Alternate Voice</p>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender(otherGender).map(([id, meta]) => {
                    const isActive = alternateVoice === id;
                    const isPlaying = playingVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleAlternateSelect(id)}
                        className={`${styles.voiceCard} ${isActive ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                      >
                        {isActive && <span className={styles.voiceRankAlt}>{t('alternateBadge')}</span>}
                        <span className={styles.voiceCardIcon}>{meta.icon}</span>
                        <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                        <span className={styles.voiceCardAction}>{isPlaying ? '⏸' : '▶'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              onClick={handleContinue}
              className={styles.startBtn}
              disabled={!preferredGender}
            >
              {t('getStarted')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
