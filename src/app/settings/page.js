'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { VOICES, getVoicesForGender, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { voicePrefs, setVoicePrefs, hasVoicePrefs } = useVoicePreferences();

  // Editable state initialized from saved prefs
  const [preferredGender, setPreferredGender] = useState(voicePrefs?.preferredGender || 'female');
  const [primaryVoice, setPrimaryVoice] = useState(voicePrefs?.primaryVoice || 'female_1');
  const [secondaryVoice, setSecondaryVoice] = useState(voicePrefs?.secondaryVoice || 'female_2');
  const [alternateVoice, setAlternateVoice] = useState(voicePrefs?.alternateVoice || 'male_1');
  const [saved, setSaved] = useState(false);

  // Audio preview
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);

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
    const url = getSampleUrl(voiceId, lang);
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingVoice(voiceId);
    audio.play().catch(() => setPlayingVoice(null));
    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);
  }, [playingVoice, lang, stopAudio]);

  const handleGenderChange = (gender) => {
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

  const handlePrimarySelect = (voiceId) => {
    if (primaryVoice === voiceId) return;
    if (secondaryVoice === voiceId) {
      setSecondaryVoice(primaryVoice);
    }
    setPrimaryVoice(voiceId);
  };

  const handleSecondarySelect = (voiceId) => {
    if (secondaryVoice === voiceId) return;
    if (primaryVoice === voiceId) {
      setPrimaryVoice(secondaryVoice);
    }
    setSecondaryVoice(voiceId);
  };

  const handleAlternateSelect = (voiceId) => {
    setAlternateVoice(voiceId);
  };

  const handleSave = () => {
    stopAudio();
    setVoicePrefs({
      preferredGender,
      primaryVoice,
      secondaryVoice,
      alternateVoice,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const otherGender = preferredGender === 'female' ? 'male' : 'female';
  const primaryGenderVoices = getVoicesForGender(preferredGender);
  const alternateGenderVoices = getVoicesForGender(otherGender);

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <div className={styles.header}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            ← {lang === 'hi' ? 'Wapas' : 'Back'}
          </button>
          <h1 className={styles.title}>{t('voiceSettings')}</h1>
        </div>

        <p className={styles.description}>{t('voiceSettingsDesc')}</p>

        {/* Gender Preference */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('genderPrefer')}</h2>
          <div className={styles.genderRow}>
            <button
              onClick={() => handleGenderChange('female')}
              className={`${styles.genderBtn} ${preferredGender === 'female' ? styles.genderBtnActive : ''}`}
            >
              👩 {t('femaleNarrators')}
            </button>
            <button
              onClick={() => handleGenderChange('male')}
              className={`${styles.genderBtn} ${preferredGender === 'male' ? styles.genderBtnActive : ''}`}
            >
              👨 {t('maleNarrators')}
            </button>
          </div>
        </div>

        {/* Primary Voice */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'प्राथमिक आवाज़' : 'Primary Voice'}
          </h2>
          <div className={styles.voiceGrid}>
            {primaryGenderVoices.map(([id, meta]) => (
              <button
                key={id}
                onClick={() => { handlePrimarySelect(id); playVoiceSample(id); }}
                className={`${styles.voiceCard} ${primaryVoice === id ? styles.voiceCardActive : ''} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
              >
                <span className={styles.voiceIcon}>{meta.icon}</span>
                <span className={styles.voiceName}>{getVoiceLabel(id, lang)}</span>
                {primaryVoice === id && <span className={styles.badge}>{t('primaryBadge')}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Voice */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'द्वितीय आवाज़' : 'Secondary Voice'}
          </h2>
          <div className={styles.voiceGrid}>
            {primaryGenderVoices.map(([id, meta]) => (
              <button
                key={id}
                onClick={() => { handleSecondarySelect(id); playVoiceSample(id); }}
                className={`${styles.voiceCard} ${secondaryVoice === id ? styles.voiceCardActive : ''} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
              >
                <span className={styles.voiceIcon}>{meta.icon}</span>
                <span className={styles.voiceName}>{getVoiceLabel(id, lang)}</span>
                {secondaryVoice === id && <span className={styles.badgeSecondary}>{t('secondaryBadge')}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Alternate Voice */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'वैकल्पिक आवाज़' : 'Alternate Voice'}
          </h2>
          <div className={styles.voiceGrid}>
            {alternateGenderVoices.map(([id, meta]) => (
              <button
                key={id}
                onClick={() => { handleAlternateSelect(id); playVoiceSample(id); }}
                className={`${styles.voiceCard} ${alternateVoice === id ? styles.voiceCardActive : ''} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
              >
                <span className={styles.voiceIcon}>{meta.icon}</span>
                <span className={styles.voiceName}>{getVoiceLabel(id, lang)}</span>
                {alternateVoice === id && <span className={styles.badgeAlt}>{t('alternateBadge')}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <button onClick={handleSave} className={styles.saveBtn}>
          {saved
            ? (lang === 'hi' ? 'Save ho gaya ✓' : 'Saved ✓')
            : (lang === 'hi' ? 'Save Karein' : 'Save Preferences')
          }
        </button>
      </div>
    </>
  );
}
