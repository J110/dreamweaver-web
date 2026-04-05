'use client';

import { RADIO_LIVE_URL } from './RadioLiveLink';
import styles from './RadioLiveCard.module.css';

export default function RadioLiveCard() {
  return (
    <a
      href={RADIO_LIVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      aria-label="Open Dream Valley Radio 24/7 live stream"
    >
      <div className={styles.badge}>
        <span className={styles.pulseDot} />
        <span>LIVE</span>
      </div>
      <div className={styles.content}>
        <div className={styles.emoji}>📻</div>
        <h3 className={styles.title}>Dream Valley Radio</h3>
        <p className={styles.subtitle}>24/7 stories, songs &amp; lullabies</p>
      </div>
      <div className={styles.cta}>
        <span>Tap to listen</span>
        <span className={styles.arrow}>→</span>
      </div>
    </a>
  );
}
