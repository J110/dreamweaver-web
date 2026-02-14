'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { VOICES, getVoicesForGender, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const { setVoicePrefs } = useVoicePreferences();
  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState(null);

  // Voice preview state (step 3)
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);

  // Voice selection state (step 4)
  const [preferredGender, setPreferredGender] = useState(null);
  const [primaryVoice, setPrimaryVoice] = useState(null);
  const [secondaryVoice, setSecondaryVoice] = useState(null);
  const [alternateVoice, setAlternateVoice] = useState(null);

  // The effective language for voice labels (set after step 2)
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
    // If same voice is playing, stop it
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

  const handleContinue = () => {
    if (step < 2) {
      setStep(step + 1);
    } else if (step === 2 && selectedLang) {
      // Language selected, move to voice preview
      setLang(selectedLang);
      setStep(3);
    } else if (step === 3) {
      // Voice preview done, move to selection
      stopAudio();
      setStep(4);
    } else if (step === 4 && primaryVoice && secondaryVoice && alternateVoice) {
      // Save voice preferences and navigate
      stopAudio();
      setVoicePrefs({
        preferredGender,
        primaryVoice,
        secondaryVoice,
        alternateVoice,
      });
      router.push('/login');
    }
  };

  const handleGenderSelect = (gender) => {
    setPreferredGender(gender);
    // Reset voice selections when gender changes
    setPrimaryVoice(null);
    setSecondaryVoice(null);
    setAlternateVoice(null);
  };

  const handlePrimaryGenderVoiceSelect = (voiceId) => {
    if (!primaryVoice) {
      setPrimaryVoice(voiceId);
    } else if (primaryVoice === voiceId) {
      // Deselect
      setPrimaryVoice(secondaryVoice);
      setSecondaryVoice(null);
    } else if (!secondaryVoice) {
      setSecondaryVoice(voiceId);
    } else if (secondaryVoice === voiceId) {
      setSecondaryVoice(null);
    } else {
      // Replace secondary
      setSecondaryVoice(voiceId);
    }
  };

  const handleAlternateVoiceSelect = (voiceId) => {
    setAlternateVoice(alternateVoice === voiceId ? null : voiceId);
  };

  const otherGender = preferredGender === 'female' ? 'male' : 'female';

  // Can proceed from step 4?
  const step4Complete = primaryVoice && secondaryVoice && alternateVoice;

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

        {/* Step 3: Voice Preview */}
        {step === 3 && (
          <div className={styles.slide}>
            <div className={styles.iconLarge}>🎙️</div>
            <h1 className={styles.title}>{t('voicePreviewTitle')}</h1>
            <p className={styles.subtitle}>{t('voicePreviewSubtitle')}</p>

            <div className={styles.voicePreviewSections}>
              {/* Female voices */}
              <div className={styles.voiceSection}>
                <span className={styles.voiceSectionLabel}>{t('femaleNarrators')}</span>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender('female').map(([id, meta]) => (
                    <button
                      key={id}
                      onClick={() => playVoiceSample(id)}
                      className={`${styles.voiceCard} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
                    >
                      <span className={styles.voiceCardIcon}>{meta.icon}</span>
                      <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                      <span className={styles.voiceCardAction}>
                        {playingVoice === id ? '⏸' : '▶'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Male voices */}
              <div className={styles.voiceSection}>
                <span className={styles.voiceSectionLabel}>{t('maleNarrators')}</span>
                <div className={styles.voiceGrid}>
                  {getVoicesForGender('male').map(([id, meta]) => (
                    <button
                      key={id}
                      onClick={() => playVoiceSample(id)}
                      className={`${styles.voiceCard} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
                    >
                      <span className={styles.voiceCardIcon}>{meta.icon}</span>
                      <span className={styles.voiceCardName}>{getVoiceLabel(id, voiceLang)}</span>
                      <span className={styles.voiceCardAction}>
                        {playingVoice === id ? '⏸' : '▶'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleContinue} className={styles.nextBtn}>
              {voiceLang === 'hi' ? 'Aage Badhein' : 'Next'}
            </button>
          </div>
        )}

        {/* Step 4: Voice Selection */}
        {step === 4 && (
          <div className={styles.slide}>
            <h1 className={styles.title}>{t('voiceSelectTitle')}</h1>

            {/* Sub-step A: Gender preference */}
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

            {/* Sub-step B: Primary + secondary for preferred gender */}
            {preferredGender && (
              <>
                <p className={styles.subStepLabel}>{t('pickPrimary')}</p>
                <div className={styles.voicePickGrid}>
                  {getVoicesForGender(preferredGender).map(([id, meta]) => {
                    const isPrimary = primaryVoice === id;
                    const isSecondary = secondaryVoice === id;
                    const isSelected = isPrimary || isSecondary;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          handlePrimaryGenderVoiceSelect(id);
                          playVoiceSample(id);
                        }}
                        className={`${styles.voicePickCard} ${isSelected ? styles.voicePickCardActive : ''}`}
                      >
                        {isPrimary && <span className={styles.voiceRank}>{t('primaryBadge')}</span>}
                        {isSecondary && <span className={styles.voiceRankSecondary}>{t('secondaryBadge')}</span>}
                        <span className={styles.voicePickIcon}>{meta.icon}</span>
                        <span className={styles.voicePickName}>{getVoiceLabel(id, voiceLang)}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Sub-step C: Alternate voice (other gender) */}
            {primaryVoice && secondaryVoice && (
              <>
                <p className={styles.subStepLabel}>{t('pickAlternate')}</p>
                <div className={styles.voicePickGrid}>
                  {getVoicesForGender(otherGender).map(([id, meta]) => {
                    const isAlt = alternateVoice === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          handleAlternateVoiceSelect(id);
                          playVoiceSample(id);
                        }}
                        className={`${styles.voicePickCard} ${isAlt ? styles.voicePickCardActive : ''}`}
                      >
                        {isAlt && <span className={styles.voiceRankAlt}>{t('alternateBadge')}</span>}
                        <span className={styles.voicePickIcon}>{meta.icon}</span>
                        <span className={styles.voicePickName}>{getVoiceLabel(id, voiceLang)}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              onClick={handleContinue}
              disabled={!step4Complete}
              className={styles.startBtn}
            >
              {voiceLang === 'hi' ? 'Shuru Karein' : t('getStarted')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
