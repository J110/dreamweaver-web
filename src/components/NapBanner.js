'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/utils/i18n';

export default function NapBanner() {
  const { lang } = useI18n();
  const router = useRouter();

  const title = lang === 'hi' ? 'Nap time? Ek calming playlist ready hai' : 'Nap time? A calming playlist is ready';
  const subtitle = lang === 'hi'
    ? 'Soothing stories, poems aur lullabies'
    : 'Soothing stories, poems & lullabies';
  const playLabel = lang === 'hi' ? 'Play' : 'Play';

  return (
    <div style={wrapStyle} onClick={() => router.push('/nap-playlist')}>
      <div style={iconStyle}>{'☀️'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>{title}</div>
        <div style={subtitleStyle}>{subtitle}</div>
      </div>
      <button style={btnStyle} onClick={(e) => { e.stopPropagation(); router.push('/nap-playlist'); }}>
        {'▶'} {playLabel}
      </button>
    </div>
  );
}

const wrapStyle = {
  display: 'flex', alignItems: 'center', gap: '12px',
  margin: '12px 16px 0', padding: '14px 16px', borderRadius: '16px',
  background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  color: '#fff', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
};
const iconStyle = { fontSize: '28px' };
const titleStyle = { fontSize: '14px', fontWeight: 700, lineHeight: 1.25 };
const subtitleStyle = { fontSize: '12px', opacity: 0.78, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const btnStyle = {
  padding: '10px 16px', borderRadius: '12px', border: 'none',
  background: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
  color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', flexShrink: 0,
};
