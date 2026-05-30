'use client';

import Link from 'next/link';
import { useI18n } from '@/utils/i18n';
import styles from './PremiumBanner.module.css';

export default function PremiumBanner({ message, messageHi, intentPath }) {
  const { lang } = useI18n();
  const text = lang === 'hi' && messageHi ? messageHi : message;
  const href = `/upgrade?intent=${encodeURIComponent(intentPath)}`;

  return (
    <Link href={href} className={styles.banner}>
      <span className={styles.icon}>✦</span>
      <span className={styles.text}>{text}</span>
      <span className={styles.cta}>
        Unlock <span className={styles.arrow}>›</span>
      </span>
    </Link>
  );
}
