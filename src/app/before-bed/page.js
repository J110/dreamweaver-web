'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import StarField from '@/components/StarField';
import { funnyShortsApi, sillySongsApi } from '@/utils/api';
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

function isAddedToday(createdAt) {
  if (!createdAt) return false;
  const today = new Date().toISOString().slice(0, 10);
  return createdAt.slice(0, 10) === today;
}

function BeforeBedContent() {
  const { t } = useI18n();
  const [shorts, setShorts] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [playingType, setPlayingType] = useState(null); // 'short' or 'song'
  const [progress, setProgress] = useState(0);
  const [ageGroup, setAgeGroup] = useState(null);
  const audioRef = useRef(null);
  const sessionPlayed = useRef(new Set());

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

  const loadContent = useCallback(async (group) => {
    setLoading(true);
    try {
      const [shortsResult, songsResult] = await Promise.all([
        funnyShortsApi.list(group).catch(() => []),
        sillySongsApi.list(group).catch(() => []),
      ]);
      setShorts(shortsResult);
      setSongs(songsResult);
    } catch (err) {
      console.error('Failed to load before bed content:', err);
      setShorts([]);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const defaultGroup = getDefaultAgeGroup();
    setAgeGroup(defaultGroup);
    loadContent(defaultGroup);
  }, [loadContent]);

  const handleAgeChange = (group) => {
    if (group === ageGroup) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setPlayingType(null);
    setProgress(0);
    setAgeGroup(group);
    loadContent(group);
  };

  const handlePlayShort = useCallback((short) => {
    if (!short.audio_file) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    if (playingId === short.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`${API_URL}/audio/funny-shorts/${short.audio_file}`);
    audioRef.current = audio;
    setPlayingId(short.id);
    setPlayingType('short');
    setProgress(0);

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
      setPlayingType(null);
      setProgress(0);
    });
    audio.addEventListener('error', () => {
      setPlayingId(null);
      setPlayingType(null);
      setProgress(0);
    });
    audio.play().catch(() => {
      setPlayingId(null);
      setPlayingType(null);
    });
  }, [playingId]);

  const handlePlaySong = useCallback((song) => {
    if (!song.audio_file) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    if (playingId === song.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(`${API_URL}/audio/silly-songs/${song.audio_file}`);
    audioRef.current = audio;
    setPlayingId(song.id);
    setPlayingType('song');
    setProgress(0);

    const isReplay = sessionPlayed.current.has(song.id);
    if (isReplay) {
      sillySongsApi.replay(song.id).catch(() => {});
    } else {
      sillySongsApi.play(song.id).catch(() => {});
      sessionPlayed.current.add(song.id);
    }

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    });
    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setPlayingType(null);
      setProgress(0);
    });
    audio.addEventListener('error', () => {
      setPlayingId(null);
      setPlayingType(null);
      setProgress(0);
    });
    audio.play().catch(() => {
      setPlayingId(null);
      setPlayingType(null);
    });
  }, [playingId]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
    setPlayingType(null);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playingShort = shorts.find((s) => s.id === playingId);
  const playingSong = songs.find((s) => s.id === playingId);
  const playingItem = playingShort || playingSong;

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('beforeBedTitle')}</h1>
        <p className={styles.subtitle}>Funny shorts & silly songs before sleep</p>
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
      ) : (
        <>
          {/* Funny Shorts Section */}
          {shorts.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>😂 Funny Shorts</h2>
              <div className={styles.horizontalScroll}>
                {shorts.map((short) => (
                  <div key={short.id} className={styles.cardWrapper}>
                    <div
                      className={`${styles.card} ${playingId === short.id ? styles.cardPlaying : ''}`}
                      onClick={() => handlePlayShort(short)}
                    >
                      {isAddedToday(short.created_at) && (
                        <span className={styles.newBadge}>NEW</span>
                      )}
                      {short.cover_file ? (
                        <div className={styles.cardCover}>
                          {short.cover_file.endsWith('.svg') ? (
                            <object
                              data={`/covers/funny-shorts/${short.cover_file}`}
                              type="image/svg+xml"
                              className={styles.cardCoverImg}
                              aria-label={short.title}
                            >
                              <div className={styles.cardEmojis}>{getVoiceEmojis(short.voices)}</div>
                            </object>
                          ) : (
                            <img
                              src={`/covers/funny-shorts/${short.cover_file}`}
                              className={styles.cardCoverImg}
                              alt={short.title}
                            />
                          )}
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
                            handlePlayShort(short);
                          }}
                        >
                          {playingId === short.id ? '⏸' : '▶'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Silly Songs Section */}
          {songs.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>🎵 Silly Songs</h2>
              <div className={styles.horizontalScroll}>
                {songs.map((song) => (
                  <div key={song.id} className={styles.cardWrapper}>
                    <div
                      className={`${styles.card} ${playingId === song.id ? styles.cardPlaying : ''}`}
                      onClick={() => handlePlaySong(song)}
                    >
                      {isAddedToday(song.created_at) && (
                        <span className={styles.newBadge}>NEW</span>
                      )}
                      {song.cover_file ? (
                        <div className={styles.cardCover}>
                          <img
                            src={`/covers/silly-songs/${song.cover_file}`}
                            className={styles.cardCoverImg}
                            alt={song.title}
                          />
                        </div>
                      ) : (
                        <div className={styles.cardEmojis}>🎵</div>
                      )}
                      <div className={styles.cardTitle}>{song.title}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDuration}>
                          {formatDuration(song.duration_seconds)}
                        </span>
                        <button
                          className={styles.playBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaySong(song);
                          }}
                        >
                          {playingId === song.id ? '⏸' : '▶'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {shorts.length === 0 && songs.length === 0 && (
            <div className={styles.emptyMsg}>
              <div className={styles.emptyIcon}>🌙</div>
              <p>{t('beforeBedEmpty')}</p>
            </div>
          )}
        </>
      )}

      {/* Mini player */}
      {playingItem && (
        <div className={styles.miniPlayer}>
          <div className={styles.miniPlayerInner}>
            <span className={styles.miniPlayerEmoji}>
              {playingType === 'song' ? '🎵' : getVoiceEmojis(playingItem.voices)}
            </span>
            <span className={styles.miniPlayerTitle}>{playingItem.title}</span>
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
