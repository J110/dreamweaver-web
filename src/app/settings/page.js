'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { getSelectableVoices, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { voicePrefs, setVoicePrefs } = useVoicePreferences();

  const [selectedVoice, setSelectedVoice] = useState(voicePrefs?.preferredVoice || 'female_1');
  const [saved, setSaved] = useState(false);

  // Sync when voicePrefs loads from localStorage
  useEffect(() => {
    if (voicePrefs?.preferredVoice) setSelectedVoice(voicePrefs.preferredVoice);
  }, [voicePrefs?.preferredVoice]);

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

  const handleVoiceSelect = (voiceId) => {
    playVoiceSample(voiceId);
    setSelectedVoice(voiceId);
  };

  const handleSave = () => {
    stopAudio();
    setVoicePrefs({ preferredVoice: selectedVoice });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'अपनी आवाज़ चुनें' : 'Choose Your Narrator'}
          </h2>
          <div className={styles.voiceGrid}>
            {getSelectableVoices().map(([id, meta]) => (
              <button
                key={id}
                onClick={() => handleVoiceSelect(id)}
                className={`${styles.voiceCard} ${selectedVoice === id ? styles.voiceCardActive : ''} ${playingVoice === id ? styles.voiceCardPlaying : ''}`}
              >
                <span className={styles.voiceIcon}>{meta.icon}</span>
                <span className={styles.voiceName}>{getVoiceLabel(id, lang)}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} className={styles.saveBtn}>
          {saved
            ? (lang === 'hi' ? 'Save ho gaya ✓' : 'Saved ✓')
            : (lang === 'hi' ? 'Save Karein' : 'Save Preferences')
          }
        </button>

        <div className={styles.linksSection}>
          <h2 className={styles.sectionTitle}>
            {lang === 'hi' ? 'Dream Valley के बारे में' : 'About Dream Valley'}
          </h2>
          <div className={styles.linksList}>
            <Link href="/how-it-works" className={styles.linkItem}>
              <span className={styles.linkIcon}>🧠</span>
              <span className={styles.linkText}>{lang === 'hi' ? 'यह कैसे काम करता है' : 'How It Works'}</span>
              <span className={styles.linkArrow}>→</span>
            </Link>
            <Link href="/about" className={styles.linkItem}>
              <span className={styles.linkIcon}>💜</span>
              <span className={styles.linkText}>{lang === 'hi' ? 'हमारे बारे में' : 'About Us'}</span>
              <span className={styles.linkArrow}>→</span>
            </Link>
            <Link href="/support" className={styles.linkItem}>
              <span className={styles.linkIcon}>💬</span>
              <span className={styles.linkText}>{lang === 'hi' ? 'सहायता' : 'Support'}</span>
              <span className={styles.linkArrow}>→</span>
            </Link>
            <Link href="/privacy" className={styles.linkItem}>
              <span className={styles.linkIcon}>🔒</span>
              <span className={styles.linkText}>{lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}</span>
              <span className={styles.linkArrow}>→</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
