'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import StarField from '@/components/StarField';
import { contentApi, interactionApi } from '@/utils/api';
import { getStories } from '@/utils/seedData';
import { getAmbientMusic } from '@/utils/ambientMusic';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useI18n();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [musicVolume, setMusicVolume] = useState(30);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const musicRef = useRef(null);
  const musicStartedRef = useRef(false);

  // Initialize music engine
  useEffect(() => {
    musicRef.current = getAmbientMusic();
    return () => {
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (musicRef.current) {
        musicRef.current.stop(true);
      }
    };
  }, []);

  // Auto-start music when content loads (needs user gesture for AudioContext)
  // We start music on first user interaction with the page
  useEffect(() => {
    if (!content?.musicProfile || musicStartedRef.current) return;

    const startMusic = () => {
      if (musicStartedRef.current) return;
      const profile = content.musicProfile;
      if (profile && musicRef.current) {
        musicRef.current.setVolume(musicVolume / 100);
        musicRef.current.play(profile);
        setMusicPlaying(true);
        musicStartedRef.current = true;
      }
      // Remove listeners after first trigger
      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
      document.removeEventListener('keydown', startMusic);
    };

    // Try to start immediately (will work if AudioContext already unlocked)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'running') {
        ctx.close();
        startMusic();
      } else {
        ctx.close();
        // Wait for user gesture
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('touchstart', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });
      }
    } catch {
      // Fallback: wait for user gesture
      document.addEventListener('click', startMusic, { once: true });
      document.addEventListener('touchstart', startMusic, { once: true });
      document.addEventListener('keydown', startMusic, { once: true });
    }

    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('touchstart', startMusic);
      document.removeEventListener('keydown', startMusic);
    };
  }, [content?.musicProfile, musicVolume]);

  // Build TTS URL for the backend
  const getTtsUrl = useCallback((text) => {
    const truncated = text.substring(0, 5000);
    const queryParams = new URLSearchParams({
      text: truncated,
      lang: lang,
      voice: 'female',
      rate: '-15%',
    });
    return `${API_URL}/api/v1/audio/tts?${queryParams.toString()}`;
  }, [lang]);

  // Start progress tracking
  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.duration && !isNaN(audio.duration)) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    }, 250);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!content) return;

    const storyText = content.text || content.content || '';
    if (!storyText) return;

    // If we have an active audio element with a source
    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        // PAUSE narration only
        audioRef.current.pause();
        setIsPlaying(false);
        stopProgressTracking();
        return;
      } else if (audioRef.current.currentTime > 0 && !audioRef.current.ended) {
        // RESUME narration only
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          startProgressTracking();
        } catch (e) {
          console.error('Resume failed:', e);
        }
        return;
      }
    }

    // START FRESH - create new audio
    setAudioLoading(true);
    setAudioError(null);
    setProgress(0);
    setCurrentTime(0);

    try {
      const ttsUrl = getTtsUrl(storyText);

      // Create audio element
      const audio = new Audio();
      audioRef.current = audio;

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      });

      audio.addEventListener('canplay', async () => {
        setAudioLoading(false);
        try {
          await audio.play();
          setIsPlaying(true);
          startProgressTracking();
        } catch (e) {
          console.error('Playback failed:', e);
          setAudioError(lang === 'hi' ? 'Audio nahi chal paya' : 'Could not play audio');
          setIsPlaying(false);
        }
      }, { once: true });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(100);
        stopProgressTracking();
      });

      audio.addEventListener('error', () => {
        setAudioLoading(false);
        setAudioError(lang === 'hi' ? 'Audio load nahi ho paya. Baad mein try karein.' : 'Could not load audio. Try again later.');
        setIsPlaying(false);
        stopProgressTracking();
      });

      // Start loading
      audio.src = ttsUrl;
      audio.load();
    } catch (e) {
      console.error('TTS error:', e);
      setAudioLoading(false);
      setAudioError(lang === 'hi' ? 'Audio mein error aa gaya' : 'Audio error occurred');
    }
  }, [content, isPlaying, lang, getTtsUrl, startProgressTracking, stopProgressTracking]);

  // Handle music volume changes
  const handleMusicVolumeChange = useCallback((e) => {
    const vol = parseInt(e.target.value, 10);
    setMusicVolume(vol);
    if (musicRef.current) {
      musicRef.current.setVolume(vol / 100);
    }
  }, []);

  // Toggle music play/pause (independent of narration)
  const handleMusicPlayPause = useCallback(() => {
    if (!musicRef.current || !content?.musicProfile) return;
    if (musicPlaying) {
      musicRef.current.pause();
      setMusicPlaying(false);
    } else {
      const profile = content.musicProfile;
      musicRef.current.setVolume(musicVolume / 100);
      if (musicStartedRef.current) {
        musicRef.current.resume();
      } else {
        musicRef.current.play(profile);
        musicStartedRef.current = true;
      }
      setMusicPlaying(true);
    }
  }, [musicPlaying, content?.musicProfile, musicVolume]);

  // Mute/unmute music (keeps playing but silences)
  const handleMusicMuteToggle = useCallback(() => {
    setMusicMuted(prev => {
      const newMuted = !prev;
      if (musicRef.current) {
        if (newMuted) {
          musicRef.current.setVolume(0);
        } else {
          musicRef.current.setVolume(musicVolume / 100);
        }
      }
      return newMuted;
    });
  }, [musicVolume]);

  // Stop audio when content changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (musicRef.current) musicRef.current.stop(false);
    musicStartedRef.current = false;
    setMusicPlaying(false);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
    stopProgressTracking();
  }, [content?.id, stopProgressTracking]);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const data = await contentApi.getContentById(params.id);
        if (data && data.title) {
          setContent(data);
          setIsLiked(data.is_liked || false);
          setIsSaved(data.is_saved || false);
        } else {
          const seedMatch = getStories(lang).find((s) => s.id === params.id);
          if (seedMatch) {
            setContent(seedMatch);
          } else {
            setError(t('playerNotFound'));
          }
        }
      } catch (err) {
        console.error('Error loading content:', err);
        const seedMatch = getStories(lang).find((s) => s.id === params.id);
        if (seedMatch) {
          setContent(seedMatch);
        } else {
          setError(t('playerError'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadContent();
    }
  }, [params.id, lang]);

  const handleLike = async () => {
    if (!content) return;
    try {
      if (isLiked) {
        await interactionApi.unlikeContent(content.id);
        setIsLiked(false);
        setContent({ ...content, like_count: (content.like_count || 1) - 1 });
      } else {
        await interactionApi.likeContent(content.id);
        setIsLiked(true);
        setContent({ ...content, like_count: (content.like_count || 0) + 1 });
      }
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  const handleSave = async () => {
    if (!content) return;
    try {
      if (isSaved) {
        await interactionApi.unsaveContent(content.id);
        setIsSaved(false);
      } else {
        await interactionApi.saveContent(content.id);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error updating save:', err);
    }
  };

  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
  }, []);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'poem': return styles.artPoemGradient;
      case 'song': return styles.artSongGradient;
      case 'story': default: return styles.artStoryGradient;
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'poem': return '📖';
      case 'song': return '🎵';
      case 'story': default: return '✨';
    }
  };

  if (loading) {
    return (
      <>
        <StarField />
        <div className={styles.app}>
          <div className={styles.loadingMessage}>{t('loading')}</div>
        </div>
      </>
    );
  }

  if (error || !content) {
    return (
      <>
        <StarField />
        <div className={styles.app}>
          <div className={styles.errorMessage}>
            {error || t('playerNotFound')}
            <Link href="/explore" className={styles.exploreBtn}>
              {t('playerExplore')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← {t('playerBack')}
        </button>

        <div className={`${styles.albumArt} ${content.cover ? styles.artWithImage : getTypeColor(content.type)}`}>
          {content.cover ? (
            <img
              src={content.cover}
              alt={content.title || 'Cover art'}
              className={styles.coverImage}
            />
          ) : (
            <span className={styles.albumIcon}>{getTypeIcon(content.type)}</span>
          )}
          {isPlaying && (
            <div className={styles.playingWaves}>
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          )}
        </div>

        <div className={styles.badge}>
          {content.type?.toUpperCase() || 'STORY'}
        </div>
        <h1 className={styles.title}>{content.title}</h1>

        <div className={styles.controls}>
          <button
            onClick={handlePlayPause}
            className={`${styles.playButton} ${audioLoading ? styles.playButtonLoading : ''}`}
            disabled={audioLoading}
            title={isPlaying ? (lang === 'hi' ? 'Kahaani rokein' : 'Pause narration') : (lang === 'hi' ? 'Kahaani sunein' : 'Play narration')}
          >
            {audioLoading ? (
              <span className={styles.spinner}></span>
            ) : isPlaying ? '⏸️' : '▶️'}
          </button>
          <span className={styles.controlLabel}>
            {lang === 'hi' ? 'Kahaani' : 'Narration'}
          </span>
        </div>

        {audioError && (
          <p className={styles.audioError}>{audioError}</p>
        )}

        <div className={styles.progressContainer}>
          <div className={styles.progressBar} onClick={handleSeek}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className={styles.timeDisplay}>
            <span>{formatTime(currentTime)}</span>
            <span>
              {audioLoading ? (lang === 'hi' ? 'Tayyar ho raha hai...' : 'Preparing...') :
               isPlaying ? (lang === 'hi' ? 'Sun rahe hain...' : 'Listening...') :
               progress >= 100 ? (lang === 'hi' ? 'Khatam' : 'Finished') :
               progress > 0 ? (lang === 'hi' ? 'Ruka hua' : 'Paused') :
               (lang === 'hi' ? 'Sunne ke liye play dabayein' : 'Tap play to listen')}
            </span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {content.musicProfile && (
          <div className={styles.musicControls}>
            <button
              onClick={handleMusicPlayPause}
              className={`${styles.musicPlayBtn} ${musicPlaying ? styles.musicPlayBtnActive : ''}`}
              title={musicPlaying ? (lang === 'hi' ? 'Sangeet rokein' : 'Pause music') : (lang === 'hi' ? 'Sangeet chalayein' : 'Play music')}
            >
              {musicPlaying ? '⏸' : '▶'}
            </button>
            <div className={styles.musicLabel}>
              <span className={styles.musicIcon}>🎵</span>
              <span>{lang === 'hi' ? 'Sangeet' : 'Music'}</span>
            </div>
            <div className={styles.musicSliderWrap}>
              <input
                type="range"
                min="0"
                max="100"
                value={musicMuted ? 0 : musicVolume}
                onChange={handleMusicVolumeChange}
                className={styles.musicSlider}
                disabled={musicMuted}
              />
            </div>
            <button
              onClick={handleMusicMuteToggle}
              className={`${styles.musicMuteBtn} ${musicMuted ? styles.musicMuteBtnActive : ''}`}
              title={musicMuted ? (lang === 'hi' ? 'Awaz chalayein' : 'Unmute') : (lang === 'hi' ? 'Awaz band karein' : 'Mute')}
            >
              {musicMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleLike}
            className={`${styles.actionButton} ${isLiked ? styles.actionButtonActive : ''}`}
          >
            ❤️ {content.like_count || 0}
          </button>
          <button
            onClick={handleSave}
            className={`${styles.actionButton} ${isSaved ? styles.actionButtonActive : ''}`}
          >
            📌 {isSaved ? t('playerSaved') : t('playerSave')}
          </button>
          <button className={styles.actionButton}>
            🔗 {t('playerShare')}
          </button>
        </div>

        <div className={styles.storySection}>
          <h2 className={styles.sectionTitle}>{t('playerStory')}</h2>
          <div className={styles.storyText}>
            {content.text || content.content || t('playerNoContent')}
          </div>

          {content.poems && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>📖 {t('playerPoems')}</h3>
              <div className={styles.extraText}>{content.poems}</div>
            </div>
          )}

          {content.songs && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>🎵 {t('playerSongs')}</h3>
              <div className={styles.extraText}>{content.songs}</div>
            </div>
          )}

          {content.qa && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>❓ {t('playerQA')}</h3>
              <div className={styles.extraText}>{content.qa}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
