'use client';

import { useI18n } from '@/utils/i18n';
import { RADIO_LIVE_URL } from './RadioLiveLink';
import styles from './RadioLiveCard.module.css';

const COPY = {
  en: {
    aria: 'Open Dream Valley Radio 24/7 live stream',
    subtitle: '24/7 stories, songs & lullabies',
    cta: 'Tap to listen',
  },
  hi: {
    aria: 'Dream Valley Radio 24/7 live stream kholein',
    subtitle: '24/7 kahaniyaan, gaane aur loriyaan',
    cta: 'Sunne ke liye tap karein',
  },
};

export default function RadioLiveCard() {
  const { lang } = useI18n();
  const c = COPY[lang] || COPY.en;
  return (
    <a
      href={RADIO_LIVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
      aria-label={c.aria}
    >
      <div className={styles.badge}>
        <span className={styles.pulseDot} />
        <span>LIVE</span>
      </div>
      <div className={styles.content}>
        <div className={styles.emoji}>📻</div>
        <h3 className={styles.title}>Dream Valley Radio</h3>
        <p className={styles.subtitle}>{c.subtitle}</p>
      </div>
      <div className={styles.cta}>
        <span>{c.cta}</span>
        <span className={styles.arrow}>→</span>
      </div>
    </a>
  );
}
