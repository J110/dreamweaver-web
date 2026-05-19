'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/utils/i18n';

const BEDTIME_HOUR = 20;

export default function BedtimeBanner() {
  const { lang } = useI18n();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(new Date().getHours() >= BEDTIME_HOUR);
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!show) return null;

  const title = lang === 'hi' ? 'Aaj ki bedtime routine taiyaar hai' : "Today's bedtime routine is ready";
  const subtitle = lang === 'hi'
    ? 'Apna bluetooth speaker connect karo aur play dabaao'
    : 'Just connect your bluetooth speaker and hit play';
  const playLabel = lang === 'hi' ? 'Play' : 'Play';

  return (
    <div style={wrapStyle} onClick={() => router.push('/playlist')}>
      <div style={iconStyle}>{'🌙'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>{title}</div>
        <div style={subtitleStyle}>{subtitle}</div>
      </div>
      <button style={btnStyle} onClick={(e) => { e.stopPropagation(); router.push('/playlist'); }}>
        {'▶'} {playLabel}
      </button>
    </div>
  );
}

const wrapStyle = {
  display: 'flex', alignItems: 'center', gap: '12px',
  margin: '12px 16px 0', padding: '14px 16px', borderRadius: '16px',
  background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)',
  color: '#fff', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
};
const iconStyle = { fontSize: '28px' };
const titleStyle = { fontSize: '14px', fontWeight: 700, lineHeight: 1.25 };
const subtitleStyle = { fontSize: '12px', opacity: 0.78, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const btnStyle = {
  padding: '10px 16px', borderRadius: '12px', border: 'none',
  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
  color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', flexShrink: 0,
};
