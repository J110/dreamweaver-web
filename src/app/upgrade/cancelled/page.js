'use client';

import Link from 'next/link';
import StarField from '@/components/StarField';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

const UNLOCKS_EN = [
  'Voice cloning so stories are in your voice',
  '30-day backlog of every story you’ve ever played',
  '30 personalized stories every month',
  "Episodic memory — your kid's character carries between stories",
];

const UNLOCKS_HI = [
  'Voice cloning — kahaniyaan aapki aawaaz mein',
  'Pichhle 30 din ki sabhi kahaniyaan',
  '30 personalized kahaniyaan har mahine',
  'Episodic memory — aapke kid ka character kahaniyon ke beech yaad rakhta hai',
];

export default function UpgradeCancelledPage() {
  const { lang } = useI18n();
  const unlocks = lang === 'hi' ? UNLOCKS_HI : UNLOCKS_EN;

  return (
    <>
      <StarField />
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>
            {lang === 'hi'
              ? 'Koi baat nahi — Dream Valley aapka free version hamesha hai.'
              : "No worries — Dream Valley is still yours, free."}
          </h1>

          <p className={styles.subtitle}>
            {lang === 'hi'
              ? 'Premium ke saath yeh sab unlock hota:'
              : "What you'd unlock with Premium:"}
          </p>

          <ul className={styles.bulletList}>
            {unlocks.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>

          <div className={styles.actions}>
            <Link href="/pricing" className={styles.primaryBtn}>
              {lang === 'hi' ? 'Premium phir try karein' : 'Try Premium again'}
            </Link>
            <Link href="/" className={styles.secondaryLink}>
              {lang === 'hi' ? 'Wapas Dream Valley' : 'Back to Dream Valley'}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
