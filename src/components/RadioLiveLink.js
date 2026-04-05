'use client';

import styles from './RadioLiveLink.module.css';

export const RADIO_LIVE_URL = 'https://www.youtube.com/@DreamValleyStories/live';

export default function RadioLiveLink({ variant = 'inline', label = 'Radio' }) {
  const className = variant === 'footer' ? styles.footerLink : styles.inlineLink;
  return (
    <a
      href={RADIO_LIVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label="Dream Valley Radio live stream"
    >
      <span className={styles.liveBadge}>
        <span className={styles.pulseDot} />
        <span className={styles.liveText}>LIVE</span>
      </span>
      <span className={styles.label}>{label}</span>
    </a>
  );
}
