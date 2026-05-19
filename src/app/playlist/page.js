'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { playlistApi } from '@/utils/api';
import { useI18n } from '@/utils/i18n';
import { getUser } from '@/utils/auth';
import {
  updateMediaSessionMetadata,
  registerMediaSessionHandlers,
  updatePlaybackState,
  clearMediaSession,
} from '@/utils/mediaSessionManager';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function resolveAudioUrl(item) {
  if (!item) return null;
  const url = item.audio_url;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

function resolveCoverUrl(item) {
  if (!item) return null;
  const url = item.cover_url;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url; // served by nginx on same origin
}

function readAge() {
  if (typeof window === 'undefined') return '6-8';
  const fromStorage = localStorage.getItem('dreamvalley_child_age');
  if (fromStorage) return fromStorage;
  const u = getUser?.();
  const childAge = u?.child_age;
  if (typeof childAge === 'number') {
    if (childAge <= 1) return '0-1';
    if (childAge <= 5) return '2-5';
    if (childAge <= 8) return '6-8';
    return '9-12';
  }
  if (typeof childAge === 'string' && childAge.includes('-')) return childAge;
  return '6-8';
}

function detectTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

const SLOT_LABEL = {
  silly_song: { en: 'Silly Song', hi: 'Silly Song' },
  poem: { en: 'Musical Poem', hi: 'Musical Poem' },
  funny_short: { en: 'Funny Short', hi: 'Funny Short' },
  short_story: { en: 'Short Story', hi: 'Choti Kahani' },
  lullaby: { en: 'Lullaby', hi: 'Loriyaan' },
  long_story: { en: 'Long Story', hi: 'Lambi Kahani' },
};

export default function PlaylistPage() {
  const { lang } = useI18n();
  const router = useRouter();
  const audioRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const items = data?.items || [];
  const current = items[index] || null;

  // Fetch playlist
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const age = readAge();
    const tz = detectTz();
    playlistApi.getToday({ age, lang, tz })
      .then((res) => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Failed to load playlist');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [lang]);

  const playIndex = useCallback((i) => {
    const next = items[i];
    if (!next) return;
    const url = resolveAudioUrl(next);
    if (!url) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = url;
    audio.play().then(() => {
      setIsPlaying(true);
      updatePlaybackState('playing');
    }).catch((err) => {
      console.warn('[Playlist] play failed', err);
      setIsPlaying(false);
    });
    updateMediaSessionMetadata({
      title: next.title || SLOT_LABEL[next.slot]?.[lang] || 'Bedtime',
      artist: 'Dream Valley',
      album: lang === 'hi' ? 'Bedtime Routine' : 'Bedtime Routine',
      coverUrl: resolveCoverUrl(next),
    });
  }, [items, lang]);

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= items.length) {
        // Playlist complete
        const audio = audioRef.current;
        if (audio) audio.pause();
        setIsPlaying(false);
        updatePlaybackState('paused');
        return i;
      }
      return next;
    });
  }, [items.length]);

  const goBack = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    if (typeof window !== 'undefined') window.__dvAudioElement = audio;
    return () => {
      audio.pause();
      audio.src = '';
      if (typeof window !== 'undefined') delete window.__dvAudioElement;
      clearMediaSession();
    };
  }, []);

  // Wire audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => advance();
    const onPlay = () => { setIsPlaying(true); updatePlaybackState('playing'); };
    const onPause = () => { setIsPlaying(false); updatePlaybackState('paused'); };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [advance]);

  // Auto-play / load when index changes
  useEffect(() => {
    if (!items.length) return;
    playIndex(index);
  }, [index, items.length, playIndex]);

  // Register lock-screen / native media controls
  useEffect(() => {
    registerMediaSessionHandlers({
      onPlay: () => audioRef.current?.play(),
      onPause: () => audioRef.current?.pause(),
      onNextTrack: () => advance(),
      onPreviousTrack: () => goBack(),
    });
  }, [advance, goBack]);

  const stop = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    clearMediaSession();
    router.push('/');
  };

  if (loading) {
    return <Centered>{lang === 'hi' ? 'Playlist load ho rahi hai...' : 'Loading playlist...'}</Centered>;
  }
  if (error) {
    return <Centered>{error}</Centered>;
  }
  if (!items.length) {
    return (
      <Centered>
        {lang === 'hi' ? 'Aaj koi content nahin mila' : 'No content available today'}
      </Centered>
    );
  }

  const nowPlayingLabel = lang === 'hi'
    ? `Ab chal raha hai ${index + 1} / ${items.length}`
    : `Now playing ${index + 1} of ${items.length}`;

  const cover = resolveCoverUrl(current);

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={closeBtnStyle} onClick={stop} aria-label="Close">×</button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: '13px', opacity: 0.7 }}>
          {nowPlayingLabel}
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div style={coverWrapStyle}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={current?.title || ''} style={coverImgStyle} />
        ) : (
          <div style={{ ...coverImgStyle, background: '#312e81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            🌙
          </div>
        )}
      </div>

      <div style={titleStyle}>{current?.title || ''}</div>
      <div style={slotStyle}>
        {SLOT_LABEL[current?.slot]?.[lang] || current?.slot}
        {current?.is_fallback && (
          <span style={badgeStyle}>
            {lang === 'hi' ? 'Library se' : 'From our library'}
          </span>
        )}
      </div>

      <div style={controlsStyle}>
        <button style={ctrlBtnStyle} onClick={goBack} disabled={index === 0}>{'⏮'}</button>
        <button style={playPauseStyle} onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.paused) audio.play(); else audio.pause();
        }}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button style={ctrlBtnStyle} onClick={advance} disabled={index >= items.length - 1}>{'⏭'}</button>
      </div>

      <div style={queueStyle}>
        {items.map((it, i) => (
          <div
            key={`${it.slot}-${i}`}
            style={{ ...queueItemStyle, opacity: i === index ? 1 : 0.55, fontWeight: i === index ? 700 : 400 }}
            onClick={() => setIndex(i)}
          >
            <span style={{ width: 24, textAlign: 'center' }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.title || SLOT_LABEL[it.slot]?.[lang] || it.slot}
            </span>
            {it.is_fallback && <span style={miniBadgeStyle}>•</span>}
          </div>
        ))}
      </div>

      {data?.missing_slots?.length > 0 && (
        <div style={noteStyle}>
          {lang === 'hi'
            ? `Kuchh slots khaali hain: ${data.missing_slots.join(', ')}`
            : `Some slots couldn't be filled: ${data.missing_slots.join(', ')}`}
        </div>
      )}
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#08061e', padding: 24, textAlign: 'center' }}>
      {children}
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh', background: 'linear-gradient(180deg, #08061e 0%, #1e1b4b 100%)',
  color: '#fff', padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center',
};
const headerStyle = { width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: 8 };
const closeBtnStyle = {
  width: 32, height: 32, borderRadius: 16, border: 'none',
  background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 20, cursor: 'pointer',
};
const coverWrapStyle = { width: '100%', maxWidth: 320, marginTop: 16, aspectRatio: '1 / 1' };
const coverImgStyle = { width: '100%', height: '100%', borderRadius: 24, objectFit: 'cover', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' };
const titleStyle = { fontSize: 20, fontWeight: 700, marginTop: 24, textAlign: 'center', maxWidth: 480 };
const slotStyle = { fontSize: 13, opacity: 0.75, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 };
const badgeStyle = {
  fontSize: 11, padding: '2px 8px', borderRadius: 10,
  background: 'rgba(245,158,11,0.2)', color: '#fbbf24',
};
const controlsStyle = { display: 'flex', alignItems: 'center', gap: 24, marginTop: 24 };
const ctrlBtnStyle = {
  width: 56, height: 56, borderRadius: 28, border: 'none',
  background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 22, cursor: 'pointer',
};
const playPauseStyle = {
  width: 72, height: 72, borderRadius: 36, border: 'none',
  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
  fontSize: 30, cursor: 'pointer',
};
const queueStyle = {
  marginTop: 32, width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.04)',
  borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 4,
};
const queueItemStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 8px',
  borderRadius: 8, fontSize: 14, cursor: 'pointer',
};
const miniBadgeStyle = { color: '#fbbf24', fontSize: 16 };
const noteStyle = { marginTop: 16, fontSize: 12, opacity: 0.6, textAlign: 'center', maxWidth: 480 };
