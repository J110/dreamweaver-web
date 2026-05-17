'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/utils/i18n';
import { isLoggedIn } from '@/utils/auth';
import styles from './AnonLanguagePicker.module.css';

export default function AnonLanguagePicker() {
  const { setLang, hasLanguage, ready } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (isLoggedIn()) return;
    if (hasLanguage()) return;
    setVisible(true);
  }, [ready, hasLanguage]);

  if (!visible) return null;

  const pick = (code) => {
    setLang(code);
    setVisible(false);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Choose language">
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden>🌙</div>
        <h1 className={styles.title}>Dream Valley</h1>
        <p className={styles.subtitle}>Choose your language · Apni bhasha chunein</p>
        <div className={styles.buttons}>
          <button type="button" className={styles.btn} onClick={() => pick('en')}>
            English
          </button>
          <button type="button" className={styles.btn} onClick={() => pick('hi')}>
            Hindi (Roman)
          </button>
        </div>
      </div>
    </div>
  );
}
