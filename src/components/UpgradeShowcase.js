'use client';

import styles from './UpgradeShowcase.module.css';

/* Swap point: replace this file (and its module CSS) to change the showcase
   visual — e.g. drop in an animated preview — without touching the page/CTA. */
export default function UpgradeShowcase() {
  return (
    <div className={styles.showcase} aria-hidden="true">
      <img
        src="/upgrade-showcase.webp"
        alt=""
        className={styles.image}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.glow} />
    </div>
  );
}
