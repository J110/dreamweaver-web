'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playlistApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import StarField from '@/components/StarField';
import HeartButton from '@/components/HeartButton';
import { canPlayTrack, nextPlayableIndex } from './playlistState';
import {
  updateMediaSessionMetadata,
  registerMediaSessionHandlers,
  updatePlaybackState,
  clearMediaSession,
} from '@/utils/mediaSessionManager';

function resolveAudioUrl(item) {
  if (!item) return null;
  return item.audio_url || null;
}

function resolveCoverUrl(item) {
  if (!item) return null;
  return item.cover_url || null;
}

function ControlIcon({ type }) {
  const paths = {
    previous: <><path d="M7 6v12" /><path d="m19 6-8 6 8 6Z" /></>,
    next: <><path d="M17 6v12" /><path d="m5 6 8 6-8 6Z" /></>,
    play: <path d="m8 5 11 7-11 7Z" />,
    pause: <><path d="M9 5v14" /><path d="M15 5v14" /></>,
  };
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

export default function NapPlaylistPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    playlistApi.getNap({ lang, tz }).then((data) => {
      setItems(data.items || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [lang]);

  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (progressRef.current) clearInterval(progressRef.current);
      clearMediaSession();
    };
  }, []);

  // Autoplay first track when items load (deferred to avoid SSG prerender issues)
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current || items.length === 0 || loading) return;
    autoStarted.current = true;
    const timer = setTimeout(() => {
      const item = items[0];
      if (!item) return;
      const url = resolveAudioUrl(item);
      if (!url) return;
      const audio = new Audio(url);
      audioRef.current = audio;
      setCurrentIndex(0);
      updateMediaSessionMetadata({ title: item.title || 'Nap Playlist', artist: 'Dream Valley', album: 'Nap Playlist', coverUrl: resolveCoverUrl(item) });
      audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); updatePlaybackState('paused'); if (items.length > 1) playTrack(1); });
      audio.addEventListener('error', () => { setIsPlaying(false); updatePlaybackState('paused'); });
      audio.play().then(() => { setIsPlaying(true); updatePlaybackState('playing'); startProgress(); }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [items, loading]);

  const currentItem = items[currentIndex] || null;
  const audioUrl = resolveAudioUrl(currentItem);
  const coverUrl = resolveCoverUrl(currentItem);

  const startProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      const a = audioRef.current;
      if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
    }, 250);
  }, []);

  const playTrack = useCallback((idx) => {
    if (!canPlayTrack(items, idx)) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (progressRef.current) clearInterval(progressRef.current);
    setProgress(0);
    const item = items[idx];
    if (!item) return;
    const url = resolveAudioUrl(item);
    if (!url) return;
    setCurrentIndex(idx);
    const audio = new Audio(url);
    audioRef.current = audio;
    updateMediaSessionMetadata({
      title: item.title || 'Nap Playlist',
      artist: 'Dream Valley',
      album: 'Nap Playlist',
      coverUrl: resolveCoverUrl(item),
    });
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      updatePlaybackState('paused');
      const nextIndex = nextPlayableIndex(items, idx);
      if (nextIndex !== null) playTrack(nextIndex);
    });
    audio.addEventListener('error', () => {
      setIsPlaying(false);
      updatePlaybackState('paused');
    });
    audio.play().then(() => {
      setIsPlaying(true);
      updatePlaybackState('playing');
      startProgress();
    }).catch(() => {});
  }, [items, startProgress]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !audioRef.current.src) {
      playTrack(currentIndex);
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play().then(() => { setIsPlaying(true); updatePlaybackState('playing'); startProgress(); });
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      updatePlaybackState('paused');
      if (progressRef.current) clearInterval(progressRef.current);
    }
  }, [currentIndex, playTrack, startProgress]);

  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => handlePlayPause(),
      onPause: () => handlePlayPause(),
      onPrevious: () => { if (canPlayTrack(items, currentIndex - 1)) playTrack(currentIndex - 1); },
      onNext: () => {
        const nextIndex = nextPlayableIndex(items, currentIndex);
        if (nextIndex !== null) playTrack(nextIndex);
      },
    });
  }, [handlePlayPause, playTrack, currentIndex, items.length]);

  if (loading) {
    return (<><StarField /><div style={pageStyle}><div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>{t('loading')}</div></div></>);
  }

  return (
    <>
      <StarField />
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={() => router.back()} style={closeStyle}>{'x'}</button>
          <div style={{ flex: 1, textAlign: 'center', opacity: 0.7, fontSize: 13 }}>
            {lang === 'hi' ? `Ab baj raha hai ${currentIndex + 1} / ${items.length}` : `Now playing ${currentIndex + 1} of ${items.length}`}
          </div>
          <div style={{ width: 36 }} />
        </div>

        <div style={safetyNote}>
          {lang === 'hi'
            ? 'Yeh playlist aapke bachche ko nap ke liye ready karne ke liye hai. Phone ek safe jagah rakh do.'
            : 'This playlist is designed to help your child nap. Place your phone on a safe surface within easy reach.'}
        </div>

        {coverUrl ? (
          <div style={artStyle}>
            <img src={coverUrl} alt={currentItem?.title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16 }} />
          </div>
        ) : (
          <div style={{ ...artStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 48 }}>{'☀️'}</span>
          </div>
        )}

        <h2 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, margin: '12px 0 2px' }}>{currentItem?.title || ''}</h2>

        <div style={controlsStyle}>
          <button
            style={{ ...ctrlBtn, opacity: canPlayTrack(items, currentIndex - 1) ? 1 : 0.35 }}
            disabled={!canPlayTrack(items, currentIndex - 1)}
            aria-label={lang === 'hi' ? 'Pichla track' : 'Previous track'}
            onClick={() => playTrack(currentIndex - 1)}
          >
            <ControlIcon type="previous" />
          </button>
          <button
            style={playBtn}
            aria-label={isPlaying ? (lang === 'hi' ? 'Rokein' : 'Pause') : (lang === 'hi' ? 'Chalayen' : 'Play')}
            onClick={handlePlayPause}
          >
            <ControlIcon type={isPlaying ? 'pause' : 'play'} />
          </button>
          <button
            style={{ ...ctrlBtn, opacity: nextPlayableIndex(items, currentIndex) !== null ? 1 : 0.35 }}
            disabled={nextPlayableIndex(items, currentIndex) === null}
            aria-label={lang === 'hi' ? 'Agla track' : 'Next track'}
            onClick={() => {
              const nextIndex = nextPlayableIndex(items, currentIndex);
              if (nextIndex !== null) playTrack(nextIndex);
            }}
          >
            <ControlIcon type="next" />
          </button>
        </div>

        <div style={trackListStyle}>
          {items.map((item, i) => (
            <div
              key={`${item.slot || 'track'}-${item.content_id || i}`}
              style={{
                ...trackRow,
                fontWeight: i === currentIndex ? 700 : 400,
                opacity: item.is_locked ? 0.82 : 1,
                background: item.is_locked ? 'rgba(255,184,77,0.08)' : 'transparent',
              }}
              onClick={() => item.is_locked ? router.push('/pricing') : playTrack(i)}
            >
              <span style={{ width: 24, textAlign: 'center', opacity: 0.5 }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{item.title}</span>
              {item.is_locked ? (
                <button
                  type="button"
                  style={unlockBtn}
                  onClick={(event) => {
                    event.stopPropagation();
                    router.push('/pricing');
                  }}
                >
                  <span aria-hidden="true">{'🔒'}</span>
                  {lang === 'hi' ? 'Premium se unlock karein' : 'Unlock with Premium'}
                </button>
              ) : (
                <HeartButton contentId={item.content_id} size={20} />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const pageStyle = { maxWidth: 480, margin: '0 auto', padding: '16px 16px 96px', minHeight: '100vh', color: '#fff', position: 'relative' };
const closeStyle = { background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, fontSize: 18, cursor: 'pointer', flexShrink: 0 };
const safetyNote = { background: 'rgba(96,165,250,0.12)', borderRadius: 12, padding: '10px 14px', fontSize: 12, opacity: 0.8, marginBottom: 16, lineHeight: 1.5, textAlign: 'center' };
const artStyle = { width: '100%', aspectRatio: '1/1', maxWidth: 280, margin: '0 auto', borderRadius: 16, overflow: 'hidden' };
const controlsStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, margin: '20px 0' };
const ctrlBtn = { background: 'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.22)', backdropFilter: 'blur(12px)' };
const playBtn = { background: 'linear-gradient(145deg, #67adff, #347ff0)', border: '1px solid rgba(255,255,255,0.28)', color: '#fff', width: 68, height: 68, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px rgba(59,130,246,0.38), inset 0 1px 0 rgba(255,255,255,0.3)' };
const trackListStyle = { background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 8 };
const trackRow = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px', cursor: 'pointer', borderRadius: 8 };
const unlockBtn = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg, rgba(217,164,92,0.24), rgba(217,164,92,0.12))', border: '1px solid rgba(217,164,92,0.5)', color: '#f4cf96', borderRadius: 999, padding: '7px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer' };
