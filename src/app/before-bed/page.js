'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import StarField from '@/components/StarField';
import { sillySongsApi, poemsApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import { dvAnalytics } from '@/utils/analytics';
import styles from './page.module.css';

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

function ShareBtn({ type, id, title }) {
  const [copied, setCopied] = useState(false);
  const url = `https://dreamvalley.app/before-bed/${type}/${id}`;

  const handleShare = async (e) => {
    e.stopPropagation();
    dvAnalytics.track('share', { contentId: id, contentType: type, shareMethod: 'before-bed' });

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch { /* user cancelled or not supported — fall through to clipboard */ }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      className={styles.shareBtn}
      onClick={handleShare}
      title="Share"
      aria-label={`Share ${title}`}
    >
      {copied ? (
        <span className={styles.copiedText}>Copied!</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      )}
    </button>
  );
}

function BeforeBedContent() {
  const { t, lang } = useI18n();
  const [songs, setSongs] = useState([]);
  const [poems, setPoems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [playingType, setPlayingType] = useState(null); // 'song' or 'poem'
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

  const loadContent = useCallback(async (group, currentLang) => {
    setLoading(true);
    try {
      const [songsResult, poemsResult] = await Promise.all([
        sillySongsApi.list(group, currentLang).catch(() => []),
        poemsApi.list(group, currentLang).catch(() => []),
      ]);
      setSongs(songsResult);
      setPoems(poemsResult);
    } catch (err) {
      console.error('Failed to load before bed content:', err);
      setSongs([]);
      setPoems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const defaultGroup = getDefaultAgeGroup();
    setAgeGroup(defaultGroup);
    loadContent(defaultGroup, lang);
  }, [loadContent, lang]);

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
    loadContent(group, lang);
  };

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

  const handlePlayPoem = useCallback((poem) => {
    if (!poem.audio_file) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    if (playingId === poem.id && audioRef.current) {
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

    const audio = new Audio(`${API_URL}/audio/poems/${poem.audio_file}`);
    audioRef.current = audio;
    setPlayingId(poem.id);
    setPlayingType('poem');
    setProgress(0);

    const isReplay = sessionPlayed.current.has(poem.id);
    if (isReplay) {
      poemsApi.replay(poem.id).catch(() => {});
    } else {
      poemsApi.play(poem.id).catch(() => {});
      sessionPlayed.current.add(poem.id);
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

  const playingSong = songs.find((s) => s.id === playingId);
  const playingPoem = poems.find((p) => p.id === playingId);
  const playingItem = playingSong || playingPoem;

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('beforeBedTitle')}</h1>
        <p className={styles.subtitle}>Silly songs & musical poems before sleep</p>
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
                        <div className={styles.cardActions}>
                          <ShareBtn type="silly-songs" id={song.id} title={song.title} />
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
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Musical Poems Section */}
          {poems.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>✨ Musical Poems</h2>
              <div className={styles.horizontalScroll}>
                {poems.map((poem) => (
                  <div key={poem.id} className={styles.cardWrapper}>
                    <div
                      className={`${styles.card} ${playingId === poem.id ? styles.cardPlaying : ''}`}
                      onClick={() => handlePlayPoem(poem)}
                    >
                      {isAddedToday(poem.created_at) && (
                        <span className={styles.newBadge}>NEW</span>
                      )}
                      {poem.cover_file ? (
                        <div className={styles.cardCover}>
                          {poem.cover_file.endsWith('.svg') ? (
                            <object
                              data={`/covers/poems/${poem.cover_file}`}
                              type="image/svg+xml"
                              className={styles.cardCoverImg}
                              aria-label={poem.title}
                            >
                              <div className={styles.cardEmojis}>✨</div>
                            </object>
                          ) : (
                            <img
                              src={`/covers/poems/${poem.cover_file}`}
                              className={styles.cardCoverImg}
                              alt={poem.title}
                            />
                          )}
                        </div>
                      ) : (
                        <div className={styles.cardEmojis}>✨</div>
                      )}
                      <div className={styles.cardTitle}>{poem.title}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.cardDuration}>
                          {formatDuration(poem.duration_seconds)}
                        </span>
                        <div className={styles.cardActions}>
                          <ShareBtn type="poems" id={poem.id} title={poem.title} />
                          <button
                            className={styles.playBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPoem(poem);
                            }}
                          >
                            {playingId === poem.id ? '⏸' : '▶'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {songs.length === 0 && poems.length === 0 && (
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
              {playingType === 'poem' ? '✨' : '🎵'}
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
