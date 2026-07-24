'use client';

import { useEffect, useState } from 'react';
import { THEME_CHANGE_EVENT } from '@/utils/emberlightTheme';
import {
  clampWashSeconds,
  markUpgradeWashSeen,
  readUpgradeWashSeen,
  shouldRunUpgradeWash,
} from '@/utils/emberlightTransition';
import styles from './EmberlightUpgradeWash.module.css';

export default function EmberlightUpgradeWash() {
  const [active, setActive] = useState(false);
  const seconds = clampWashSeconds(process.env.NEXT_PUBLIC_EMBERLIGHT_WASH_SECONDS);

  useEffect(() => {
    const onPremiumChange = (event) => {
      const seen = readUpgradeWashSeen(localStorage);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const detail = event.detail ?? {};
      if (detail.previous === false && detail.current === true) {
        markUpgradeWashSeen(localStorage);
      }
      if (!shouldRunUpgradeWash({ ...detail, seen, reducedMotion })) return;
      setActive(true);
      window.setTimeout(() => setActive(false), seconds * 1000);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onPremiumChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onPremiumChange);
  }, [seconds]);

  if (!active) return null;
  return (
    <div
      className={styles.overlay}
      style={{ '--wash-seconds': `${seconds}s` }}
      aria-hidden="true"
    >
      <div className={styles.wash} />
      <div className={styles.line}>the lamp turns down…</div>
      <div className={styles.motes} />
    </div>
  );
}
