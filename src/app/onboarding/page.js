'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { VOICES, getVoicesForGender, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { setVoicePrefs } = useVoicePreferences();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(null);

  // Voice state (step 3 — single combined page)
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);
  const [preferredGender, setPreferredGender] = useState(null);
  const [primaryVoice, setPrimaryVoice] = useState(null);
  const [secondaryVoice, setSecondaryVoice] = useState(null);
  const [alternateVoice, setAlternateVoice] = useState(null);
  const [showSkipPrompt, setShowSkipPrompt] = useState(false);

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

  // Check if voice selection is complete
  const voiceSelectionComplete = primaryVoice && secondaryVoice && alternateVoice;

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    if (preferredGender === gender) return;
    setPreferredGender(gender);
    setPrimaryVoice(null);
    setSecondaryVoice(null);
    setAlternateVoice(null);
  };

  // Handle tapping a voice card in preferred gender section
  const handlePreferredVoiceTap = (voiceId) => {
    playVoiceSample(voiceId);
    if (!primaryVoice || primaryVoice === voiceId) {
      if (primaryVoice === voiceId) {
        setPrimaryVoice(secondaryVoice);
        setSecondaryVoice(null);
      } else {
        setPrimaryVoice(voiceId);
      }
    } else if (!secondaryVoice || secondaryVoice === voiceId) {
      if (secondaryVoice === voiceId) {
        setSecondaryVoice(null);
      } else {
        setSecondaryVoice(voiceId);
      }
    } else {
      setSecondaryVoice(voiceId);
    }
  };

  // Handle tapping a voice card in alternate gender section
  const handleAlternateVoiceTap = (voiceId) => {
    playVoiceSample(voiceId);
    setAlternateVoice(alternateVoice === voiceId ? null : voiceId);
  };

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    } else if (step === 2 && selectedLang) {
      setLang(selectedLang);
      setStep(3);
    } else if (step === 3) {
      if (voiceSelectionComplete) {
        stopAudio();
        setVoicePrefs({ preferredGender, primaryVoice, secondaryVoice, alternateVoice });
        router.push('/login');
      } else {
        setShowSkipPrompt(true);
      }
    }
  };

  const handleSkipConfirm = () => {
    stopAudio();
    const finalGender = preferredGender || 'female';
    const genderVoices = getVoicesForGender(finalGender).map(([id]) => id);
    const otherVoices = getVoicesForGender(finalGender === 'female' ? 'male' : 'female').map(([id]) => id);

    setVoicePrefs({
      preferredGender: finalGender,
      primaryVoice: primaryVoice || genderVoices[0],
      secondaryVoice: secondaryVoice || genderVoices[1] || genderVoices[0],
      alternateVoice: alternateVoice || otherVoices[0],
    });
    router.push('/login');
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
            <img src="/logo-new.svg" alt="Dream Valley" className={styles.logoImage} />
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

        {/* Step 2: Language Selection */}
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
              {selectedLang === 'hi' ? 'Aage Badhein' : 'Continue'}
            </button>
          </div>
        )}

        {/* Step 3: Voice Preview + Selection (single combined page) */}
        {step === 3 && (
          <div className={`${styles.slide} ${styles.slideWide}`}>
            <div className={styles.iconLarge} style={{ fontSize: '48px', marginBottom: '8px' }}>🎙️</div>
            <h1 className={styles.title} style={{ fontSize: '24px' }}>{t('voicePreviewTitle')}</h1>
            <p className={styles.subtitle} style={{ marginBottom: '12px' }}>{t('voicePreviewSubtitle')}</p>

            {/* Gender preference */}
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

            {/* Preferred gender voices */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>{t('pickPrimary')}</p>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender(preferredGender).map(([id, meta]) => {
                    const isPrimary = primaryVoice === id;
                    const isSecondary = secondaryVoice === id;
                    const isSelected = isPrimary || isSecondary;
                    const isPlaying = playingVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handlePreferredVoiceTap(id)}
                        className={`${styles.voiceCard} ${isSelected ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                      >
                        {isPrimary && <span className={styles.voiceRank}>{t('primaryBadge')}</span>}
                        {isSecondary && <span className={styles.voiceRankSecondary}>{t('secondaryBadge')}</span>}
                        <span className={styles.voiceCardIcon}>{meta.icon}</span>
                        <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                        <span className={styles.voiceCardAction}>
                          {isPlaying ? '⏸' : '▶'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Alternate gender voices */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>{t('pickAlternate')}</p>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender(otherGender).map(([id, meta]) => {
                    const isAlt = alternateVoice === id;
                    const isPlaying = playingVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleAlternateVoiceTap(id)}
                        className={`${styles.voiceCard} ${isAlt ? styles.voiceCardSelected : ''} ${isPlaying ? styles.voiceCardPlaying : ''}`}
                      >
                        {isAlt && <span className={styles.voiceRankAlt}>{t('alternateBadge')}</span>}
                        <span className={styles.voiceCardIcon}>{meta.icon}</span>
                        <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                        <span className={styles.voiceCardAction}>
                          {isPlaying ? '⏸' : '▶'}
                        </span>
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
              {voiceLang === 'hi' ? 'Shuru Karein' : t('getStarted')}
            </button>

            {/* Skip prompt modal */}
            {showSkipPrompt && (
              <div className={styles.skipOverlay} onClick={() => setShowSkipPrompt(false)}>
                <div className={styles.skipModal} onClick={(e) => e.stopPropagation()}>
                  <p className={styles.skipText}>
                    {voiceLang === 'hi'
                      ? 'Behtar anubhav ke liye, kripya apni pasandida gender se 2 awaazein aur doosri gender se 1 awaaz chunein.'
                      : 'For the best experience, please pick 2 voices from your preferred gender and 1 from the other.'}
                  </p>
                  <div className={styles.skipActions}>
                    <button onClick={() => setShowSkipPrompt(false)} className={styles.skipGoBack}>
                      {voiceLang === 'hi' ? 'Wapas Jaayein' : 'Go Back & Choose'}
                    </button>
                    <button onClick={handleSkipConfirm} className={styles.skipAnyway}>
                      {voiceLang === 'hi' ? 'Default se aage badhein' : 'Continue with defaults'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
