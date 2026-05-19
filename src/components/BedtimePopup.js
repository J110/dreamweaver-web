'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@/utils/i18n';

const DISMISS_KEY = 'dreamvalley_bedtime_dismissed';
const BEDTIME_HOUR = 20;

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BedtimePopup() {
  const { lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      const hour = new Date().getHours();
      if (hour < BEDTIME_HOUR) {
        setVisible(false);
        return;
      }
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed === todayString()) {
        setVisible(false);
        return;
      }
      if (pathname && pathname.startsWith('/playlist')) {
        setVisible(false);
        return;
      }
      setVisible(true);
    };
    check();
    const id = setInterval(check, 60_000);
    const onVis = () => check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [pathname]);

  if (!visible) return null;

  const title = lang === 'hi' ? 'Aaj ki bedtime routine taiyaar hai' : "Today's bedtime routine is ready";
  const subtitle = lang === 'hi'
    ? 'Apna bluetooth speaker connect karo aur play dabaao'
    : 'Just connect your bluetooth speaker and hit play';
  const playLabel = lang === 'hi' ? 'Play karo' : 'Hit Play';
  const laterLabel = lang === 'hi' ? 'Baad mein' : 'Maybe later';

  const handlePlay = () => {
    router.push('/playlist');
  };

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, todayString()); } catch {}
    setVisible(false);
  };

  return (
    <div style={overlayStyle} onClick={handleDismiss}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={moonStyle}>{'🌙'}</div>
        <h2 style={titleStyle}>{title}</h2>
        <p style={subtitleStyle}>{subtitle}</p>
        <button style={playBtnStyle} onClick={handlePlay}>
          {'▶'} {playLabel}
        </button>
        <button style={dismissBtnStyle} onClick={handleDismiss}>{laterLabel}</button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(8, 6, 30, 0.78)',
  backdropFilter: 'blur(6px)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
};
const cardStyle = {
  background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)',
  borderRadius: '24px', padding: '32px 28px', maxWidth: '380px', width: '100%',
  textAlign: 'center', color: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};
const moonStyle = { fontSize: '48px', marginBottom: '12px' };
const titleStyle = { fontSize: '22px', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.25 };
const subtitleStyle = { fontSize: '15px', opacity: 0.85, margin: '0 0 24px', lineHeight: 1.4 };
const playBtnStyle = {
  width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
  fontSize: '17px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px',
};
const dismissBtnStyle = {
  width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)',
  background: 'transparent', color: '#fff', fontSize: '14px', cursor: 'pointer', opacity: 0.7,
};
