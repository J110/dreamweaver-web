'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import StarField from '@/components/StarField';
import { funnyShortsApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

const CHARACTER_EMOJIS = {
  high_pitch_cartoon: '🐭',
  comedic_villain: '🐊',
  young_sweet: '😏',
  mysterious_witch: '🧙‍♀️',
  musical_original: '🎵',
};

function getVoiceEmojis(voices) {
  return (voices || []).map((v) => CHARACTER_EMOJIS[v] || '🎭').join('');
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const AGE_GROUPS = ['2-5', '6-8', '9-12'];

function BeforeBedContent() {
  const { t } = useI18n();
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [ageGroup, setAgeGroup] = useState(null);
  const audioRef = useRef(null);
  const sessionPlayed = useRef(new Set());

  // Get child's age group from localStorage
  const getDefaultAgeGroup = () => {
    if (typeof window === 'undefined') return '6-8';
    try {
      const user = JSON.parse(localStorage.getItem('dreamweaver_user') || '{}');
      const age = user.child_age || 6;
      if (age <= 5) return '2-5';
      if (age <= 8) return '6-8';
      return '9-12';
    } catch {
      return '6-8';
    }
  };

  const loadShorts = useCallback(async (group) => {
    setLoading(true);
    try {
      const result = await funnyShortsApi.list(group);
      setShorts(result);
    } catch (err) {
      console.error('Failed to load funny shorts:', err);
      setShorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const defaultGroup = getDefaultAgeGroup();
    setAgeGroup(defaultGroup);
    loadShorts(defaultGroup);
  }, [loadShorts]);

  const handleAgeChange = (group) => {
    if (group === ageGroup) return;
    // Stop current audio when switching
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setProgress(0);
    setAgeGroup(group);
    loadShorts(group);
  };

  const handlePlay = useCallback((short) => {
    if (!short.audio_file) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // If already playing this short, toggle pause/play
    if (playingId === short.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`${API_URL}/audio/funny-shorts/${short.audio_file}`);
    audioRef.current = audio;
    setPlayingId(short.id);
    setProgress(0);

    // Track play vs replay
    const isReplay = sessionPlayed.current.has(short.id);
    if (isReplay) {
      funnyShortsApi.replay(short.id).catch(() => {});
    } else {
      funnyShortsApi.play(short.id).catch(() => {});
      sessionPlayed.current.add(short.id);
    }

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setProgress(0);
    });

    audio.addEventListener('error', () => {
      setPlayingId(null);
      setProgress(0);
    });

    audio.play().catch(() => {
      setPlayingId(null);
    });
  }, [playingId]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playingShort = shorts.find((s) => s.id === playingId);

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('beforeBedTitle')}</h1>
        <p className={styles.subtitle}>Funny shorts to enjoy before sleep</p>
        <div className={styles.agePills}>
          {AGE_GROUPS.map((group) => (
            <button
              key={group}
              className={`${styles.agePill} ${ageGroup === group ? styles.agePillActive : ''}`}
              onClick={() => handleAgeChange(group)}
            >
              Ages {group}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingMsg}>{t('loading')}</div>
      ) : shorts.length > 0 ? (
        <div className={styles.grid}>
          {shorts.map((short) => (
            <div
              key={short.id}
              className={`${styles.card} ${playingId === short.id ? styles.cardPlaying : ''}`}
              onClick={() => handlePlay(short)}
            >
              {short.cover_file ? (
                <div className={styles.cardCover}>
                  <object
                    data={`/covers/funny-shorts/${short.cover_file}`}
                    type="image/svg+xml"
                    className={styles.cardCoverImg}
                    aria-label={short.title}
                  >
                    <div className={styles.cardEmojis}>{getVoiceEmojis(short.voices)}</div>
                  </object>
                </div>
              ) : (
                <div className={styles.cardEmojis}>{getVoiceEmojis(short.voices)}</div>
              )}
              <div className={styles.cardTitle}>{short.title}</div>
              <div className={styles.cardMeta}>
                <span className={styles.cardDuration}>
                  {formatDuration(short.duration_seconds)}
                </span>
                <button
                  className={styles.playBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(short);
                  }}
                >
                  {playingId === short.id ? '⏸' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyMsg}>
          <div className={styles.emptyIcon}>🌙</div>
          <p>{t('beforeBedEmpty')}</p>
        </div>
      )}

      {/* Mini player */}
      {playingShort && (
        <div className={styles.miniPlayer}>
          <div className={styles.miniPlayerInner}>
            <span className={styles.miniPlayerEmoji}>
              {getVoiceEmojis(playingShort.voices)}
            </span>
            <span className={styles.miniPlayerTitle}>{playingShort.title}</span>
            <button className={styles.miniPlayerBtn} onClick={handleStop}>
              ⏹
            </button>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BeforeBedPage() {
  return (
    <>
      <StarField />
      <BeforeBedContent />
    </>
  );
}
