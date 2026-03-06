'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import { isLoggedIn, getUser, logout } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { getSelectableVoices, getSampleUrl, getVoiceLabel } from '@/utils/voiceConfig';
import styles from './page.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { voicePrefs, setVoicePrefs } = useVoicePreferences();
  const [user, setUser] = useState(null);

  // Voice editing state
  const [editingVoice, setEditingVoice] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voicePrefs?.preferredVoice || 'female_1');
  const [saved, setSaved] = useState(false);

  // Audio preview
  const [playingVoice, setPlayingVoice] = useState(null);
  const audioRef = useRef(null);

  // Sync editing state when prefs load
  useEffect(() => {
    if (voicePrefs) {
      setSelectedVoice(voicePrefs.preferredVoice || 'female_1');
    }
  }, [voicePrefs]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login');
      return;
    }
    setUser(getUser());
  }, [router]);

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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleVoiceSelect = (voiceId) => {
    playVoiceSample(voiceId);
    setSelectedVoice(voiceId);
  };

  const handleSaveVoice = () => {
    stopAudio();
    setVoicePrefs({ preferredVoice: selectedVoice });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const appName = 'Dream Valley';

  if (!user) return null;

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('profileTitle')}</h1>
        </div>

        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            {user.username?.charAt(0).toUpperCase() || '🌙'}
          </div>
          <h2 className={styles.username}>{user.username}</h2>
          <p className={styles.appLabel}>{appName}</p>
        </div>

        <div className={styles.settings}>
          {/* Voice Settings — inline collapsible */}
          <div className={styles.voiceSettingsCard}>
            <button
              onClick={() => setEditingVoice(!editingVoice)}
              className={styles.voiceSettingsHeader}
            >
              <div className={styles.settingLabel}>
                🎙️ {t('voiceSettings')}
              </div>
              <span className={`${styles.voiceChevron} ${editingVoice ? styles.voiceChevronOpen : ''}`}>
                ▾
              </span>
            </button>

            {editingVoice && (
              <div className={styles.voiceSettingsBody}>
                <p className={styles.voiceDesc}>{t('voiceSettingsDesc')}</p>

                <div className={styles.voiceSection}>
                  <h3 className={styles.voiceSectionTitle}>
                    {lang === 'hi' ? 'अपनी आवाज़ चुनें' : 'Choose Your Narrator'}
                  </h3>
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

                <button onClick={handleSaveVoice} className={styles.saveVoiceBtn}>
                  {saved ? 'Saved ✓' : 'Save Preferences'}
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            {t('profileLogout')}
          </button>
        </div>
      </div>
    </>
  );
}
