'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StarField from '@/components/StarField';
import HeartButton from '@/components/HeartButton';
import { contentApi, feedbackApi, subscriptionApi, billingApi } from '@/utils/api';
import { openCheckoutUrl } from '@/utils/checkoutPending';
import { getStories } from '@/utils/seedData';
import { getAmbientMusic } from '@/utils/ambientMusic';
import { useI18n, hasCompletedOnboarding } from '@/utils/i18n';
import { useVoicePreferences } from '@/utils/voicePreferences';
import { isLoggedIn } from '@/utils/auth';
import { VOICES, getVoiceId, getVoiceLabel } from '@/utils/voiceConfig';
import { stripEmotionMarkers } from '@/utils/textUtils';
import { getDisplayCategory, getDisplayCategoryUpper } from '@/utils/contentTypes';
import { recordListen, markCompleted } from '@/utils/listeningHistory';
import { dvAnalytics } from '@/utils/analytics';
import { isNativeApp } from '@/utils/platformDetect';
import UpgradeShowcase from '@/components/UpgradeShowcase';
import { setUpgradeIntent } from '@/utils/upgradeIntent';
import posthog from 'posthog-js';
import useCoverVisualSystem from '@/hooks/useCoverVisualSystem';
import {
  updateMediaSessionMetadata,
  registerMediaSessionHandlers,
  updatePlaybackState,
  updatePositionState,
  clearMediaSession,
} from '@/utils/mediaSessionManager';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();
  const { getStoryVoices, getDefaultVoice, hasVoicePrefs, voicePrefs } = useVoicePreferences();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showAboutPanel, setShowAboutPanel] = useState(false);
  const aboutPanelRef = useRef(null);
  const audioRef = useRef(null);
  const audioDisposingRef = useRef(false);
  const progressIntervalRef = useRef(null);
  const voiceSwitchAutoPlayRef = useRef(false);
  const musicRef = useRef(null);
  const musicPhaseRef = useRef(1); // Current sleep music phase (1=Capture, 2=Descent, 3=Sleep)
  const tracked1MinRef = useRef(false); // Track 1-min milestone once per play
  const musicStartedRef = useRef(false);
  const lastHistoryRecordRef = useRef(0); // throttle history writes

  // Cover Visual System — progressive darkening for sleep content.
  // Uses 4 pre-generated image variants (bright → golden → twilight → near-dark)
  // with smooth crossfade + breathing deceleration. Falls back to CSS filter
  // dimming when variants aren't available. Disabled for Before Bed content.
  const {
    variantOpacities,
    breatheSpeed,
    progressAngle,
    isEnabled: coverSystemEnabled,
    hasVariants: coverHasVariants,
    filterFallbackStyle,
  } = useCoverVisualSystem(audioRef, content, progress, isPlaying);

  // Cover dim style: use filter fallback for SVG covers or when no variants available
  const coverDimStyle = useMemo(() => {
    // If the visual system is enabled and has variants, the crossfade handles dimming
    if (coverHasVariants) return {};
    // For SVG covers without variants, use CSS filter fallback
    if (coverSystemEnabled && content?.cover?.endsWith('.svg')) {
      return filterFallbackStyle;
    }
    return {};
  }, [coverHasVariants, coverSystemEnabled, content?.cover, filterFallbackStyle]);

  // Initialize music engine
  useEffect(() => {
    musicRef.current = getAmbientMusic();
    return () => {
      if (audioRef.current) {
        audioDisposingRef.current = true;
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
        window.__dvAudioElement = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (musicRef.current) {
        musicRef.current.stop(true);
      }
    };
  }, []);

  // Auto-select voice based on preferences when content loads
  const voiceInitializedRef = useRef(false);
  useEffect(() => {
    if (!content) return;
    const variants = content.audio_variants || [];
    const preferredDefault = getDefaultVoice(lang);

    // Re-run when voice prefs load (override initial fallback)
    if (voiceInitializedRef.current && !voicePrefs) return;

    if (variants.length > 0) {
      // Try exact match first, then try matching base ID (strip _hi suffix)
      const match = variants.find(v => v.voice === preferredDefault)
        || variants.find(v => v.voice.replace(/_hi$/, '') === preferredDefault.replace(/_hi$/, ''));
      setSelectedVoice(match ? match.voice : variants[0].voice);
    } else {
      setSelectedVoice(preferredDefault);
    }
    voiceInitializedRef.current = true;
  }, [content, lang, getDefaultVoice, voicePrefs]);

  // Auto-start ambient music — prefer musicParams (per-story unique), fallback to musicProfile (shared)
  //
  // Design: Music should start once per story and never be interrupted by React re-renders.
  // All music state lives in refs (not state) to avoid useEffect dependency issues.
  // The render phase detects story changes and resets refs BEFORE effects run.
  const musicSourceRef = useRef(null);
  const musicContentIdRef = useRef(null); // tracks which story's music source is loaded
  const musicStartAttemptedRef = useRef(false); // prevents duplicate start attempts
  const retryTimerRef = useRef(null); // holds retry interval ID for cleanup

  // Render-phase logic: detect story changes and update music source ref.
  // This MUST run before effects so the music-start effect sees the correct source.
  // Songs (lullabies) don't use ambient background music — ACE-Step output has vocals + instrument
  // experimental_v2 stories have bed music baked into the audio file — skip ambient music
  // Prefer musicalBrief (composed client-side) > musicParams (legacy v2) > musicProfile (named preset)
  const hasBakedMusic = content?.experimental_v2 === true || content?.has_baked_music === true || content?.id?.startsWith('exp2-');
  const musicSource = (content?.type === 'song' || hasBakedMusic) ? null : (content?.musicalBrief || content?.musicParams || content?.musicProfile);
  const currentContentId = content?.id;
  if (currentContentId && currentContentId !== musicContentIdRef.current) {
    if (musicContentIdRef.current) {
      // Actually switching stories (not first load) — stop old music immediately
      // and reset state so the music-start effect will re-attempt for the new story.
      // We stop here (render phase) rather than in an effect to ensure cleanup
      // happens before ANY effect runs in this render cycle.
      if (musicRef.current) {
        musicRef.current.stop(false); // immediate stop, no fade
      }
      musicStartAttemptedRef.current = false;
      musicStartedRef.current = false;
    }
    musicSourceRef.current = null;
    musicContentIdRef.current = currentContentId;
  }
  if (musicSource && !musicSourceRef.current) {
    musicSourceRef.current = musicSource;
  }

  // Music start effect — fires when content?.id changes (new story loaded).
  // Uses refs exclusively for source/volume so it doesn't re-trigger on object reference changes.
  //
  // IMPORTANT: play() is async (waits for AudioContext). We must await it before
  // marking musicStartedRef = true, otherwise retries stop prematurely while
  // the AudioContext is still suspended and no sound has been produced.
  useEffect(() => {
    if (musicStartAttemptedRef.current) return;
    if (content?.premium_locked) return;

    // Capture the content ID at effect start. If it changes mid-flight
    // (user switched stories), we abort to avoid starting stale music.
    const effectContentId = musicContentIdRef.current;
    let cancelled = false;

    const tryStart = async () => {
      const source = musicSourceRef.current;
      if (!source || !musicRef.current) return false;
      if (musicStartedRef.current) return true;
      if (cancelled) return false;
      try {
        musicPhaseRef.current = 1; // Reset phase on new music start
        // Per-content ambient volume (no user slider — iOS ignores audio.volume)
        const vol = content?.musicVolume ?? 0.25;
        musicRef.current.setVolume(vol);
        // play() is async — it awaits AudioContext readiness.
        // The engine uses a generation counter internally so stale calls are no-ops.
        await musicRef.current.play(source);
        // After await: check if this effect is still for the current story
        if (cancelled || musicContentIdRef.current !== effectContentId) {
          return false;
        }
        setMusicPlaying(true);
        musicStartedRef.current = true;
        return true;
      } catch (err) {
        console.error('[Music] Failed to start:', err);
        return false;
      }
    };

    // Try immediately
    (async () => {
      if (await tryStart()) {
        musicStartAttemptedRef.current = true;
        return;
      }

      // Retry loop — check every 300ms for up to 6s
      let retryCount = 0;
      const retryTimer = setInterval(async () => {
        retryCount++;
        if (cancelled || musicStartedRef.current || retryCount > 20) {
          clearInterval(retryTimer);
          if (!cancelled) musicStartAttemptedRef.current = true;
          return;
        }
        if (await tryStart()) {
          clearInterval(retryTimer);
          musicStartAttemptedRef.current = true;
        }
      }, 300);

      // Store timer ID so cleanup can clear it
      retryTimerRef.current = retryTimer;
    })();

    // Gesture listener for autoplay-blocked browsers
    const onGesture = async () => {
      if (cancelled || musicStartedRef.current) {
        removeGestureListeners();
        return;
      }
      if (await tryStart()) {
        removeGestureListeners();
        if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        musicStartAttemptedRef.current = true;
      }
    };

    const removeGestureListeners = () => {
      document.removeEventListener('click', onGesture, true);
      document.removeEventListener('touchstart', onGesture, true);
      document.removeEventListener('keydown', onGesture, true);
    };

    document.addEventListener('click', onGesture, true);
    document.addEventListener('touchstart', onGesture, true);
    document.addEventListener('keydown', onGesture, true);

    return () => {
      cancelled = true;
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      removeGestureListeners();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id]); // re-check when content loads (musicSourceRef gets populated during render)

  // Resolve audio source
  const getAudioSource = useCallback(() => {
    if (!content) return null;
    if (content.premium_locked) return null;
    const variants = content.audio_variants || [];

    const match = variants.find(v => v.voice === selectedVoice);
    if (match) {
      return {
        url: match.url,
        isPregen: true,
        duration: match.duration_seconds,
      };
    }

    // Single-file mode: poems, silly_songs, funny_shorts carry audio_file
    // (direct file path) instead of audio_variants (voice-selectable list).
    // Derive the serving URL by content type — mirrors before-bed's inline
    // player. Only for UNLOCKED items (premium_locked checked at line 277).
    if (content.audio_file && variants.length === 0) {
      const af = content.audio_file;
      let dir = null;
      if (content.type === 'poem') dir = content.lang === 'hi' ? 'poems-hi' : 'poems';
      else if (content.subtype === 'silly_song') dir = content.lang === 'hi' ? 'silly-songs-hi' : 'silly-songs';
      else if (content.subtype === 'funny_short') dir = content.lang === 'hi' ? 'funny-shorts-hi' : 'funny-shorts';
      if (dir) {
        return { url: `/audio/${dir}/${af}`, isPregen: true, duration: content.duration_seconds };
      }
    }

    // Long stories must NEVER fall through to the edge-tts substring(0, 5000)
    // path: a 1500+ word story truncates to ~half its text, the TTS plays
    // only the first half, then ends — perceived as "audio ran out at
    // midpoint" with the player surfacing a generic "Could not load audio"
    // error. If a long story has no matching pre-gen variant for the
    // selected voice, return null so the caller surfaces a clean error
    // instead of playing a partial.
    const isLongStory = content.type === 'long_story' || content.length === 'LONG';
    if (isLongStory) {
      return null;
    }

    const text = (content.text || '').substring(0, 5000);
    const baseId = selectedVoice?.replace(/_hi$/, '') || '';
    const voiceMeta = VOICES[baseId];
    const voiceGender = voiceMeta?.gender === 'male' ? 'male' : 'female';
    const params = new URLSearchParams({
      text,
      lang,
      voice: voiceGender,
      rate: '-15%',
      provider: 'edge-tts',
    });
    return {
      url: `${API_URL}/api/v1/audio/tts?${params.toString()}`,
      isPregen: false,
    };
  }, [content, selectedVoice, lang]);

  const startProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      const audio = audioRef.current;
      if (audio && audio.duration && !isNaN(audio.duration)) {
        const now = audio.currentTime;
        const dur = audio.duration;
        setCurrentTime(now);
        setDuration(dur);
        const pct = (now / dur) * 100;
        setProgress(pct);

        // Update lock screen progress bar
        updatePositionState(now, dur);

        // Music phase transitions aligned with cover dimming
        const targetPhase = pct <= 33 ? 1 : pct <= 66 ? 2 : 3;
        if (targetPhase !== musicPhaseRef.current && musicRef.current) {
          musicPhaseRef.current = targetPhase;
          musicRef.current.transitionToPhase(targetPhase);
          dvAnalytics.track('phase_enter', {
            contentId: params?.id,
            phase: targetPhase,
            positionMs: Math.round(now * 1000),
          });
        }

        // Track 1-minute listening milestone (once per play)
        if (!tracked1MinRef.current && now >= 60) {
          tracked1MinRef.current = true;
          dvAnalytics.track('play_1min', {
            contentId: params?.id,
            contentType: content?.type,
            voice: selectedVoice,
          });
        }

        // Record listening history (throttled: every 10s)
        const ts = Date.now();
        if (params?.id && ts - lastHistoryRecordRef.current > 10000) {
          lastHistoryRecordRef.current = ts;
          recordListen(params.id, pct);
        }
      }
    }, 250);
  }, [params?.id]);

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleAboutToggle = useCallback(() => {
    setShowAboutPanel(prev => !prev);
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!content) return;
    // Collapse About panel when play is tapped
    setShowAboutPanel(false);

    if (audioRef.current && audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopProgressTracking();
        updatePlaybackState('paused');
        dvAnalytics.track('play_pause', {
          contentId: params?.id,
          positionMs: Math.round((audioRef.current?.currentTime || 0) * 1000),
          phase: musicPhaseRef.current,
        });
        return;
      } else if (audioRef.current.currentTime > 0 && !audioRef.current.ended) {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          startProgressTracking();
          updatePlaybackState('playing');
          dvAnalytics.track('play_resume', {
            contentId: params?.id,
            positionMs: Math.round((audioRef.current?.currentTime || 0) * 1000),
          });
        } catch (e) {
          console.error('Resume failed:', e);
          // On iOS, if resume fails (e.g. NotAllowedError after long pause),
          // reset state so user can tap play again for a fresh start
          if (e.name === 'NotAllowedError') {
            setIsPlaying(false);
            updatePlaybackState('paused');
          }
        }
        return;
      }
    }

    const audioSource = getAudioSource();
    if (!audioSource) return;

    setAudioLoading(true);
    setAudioError(null);
    setProgress(0);
    setCurrentTime(0);

    if (audioSource.isPregen && audioSource.duration) {
      setDuration(audioSource.duration);
    }

    try {
      const audio = new Audio();
      audioRef.current = audio;
      // Expose for native Android lock screen seek control
      window.__dvAudioElement = audio;

      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(100);
        stopProgressTracking();
        updatePlaybackState('paused');
        if (params?.id) markCompleted(params.id);
        dvAnalytics.track('play_complete', {
          contentId: params?.id,
          durationMs: Math.round((audio.duration || 0) * 1000),
          voice: selectedVoice,
        });
        try {
          posthog.capture('play_complete', {
            content_id: params?.id,
            content_type: content?.type,
            age_group: content?.age_group || content?.target_age,
            duration_played_ms: Math.round((audio.duration || 0) * 1000),
            completed: true,
          });
        } catch { /* analytics never breaks playback */ }
        // Post-story: ensure Phase 3 music, then fade to silence after 30s
        if (musicRef.current && musicRef.current.isPlaying) {
          musicRef.current.transitionToPhase(3);
          setTimeout(() => {
            if (musicRef.current && musicRef.current.isPlaying) {
              musicRef.current.stop(true);
            }
          }, 30000);
        }
      });

      audio.addEventListener('error', () => {
        if (audioDisposingRef.current) return;
        setAudioLoading(false);
        setAudioError(lang === 'hi' ? 'Audio load nahi ho paya. Baad mein try karein.' : 'Could not load audio. Try again later.');
        setIsPlaying(false);
        stopProgressTracking();
        updatePlaybackState('paused');
      });

      // Set source — do NOT call audio.load() separately; play() handles loading.
      audio.src = audioSource.url;

      // Call play() directly in user gesture context (critical for iOS/Safari).
      // Previously, play() was inside a 'canplay' callback which fires async —
      // by that time iOS has lost the user gesture context and rejects with
      // NotAllowedError. Calling play() directly preserves the gesture chain;
      // the browser starts playback once enough data has loaded.
      try {
        await audio.play();
        setAudioLoading(false);
        setIsPlaying(true);
        startProgressTracking();
        updatePlaybackState('playing');
        tracked1MinRef.current = false;
        dvAnalytics.track('play_start', {
          contentId: params?.id,
          contentType: content?.type,
          voice: selectedVoice,
          ageGroup: content?.age_group || content?.target_age,
        });
        try {
          posthog.capture('play_start', {
            content_id: params?.id,
            content_type: content?.type,
            age_group: content?.age_group || content?.target_age,
          });
        } catch { /* analytics never breaks playback */ }
      } catch (e) {
        console.error('Playback failed:', e);
        setAudioLoading(false);
        // Autoplay policy blocks gesture-less play() after ?autoplay=1
        // navigation — expected. Stay paused ("Tap play to listen") instead
        // of showing a scary error. Only surface genuine playback failures.
        if (e?.name !== 'NotAllowedError') {
          setAudioError(lang === 'hi' ? 'Audio nahi chal paya' : 'Could not play audio');
        }
        setIsPlaying(false);
        updatePlaybackState('paused');
      }
    } catch (e) {
      console.error('Audio error:', e);
      setAudioLoading(false);
      setAudioError(lang === 'hi' ? 'Audio mein error aa gaya' : 'Audio error occurred');
    }
  }, [content, isPlaying, lang, getAudioSource, startProgressTracking, stopProgressTracking]);

  // Auto-play when voice is switched by user
  useEffect(() => {
    if (voiceSwitchAutoPlayRef.current && selectedVoice) {
      voiceSwitchAutoPlayRef.current = false;
      // Small delay to ensure audio cleanup from handleVoiceChange completes
      const timer = setTimeout(() => {
        handlePlayPause();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedVoice, handlePlayPause]);

  // Auto-play narration when arriving from content card click (?autoplay=1).
  // Waits for content + voice to be ready, then triggers play once.
  const autoPlayTriggeredRef = useRef(false);
  useEffect(() => {
    if (autoPlayTriggeredRef.current) return;
    if (searchParams.get('autoplay') !== '1') return;
    if (!content || !selectedVoice || loading) return;
    if (content.premium_locked) return;
    // Don't auto-play if already playing (e.g., voice switch just triggered)
    if (isPlaying || audioRef.current?.src) return;
    autoPlayTriggeredRef.current = true;
    // Small delay to ensure music engine and audio context are ready
    const timer = setTimeout(() => {
      handlePlayPause();
    }, 200);
    return () => clearTimeout(timer);
  }, [content, selectedVoice, loading, isPlaying, searchParams, handlePlayPause]);

  // Media Session: Register lock screen controls (play/pause/seek)
  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => {
        if (audioRef.current && !audioRef.current.ended && audioRef.current.currentTime > 0) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            startProgressTracking();
            updatePlaybackState('playing');
          }).catch(console.error);
        }
      },
      onPause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
          stopProgressTracking();
          updatePlaybackState('paused');
        }
      },
      onSeekBackward: (details) => {
        if (audioRef.current && audioRef.current.duration) {
          const skip = details?.seekOffset || 15;
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - skip);
        }
      },
      onSeekForward: (details) => {
        if (audioRef.current && audioRef.current.duration) {
          const skip = details?.seekOffset || 15;
          audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + skip);
        }
      },
    });
    return () => clearMediaSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Media Session: Update metadata when story loads (title, cover art on lock screen)
  useEffect(() => {
    if (!content) return;
    const typeLabel = getDisplayCategory(content);
    updateMediaSessionMetadata({
      title: content.title,
      artist: 'Dream Valley',
      album: typeLabel,
      coverUrl: content.cover,
    });
  }, [content?.id, content?.title, content?.cover, content?.type]);

  // Media Session: Sync UI when returning from background (e.g. after phone call)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        if (audioRef.current.paused && isPlaying) {
          setIsPlaying(false);
          stopProgressTracking();
          updatePlaybackState('paused');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, stopProgressTracking]);

  // Track play_abandon on unmount (navigation away mid-play)
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 0 && !audio.ended) {
        const dur = audio.duration || 0;
        const pos = audio.currentTime || 0;
        const pct = dur > 0 ? Math.round((pos / dur) * 100) : 0;
        if (pct < 100) {
          dvAnalytics.track('play_abandon', {
            contentId: params?.id,
            positionMs: Math.round(pos * 1000),
            durationMs: Math.round(dur * 1000),
            percentComplete: pct,
            phase: musicPhaseRef.current,
          });
          dvAnalytics.flush();
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  // Handle voice character change
  const handleVoiceChange = useCallback((voiceId) => {
    if (voiceId === selectedVoice) return;
    if (audioRef.current) {
      audioDisposingRef.current = true;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
      setTimeout(() => { audioDisposingRef.current = false; }, 50);
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
    stopProgressTracking();
    dvAnalytics.track('voice_switch', {
      contentId: params?.id,
      fromVoice: selectedVoice,
      toVoice: voiceId,
    });
    voiceSwitchAutoPlayRef.current = true;
    setSelectedVoice(voiceId);
  }, [selectedVoice, stopProgressTracking, params?.id]);

  const handleMusicPlayPause = useCallback(async () => {
    const source = musicSourceRef.current || content?.musicalBrief || content?.musicParams || content?.musicProfile;
    if (!musicRef.current || !source) return;
    if (musicPlaying) {
      musicRef.current.pause();
      setMusicPlaying(false);
    } else {
      // Per-content ambient volume
      const vol = content?.musicVolume ?? 0.25;
      musicRef.current.setVolume(vol);
      if (musicStartedRef.current && musicRef.current.isPlaying) {
        // Music was paused (AudioContext suspended) — resume it
        musicRef.current.resume();
      } else {
        // Music was stopped or never started — start fresh
        await musicRef.current.play(source);
        musicStartedRef.current = true;
      }
      setMusicPlaying(true);
    }
  }, [musicPlaying, content?.musicalBrief, content?.musicParams, content?.musicProfile, content?.musicVolume, content?.type]);

  // Stop narration audio when content changes (e.g., navigating to a different story).
  // Music cleanup is handled in the render phase above (before effects run) to avoid
  // race conditions between the music-start effect and this cleanup effect.
  const prevContentIdRef = useRef(null);
  useEffect(() => {
    const currentId = content?.id;
    if (!prevContentIdRef.current) {
      // First content load — just record the ID, don't stop anything
      prevContentIdRef.current = currentId;
      return;
    }
    if (currentId === prevContentIdRef.current) return; // same story, no-op
    prevContentIdRef.current = currentId;

    // Stop narration audio
    if (audioRef.current) {
      audioDisposingRef.current = true;
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
      setTimeout(() => { audioDisposingRef.current = false; }, 50);
    }
    // Music is stopped in render phase above, and musicPlaying state
    // will be set to true by the async music-start effect when new music begins.
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
      // Fail-closed seed fallback: when the API can't return a lock verdict
      // (empty response or thrown error), serve bundled seed audio ONLY for a
      // CONFIRMED-unlocked user (effective_premium === true — covers flag-off
      // and premium). A free user OR an undeterminable status (e.g. the status
      // call also fails) gets NO audio and renders locked. Never fail open.
      const serveSeedFallback = async (seedMatch, notFoundKey) => {
        if (!seedMatch) { setError(t(notFoundKey)); return; }
        // Resolve effective_premium WITHOUT a hard dependency on the call that
        // just failed: (1) a live getCurrent — succeeds whenever the backend is
        // reachable (e.g. the empty-response branch) and refreshes the cache;
        // else (2) the value a prior successful getCurrent persisted; else
        // (3) null = no live call AND no cache = true cold-start + total outage.
        let eff = null;
        try {
          eff = (await subscriptionApi.getCurrent())?.effective_premium;
        } catch { /* live call failed — fall through to cache */ }
        if (typeof eff !== 'boolean') {
          try {
            const cached = localStorage.getItem('dv_effective_premium');
            if (cached === 'true') eff = true;
            else if (cached === 'false') eff = false;
          } catch { /* no cache */ }
        }
        // DENY only on a POSITIVE gated signal (eff === false) — produced ONLY
        // flag-on for a gated free user. Flag-off is always true (or, with no
        // signal at all, null), so flag-off can NEVER reach deny → byte-identical
        // to the old unconditional fallback. null (cold-start + total outage)
        // serves: protects flag-off; a flag-on-free user in that exact window is
        // the narrow accepted residual (recorded with the nginx /audio/ one).
        if (eff === false) {
          setContent({ ...seedMatch, audio_variants: [], audio_url: null, audio_file: null, premium_locked: true });
        } else {
          setContent(seedMatch);
        }
      };
      try {
        const data = await contentApi.getContentById(params.id);
        if (data && data.title) {
          // Merge seed-only fields: seed data has audio variants, musicParams, cover, etc.
          // Match by title since API uses UUIDs but seedData uses slug IDs.
          const seedMatch = getStories(lang).find(
            (s) => s.title === data.title || s.id === data.id
          );
          if (seedMatch) {
            // Respect the backend premium lock — never re-inject seed audio
            // over a scrubbed (locked) response, or the lock is defeated.
            if (!data.premium_locked && seedMatch.audio_variants && seedMatch.audio_variants.length > (data.audio_variants || []).length) {
              data.audio_variants = seedMatch.audio_variants;
            }
            // Always prefer seed music data — musicalBrief (new system, composed client-side)
            // or musicParams (legacy, Mistral-generated unique params).
            // API may have stale template values that make all stories sound the same.
            if (seedMatch.musicalBrief) {
              data.musicalBrief = seedMatch.musicalBrief;
            }
            if (seedMatch.musicParams) {
              data.musicParams = seedMatch.musicParams;
            }
            if (!data.musicProfile && seedMatch.musicProfile) {
              data.musicProfile = seedMatch.musicProfile;
            }
            if ((!data.cover || data.cover.includes('default.svg')) && seedMatch.cover) {
              data.cover = seedMatch.cover;
            }
            if (seedMatch.character && (!data.character || !data.character.name)) {
              data.character = seedMatch.character;
            }
            if (!data.story_type && seedMatch.story_type) {
              data.story_type = seedMatch.story_type;
            }
          }
          setContent(data);
          setIsSaved(data.is_saved || false);
        } else {
          await serveSeedFallback(getStories(lang).find((s) => s.id === params.id), 'playerNotFound');
        }
      } catch (err) {
        console.error('Error loading content:', err);
        await serveSeedFallback(getStories(lang).find((s) => s.id === params.id), 'playerError');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadContent();
    }
  }, [params.id, lang]);

  // Click outside About panel to close it
  useEffect(() => {
    if (!showAboutPanel) return;
    const handler = (e) => {
      if (aboutPanelRef.current && !aboutPanelRef.current.contains(e.target) && !e.target.closest('[data-about-btn]')) {
        setShowAboutPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showAboutPanel]);

  const handleReportOpen = () => {
    setReportIssueType('');
    setReportDescription('');
    setShowReportModal(true);
  };

  const handleReportSubmit = async () => {
    if (!reportIssueType) return;
    setReportSubmitting(true);
    try {
      const voiceMeta = selectedVoice ? VOICES[selectedVoice] : null;
      const genderStr = voiceMeta?.gender === 'female' ? 'Female' : voiceMeta?.gender === 'male' ? 'Male' : '';
      const voiceLabel = voiceMeta
        ? `${voiceMeta.label} ${genderStr}`.trim()
        : 'Not selected';

      await feedbackApi.submitReport({
        content_id: content.id,
        content_title: content.title,
        voice: voiceLabel,
        issue_type: reportIssueType,
        description: reportDescription || null,
      });
      setShowReportModal(false);
      setSaveToast(t('playerReportSent'));
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Error submitting report:', err);
      setSaveToast(t('playerReportError'));
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!content) return;
    const shareUrl = `https://dreamvalley.app/player/${params.id}`;
    const shareText = `${content.title} — ${content.description || `Listen on Dream Valley`}\n${shareUrl}`;
    const shareData = {
      title: content.title,
      text: shareText,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        dvAnalytics.track('share', { contentId: params?.id, shareMethod: 'native' });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
        dvAnalytics.track('share', { contentId: params?.id, shareMethod: 'clipboard' });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          setShareCopied(true);
          setTimeout(() => setShareCopied(false), 2000);
          dvAnalytics.track('share', { contentId: params?.id, shareMethod: 'clipboard' });
        } catch { /* ignore */ }
      }
    }
  };

  const handleBack = () => {
    if (isLoggedIn() && !hasCompletedOnboarding()) {
      router.push('/onboarding');
    } else {
      router.back();
    }
  };

  const handleSeek = useCallback((e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
    setCurrentTime(pct * audioRef.current.duration);
  }, []);

  // Touch-friendly seek handler for iOS — uses touch coordinates instead of clientX
  const handleSeekTouch = useCallback((e) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    e.preventDefault(); // prevent page scrolling while seeking
    const touch = e.touches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct * 100);
    setCurrentTime(pct * audioRef.current.duration);
  }, []);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'song': return styles.artSongGradient;
      case 'story': default: return styles.artStoryGradient;
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'song': return '🎵';
      case 'story': default: return '✨';
    }
  };

  // Build voice switch buttons — show all valid voices that have audio variants
  const getVoiceSwitchOptions = () => {
    if (!content || !selectedVoice) return [];
    const allVariants = content.audio_variants || [];
    if (allVariants.length <= 1) return [];

    const options = [];

    // Songs: show ALL variants as switches (each is a distinct musical style).
    // Song voices map to instrument styles, independent of narrator VOICES config.
    const isSong = content.type === 'song';
    const SONG_VOICE_LABELS = {
      female_1: { label: 'Harp', labelHi: 'Veena', icon: '🎵' },
      female_2: { label: 'Guitar', labelHi: 'Guitar', icon: '🎸' },
      female_3: { label: 'Piano', labelHi: 'Piano', icon: '🎹' },
      male_1:   { label: 'Cello', labelHi: 'Cello', icon: '🎻' },
      male_2:   { label: 'Flute', labelHi: 'Baansuri', icon: '🪈' },
    };
    if (isSong) {
      for (const variant of allVariants) {
        const variantBaseId = variant.voice.replace(/_hi$/, '');
        const isActive = variant.voice === selectedVoice;
        if (!isActive) {
          const songMeta = SONG_VOICE_LABELS[variantBaseId];
          const label = songMeta ? (lang === 'hi' ? songMeta.labelHi : songMeta.label) : variantBaseId.replace(/_/g, ' ');
          options.push({
            voiceId: variant.voice,
            icon: songMeta?.icon || '🎶',
            switchLabel: label,
          });
        }
      }
      return options;
    }

    // Stories/poems: show all valid voices (ones in VOICES config) that have audio
    for (const variant of allVariants) {
      const variantBaseId = variant.voice.replace(/_hi$/, '');
      const isActive = variant.voice === selectedVoice;
      if (!isActive) {
        const meta = VOICES[variantBaseId];
        if (!meta) continue; // Skips retired voices (male_1, male_3) not in VOICES
        options.push({
          voiceId: variant.voice,
          icon: meta.icon,
          switchLabel: getVoiceLabel(variantBaseId, lang),
        });
      }
    }

    return options;
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
            <Link href="/before-bed" className={styles.exploreBtn}>
              {t('playerExplore')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (content.premium_locked) {
    const lockedCover = content.cover || (content.cover_file && (
      content.subtype === 'silly_song' ? `/covers/silly-songs/${content.cover_file}`
        : content.subtype === 'funny_short' ? `/covers/${(content.lang || 'en') === 'hi' ? 'funny-shorts-hi' : 'funny-shorts'}/${content.cover_file}`
        : content.type === 'poem' ? `/covers/poems/${content.cover_file}`
        : null
    ));
    return (
      <>
        <StarField />
        <div className={styles.app}>
          <button onClick={handleBack} className={styles.backButton}>
            {'←'} {t('playerBack')}
          </button>
          {lockedCover && (
            <div className={styles.albumArt} style={{ opacity: 0.55 }}>
              <img src={lockedCover} alt={content.title || ''} className={styles.coverImage} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg, transparent 20%, rgba(13,11,46,0.7) 100%)', borderRadius: 'inherit',
              }}>
                <span style={{ fontSize: 48 }} aria-hidden>🔒</span>
              </div>
            </div>
          )}
          {!lockedCover && <div style={{ fontSize: 48, textAlign: 'center', marginTop: 32 }} aria-hidden>🔒</div>}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{content.title || ''}</div>
            <div style={{ opacity: 0.7, marginBottom: 20, fontSize: 14 }}>
              {lang === 'hi' ? 'Yeh Premium content hai' : 'This is a Premium story'}
            </div>
          </div>
          <div style={{ margin: '24px auto 0', maxWidth: 420, padding: '0 16px' }}>
            <UpgradeShowcase />
            <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0', textAlign: 'left' }}>
              {[
                'Full story library — every story, poem & lullaby',
                'Complete bedtime routine with playlists',
                'Save up to 30 days of bedtime favorites',
                '7-day free trial — no charge until day 8',
              ].map((b, i) => (
                <li key={i} style={{ padding: '6px 0', fontSize: 14, opacity: 0.85 }}>
                  <span style={{ color: '#d4af5a', marginRight: 8 }}>✦</span>{b}
                </li>
              ))}
            </ul>
            <LockedCTA intentPath={`/player/${params.id}`} lang={lang} />
          </div>
        </div>
      </>
    );
  }

  const voiceSwitchOptions = getVoiceSwitchOptions();

  // Derive cover from cover_file when cover is null — same logic as ContentCard.
  const resolvedCover = content.cover || (() => {
    const f = content.cover_file;
    if (!f) return null;
    if (content.type === 'poem') return `/covers/${content.lang === 'hi' ? 'poems-hi' : 'poems'}/${f}`;
    if (content.subtype === 'silly_song') return `/covers/${content.lang === 'hi' ? 'silly-songs-hi' : 'silly-songs'}/${f}`;
    if (content.subtype === 'funny_short') return `/covers/${content.lang === 'hi' ? 'funny-shorts-hi' : 'funny-shorts'}/${f}`;
    return null;
  })();

  const hasText = !!(content.text || content.content);

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <button onClick={handleBack} className={styles.backButton}>
          ← {t('playerBack')}
        </button>

        <div
          className={`${styles.albumArt} ${resolvedCover ? styles.artWithImage : getTypeColor(content.type)} ${coverSystemEnabled && isPlaying ? styles.albumArtBreathe : ''}`}
          style={coverSystemEnabled ? {
            '--breathe-speed': `${breatheSpeed.toFixed(1)}s`,
            '--progress-angle': `${progressAngle.toFixed(1)}deg`,
          } : undefined}
        >
          {resolvedCover ? (
            coverHasVariants ? (
              /* 4-variant stack: smooth crossfade between progressive darkening levels */
              <>
                {content.cover_variants.map((variant, i) => (
                  <img
                    key={i}
                    src={variant}
                    alt={i === 0 ? (content.title || 'Cover art') : ''}
                    className={styles.coverImage}
                    style={{
                      zIndex: i + 1,
                      opacity: variantOpacities[i],
                      transition: 'opacity 10s ease-in-out',
                    }}
                  />
                ))}
              </>
            ) : resolvedCover.endsWith('.svg') ? (
              <object
                data={resolvedCover}
                type="image/svg+xml"
                className={styles.coverImage}
                style={coverDimStyle}
                aria-label={content.title || 'Cover art'}
              />
            ) : (
              <img
                src={resolvedCover}
                alt={content.title || 'Cover art'}
                className={styles.coverImage}
                style={coverDimStyle}
              />
            )
          ) : (
            <span className={styles.albumIcon}>{getTypeIcon(content.type)}</span>
          )}
          {/* Progress arc — thin ring around cover edge, visible during sleep content */}
          {coverSystemEnabled && isPlaying && (
            <div className={styles.progressArc} />
          )}
</div>

        <div className={styles.badgeRow}>
          <div className={styles.badge}>
            {(content.story_type && {'folk_tale':'FOLK TALE','mythological':'MYTHOLOGICAL','fable':'FABLE','nature':'NATURE STORY','slice_of_life':'SLICE OF LIFE','dream':'DREAM'}[content.story_type]) || getDisplayCategoryUpper(content)}
          </div>
        </div>
        <h1 className={styles.title}>{content.title}</h1>

        <div className={styles.controlsRow}>
          {/* Music toggle — small, left of narration */}
          {(content.musicalBrief || content.musicParams || content.musicProfile) && content.type !== 'song' && (
            <div className={styles.musicGroup}>
              <button
                onClick={handleMusicPlayPause}
                className={`${styles.musicToggleBtn} ${musicPlaying ? styles.musicToggleBtnActive : ''}`}
                title={musicPlaying ? (lang === 'hi' ? 'Sangeet rokein' : 'Pause music') : (lang === 'hi' ? 'Sangeet chalayein' : 'Play music')}
              >
                🎵
              </button>
              <span className={styles.controlLabel}>
                {lang === 'hi' ? 'Sangeet' : 'Music'}
              </span>
            </div>
          )}
          <div className={styles.playGroup}>
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
          <div className={styles.aboutGroup}>
            <button
              onClick={handleAboutToggle}
              className={`${styles.aboutButton} ${showAboutPanel ? styles.aboutButtonActive : ''}`}
              data-about-btn="true"
              title={t('playerAbout')}
            >
              📖
            </button>
            <span className={styles.controlLabel}>{t('playerAbout')}</span>
          </div>
        </div>

        {/* About panel — expandable, pushes content down */}
        <div
          ref={aboutPanelRef}
          className={`${styles.aboutPanel} ${showAboutPanel ? styles.aboutPanelOpen : ''}`}
        >
          <div className={styles.aboutPanelContent}>
            {content.description && (
              <p className={styles.aboutDescription}>{content.description}</p>
            )}

            {content.character?.name && (
              <div className={styles.characterCard}>
                <div className={styles.characterHeader}>★ Meet {content.character.name}</div>
                {content.character.identity && (
                  <div className={styles.characterIdentity}>{content.character.identity}</div>
                )}
                {content.character.special && (
                  <div className={styles.characterSpecial}>✦ {content.character.special}</div>
                )}
                {content.character.personality_tags?.length > 0 && (
                  <div className={styles.characterTags}>
                    {content.character.personality_tags.join(' · ')}
                  </div>
                )}
              </div>
            )}

            <div className={styles.aboutDetails}>
              <span>
                {content.story_type && {'folk_tale':'Folk Tale','mythological':'Mythological','fable':'Fable','nature':'Nature Story','slice_of_life':'Slice of Life','dream':'Dream'}[content.story_type] || getDisplayCategory(content)}
                {' · ~'}{content.duration || (content.duration_seconds ? Math.max(1, Math.round(content.duration_seconds / 60)) : '?')}{' min'}
              </span>
              <span>
                Best for ages {content.age_min || content.target_age || '?'}-{content.age_max || ((content.target_age || 0) + 3) || '?'}
              </span>
              <span>
                Themes: {(content.categories || []).slice(0, 2).join(', ') || content.theme || '—'}
              </span>
            </div>

          </div>
        </div>

        {/* Voice switch buttons — "Switch to Calm Female" / "Switch to Warm Male" */}
        {voiceSwitchOptions.length > 0 && (
          <div className={styles.voiceSwitchRow}>
            {voiceSwitchOptions.map(opt => (
              <button
                key={opt.voiceId}
                onClick={() => handleVoiceChange(opt.voiceId)}
                className={styles.voiceSwitchBtn}
                disabled={audioLoading}
              >
                <span className={styles.voiceSwitchIcon}>{opt.icon}</span>
                <span className={styles.voiceSwitchLabel}>
                  {lang === 'hi' ? `${opt.switchLabel} par sunein` : `Switch to ${opt.switchLabel}`}
                </span>
              </button>
            ))}
          </div>
        )}

        {audioError && (
          <p className={styles.audioError}>{audioError}</p>
        )}

        <div className={styles.progressContainer}>
          <div
            className={styles.progressTouchArea}
            onClick={handleSeek}
            onTouchStart={handleSeekTouch}
            onTouchMove={handleSeekTouch}
          >
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
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

        <div className={styles.actions}>
          <HeartButton
            contentId={content.id}
            initialSaved={isSaved}
            initialCount={content.save_count || 0}
            variant="full"
            className={styles.actionButton}
            activeClassName={styles.actionButtonActive}
          />
          <button onClick={handleReportOpen} className={styles.actionButton}>
            ⚠️ {t('playerReport')}
          </button>
          <button onClick={handleShare} className={styles.actionButton}>
            🔗 {shareCopied ? t('playerShareCopied') : t('playerShare')}
          </button>
        </div>

        {hasText && <div className={styles.storySection}>
          <h2 className={styles.sectionTitle}>{getDisplayCategory(content, lang)}</h2>
          <div className={styles.storyText}>
            {stripEmotionMarkers(content.text || content.content)}
          </div>

          {content.poems && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>📖 {t('playerPoems')}</h3>
              <div className={styles.extraText}>{stripEmotionMarkers(content.poems)}</div>
            </div>
          )}

          {content.songs && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>🎵 {t('playerSongs')}</h3>
              <div className={styles.extraText}>{stripEmotionMarkers(content.songs)}</div>
            </div>
          )}

          {content.lullaby_lyrics && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>🎵 Lullaby</h3>
              <div className={styles.extraText}>{content.lullaby_lyrics.replace(/\[(verse|chorus)\]/gi, '').replace(/  +/g, ' ').trim()}</div>
            </div>
          )}

          {content.qa && (
            <div className={styles.extraSection}>
              <h3 className={styles.extraTitle}>❓ {t('playerQA')}</h3>
              <div className={styles.extraText}>{stripEmotionMarkers(content.qa)}</div>
            </div>
          )}
        </div>}
      </div>

      {/* Save / Report toast notification */}
      {saveToast && (
        <div className={styles.toast}>
          {saveToast}
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className={styles.reportOverlay} onClick={() => setShowReportModal(false)}>
          <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.reportHeader}>{t('playerReportTitle')}</h3>

            {/* Story info */}
            <div className={styles.reportInfo}>
              <div className={styles.reportInfoRow}>
                <span className={styles.reportInfoLabel}>{t('playerReportStory')}</span>
                <span className={styles.reportInfoValue}>{content?.title}</span>
              </div>
              <div className={styles.reportInfoRow}>
                <span className={styles.reportInfoLabel}>{t('playerReportVoice')}</span>
                <span className={styles.reportInfoValue}>
                  {selectedVoice ? getVoiceLabel(selectedVoice, lang) : '—'}
                </span>
              </div>
            </div>

            {/* Issue type options */}
            <p className={styles.reportSectionLabel}>{t('playerReportIssueType')}</p>
            <div className={styles.reportOptions}>
              {[
                { key: 'audio_quality', icon: '🔊', label: t('playerReportAudioQuality') },
                { key: 'story_content', icon: '📖', label: t('playerReportStoryContent') },
                { key: 'background_music', icon: '🎵', label: t('playerReportBackgroundMusic') },
                { key: 'voice_mismatch', icon: '🗣️', label: t('playerReportVoiceMismatch') },
                { key: 'other', icon: '🐛', label: t('playerReportOther') },
              ].map(opt => (
                <button
                  key={opt.key}
                  className={`${styles.reportOption} ${reportIssueType === opt.key ? styles.reportOptionActive : ''}`}
                  onClick={() => setReportIssueType(opt.key)}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>

            {/* Optional description */}
            <textarea
              className={styles.reportTextarea}
              placeholder={t('playerReportDescription')}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              rows={3}
            />

            {/* Actions */}
            <div className={styles.reportActions}>
              <button
                className={styles.reportCancelBtn}
                onClick={() => setShowReportModal(false)}
              >
                {t('playerReportCancel')}
              </button>
              <button
                className={styles.reportSubmitBtn}
                onClick={handleReportSubmit}
                disabled={!reportIssueType || reportSubmitting}
              >
                {reportSubmitting ? '...' : t('playerReportSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LockedCTA({ intentPath, lang }) {
  const [priceInfo, setPriceInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const native = isNativeApp();

  useEffect(() => {
    setUpgradeIntent(intentPath);
    subscriptionApi.getCurrent()
      .then((sub) => {
        const tier = sub?.current_tier || {};
        if (tier.price) setPriceInfo({ price: tier.price, trialDays: tier.trial_days_monthly ?? 7 });
      })
      .catch(() => {});
  }, [intentPath]);

  async function handleStart() {
    setError(null);
    setSubmitting(true);
    try {
      const { checkout_url } = await billingApi.startCheckout('monthly');
      if (checkout_url) { openCheckoutUrl(checkout_url); return; }
      setError('Could not start checkout. Try again.');
    } catch { setError('Something went wrong. Try again.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      {native ? (
        <>
          <p style={{ opacity: 0.7, fontSize: 14 }}>Subscribe at <strong>dreamvalley.app</strong></p>
          <button
            onClick={() => router.push('/restore')}
            style={{
              background: 'transparent', color: '#ff9100', border: '1px solid rgba(255,145,0,0.5)',
              borderRadius: 24, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              marginTop: 12,
            }}
          >
            Restore subscription
          </button>
        </>
      ) : (
        <>
          <button
            onClick={handleStart}
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #ff6b9d, #ff9100)', color: '#fff', border: 'none',
              borderRadius: 28, padding: '14px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              opacity: submitting ? 0.7 : 1, width: '100%', maxWidth: 320,
            }}
          >
            {submitting ? 'Taking you to checkout...' : 'Start my free trial'}
          </button>
          {priceInfo && (
            <p style={{ opacity: 0.5, fontSize: 12, marginTop: 10 }}>
              Free for {priceInfo.trialDays} days, then ${priceInfo.price}/month. Cancel anytime.
            </p>
          )}
        </>
      )}
      {error && <p style={{ color: '#ff6b6b', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
