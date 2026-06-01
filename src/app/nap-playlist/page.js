'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playlistApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import StarField from '@/components/StarField';
import HeartButton from '@/components/HeartButton';
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
      if (idx + 1 < items.length) {
        playTrack(idx + 1);
      }
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
      onPrevious: () => { if (currentIndex > 0) playTrack(currentIndex - 1); },
      onNext: () => { if (currentIndex < items.length - 1) playTrack(currentIndex + 1); },
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
          <button style={ctrlBtn} onClick={() => { if (currentIndex > 0) playTrack(currentIndex - 1); }}>{'⏮'}</button>
          <button style={playBtn} onClick={handlePlayPause}>{isPlaying ? '⏸' : '▶'}</button>
          <button style={ctrlBtn} onClick={() => { if (currentIndex < items.length - 1) playTrack(currentIndex + 1); }}>{'⏭'}</button>
        </div>

        <div style={trackListStyle}>
          {items.map((item, i) => (
            <div key={item.content_id || i} style={{ ...trackRow, fontWeight: i === currentIndex ? 700 : 400 }} onClick={() => playTrack(i)}>
              <span style={{ width: 24, textAlign: 'center', opacity: 0.5 }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{item.title}</span>
              <HeartButton contentId={item.content_id} size={20} />
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
const controlsStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, margin: '20px 0' };
const ctrlBtn = { background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', opacity: 0.8 };
const playBtn = { background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', border: 'none', color: '#fff', width: 64, height: 64, borderRadius: '50%', fontSize: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const trackListStyle = { background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 8 };
const trackRow = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px', cursor: 'pointer', borderRadius: 8 };
