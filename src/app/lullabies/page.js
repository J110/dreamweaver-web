'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { lullabiesApi } from '@/utils/api';
import styles from './lullabies.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AGE_GROUPS = [
  { id: null, label: 'All' },
  { id: '0-1', label: '0-1 yrs' },
  { id: '2-5', label: '2-5 yrs' },
  { id: '6-8', label: '6-8 yrs' },
  { id: '9-12', label: '9-12 yrs' },
];

const MOODS = [
  { id: null, emoji: '✨', label: 'All' },
  { id: 'calm', emoji: '😌', label: 'Calm' },
  { id: 'wired', emoji: '⚡', label: 'Wired' },
  { id: 'curious', emoji: '🔍', label: 'Curious' },
  { id: 'sad', emoji: '💧', label: 'Sad' },
  { id: 'anxious', emoji: '🌀', label: 'Anxious' },
  { id: 'angry', emoji: '🔥', label: 'Angry' },
];

export default function LullabiesPage() {
  const [lullabies, setLullabies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null);
  const [progress, setProgress] = useState(0);
  const [activeAge, setActiveAge] = useState(null);
  const [activeMood, setActiveMood] = useState(null);
  const audioRef = useRef(null);

  const loadLullabies = useCallback(async (age, mood) => {
    setLoading(true);
    try {
      const items = await lullabiesApi.list(age, mood);
      setLullabies(items);
    } catch (err) {
      console.error('Failed to load lullabies:', err);
      // Fallback: direct fetch without auth
      try {
        const params = new URLSearchParams();
        if (age) params.append('age_group', age);
        if (mood) params.append('mood', mood);
        const query = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`${API_URL}/api/v1/lullabies${query}`);
        const data = await res.json();
        setLullabies(data.data?.items || []);
      } catch (e2) {
        console.error('Fallback fetch also failed:', e2);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLullabies(activeAge, activeMood);
  }, [activeAge, activeMood, loadLullabies]);

  const handleAgeChange = (ageId) => {
    if (ageId === activeAge) return;
    setActiveAge(ageId);
  };

  const handleMoodChange = (moodId) => {
    if (moodId === activeMood) return;
    setActiveMood(moodId);
  };

  const handlePlay = useCallback((lullaby) => {
    if (!lullaby.audio_file) return;

    // Toggle pause/play
    if (playing === lullaby.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`/audio/lullabies/${lullaby.audio_file}`);
    audioRef.current = audio;
    setPlaying(lullaby.id);
    setProgress(0);

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });

    audio.addEventListener('ended', () => {
      setPlaying(null);
      setProgress(0);
    });

    audio.play().catch((err) => {
      console.error('Play failed:', err);
      setPlaying(null);
    });
  }, [playing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatDuration = (secs) => {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lullabies</h1>
        <p className={styles.subtitle}>
          Gentle songs to help little ones drift off to sleep
        </p>
      </div>

      {/* Mood filter */}
      <div className={styles.filterRow}>
        {MOODS.map((m) => (
          <button
            key={m.id || 'all'}
            className={`${styles.filterBtn} ${activeMood === m.id ? styles.filterActive : ''}`}
            onClick={() => handleMoodChange(m.id)}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Age filter */}
      <div className={styles.filterRow}>
        {AGE_GROUPS.map((a) => (
          <button
            key={a.id || 'all'}
            className={`${styles.filterBtn} ${activeAge === a.id ? styles.filterActive : ''}`}
            onClick={() => handleAgeChange(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>
          <p>Loading lullabies...</p>
        </div>
      ) : lullabies.length === 0 ? (
        <div className={styles.empty}>
          <p>No lullabies match these filters</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {lullabies.map((lullaby) => (
            <div
              key={lullaby.id}
              className={`${styles.card} ${playing === lullaby.id ? styles.cardPlaying : ''}`}
              onClick={() => handlePlay(lullaby)}
            >
              <div className={styles.coverWrap}>
                <object
                  data={`/covers/lullabies/${lullaby.cover_file}`}
                  type="image/svg+xml"
                  className={styles.cover}
                  aria-label={lullaby.title}
                >
                  <div className={styles.coverFallback}>
                    <span>{lullaby.title?.[0] || '~'}</span>
                  </div>
                </object>
              </div>

              <div className={styles.info}>
                <h3 className={styles.cardTitle}>{lullaby.title}</h3>
                <p className={styles.cardSubtitle}>{lullaby.card_subtitle}</p>
                <div className={styles.meta}>
                  <span className={styles.badge}>{lullaby.lullaby_type}</span>
                  <span className={styles.badge}>{lullaby.age_group}</span>
                  {lullaby.mood && (
                    <span className={styles.badge}>{lullaby.mood}</span>
                  )}
                  <span className={styles.duration}>
                    {formatDuration(lullaby.duration_seconds)}
                  </span>
                </div>
                {/* Progress bar */}
                {playing === lullaby.id && (
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                className={`${styles.playBtn} ${playing === lullaby.id ? styles.playing : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(lullaby);
                }}
                aria-label={playing === lullaby.id ? 'Pause' : 'Play'}
              >
                {playing === lullaby.id ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
