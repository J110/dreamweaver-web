'use client';

import styles from './UpgradeShowcase.module.css';

export default function UpgradeShowcase() {
  return (
    <div className={styles.showcase} aria-hidden="true">
      <div className={styles.sky}>
        {/* Moon */}
        <div className={styles.moon}>
          <div className={styles.moonGlow} />
          <div className={styles.moonSurface}>
            <div className={styles.crater} style={{ top: '28%', left: '32%', width: 10, height: 10 }} />
            <div className={styles.crater} style={{ top: '55%', left: '58%', width: 6, height: 6 }} />
            <div className={styles.crater} style={{ top: '40%', left: '20%', width: 4, height: 4 }} />
          </div>
        </div>

        {/* Orbiting stars around moon */}
        <div className={styles.orbitRing}>
          <div className={styles.orbitStar} style={{ '--orbit-delay': '0s' }} />
        </div>
        <div className={styles.orbitRing} style={{ '--ring-size': '110px', '--ring-duration': '9s' }}>
          <div className={styles.orbitStar} style={{ '--orbit-delay': '-3s', '--star-size': '4px' }} />
        </div>

        {/* Small accent stars */}
        <div className={styles.accentStar} style={{ top: '12%', left: '14%', '--twinkle-delay': '0.3s', '--star-size': '6px' }} />
        <div className={styles.accentStar} style={{ top: '20%', left: '80%', '--twinkle-delay': '1.1s', '--star-size': '5px' }} />
        <div className={styles.accentStar} style={{ top: '65%', left: '8%', '--twinkle-delay': '0.7s', '--star-size': '4px' }} />
        <div className={styles.accentStar} style={{ top: '75%', left: '85%', '--twinkle-delay': '1.8s', '--star-size': '5px' }} />
        <div className={styles.accentStar} style={{ top: '8%', left: '55%', '--twinkle-delay': '0.5s', '--star-size': '3px' }} />
        <div className={styles.accentStar} style={{ top: '50%', left: '92%', '--twinkle-delay': '2.1s', '--star-size': '3px' }} />

        {/* Lamplight glow pool at bottom */}
        <div className={styles.lampGlow} />
      </div>

      {/* Scene floor — cozy lamplight tableau */}
      <div className={styles.scene}>
        {/* Open book */}
        <div className={styles.book}>
          <div className={styles.bookLeft}>
            <div className={styles.bookLine} />
            <div className={styles.bookLine} style={{ width: '70%' }} />
            <div className={styles.bookLine} style={{ width: '85%' }} />
            <div className={styles.bookLine} style={{ width: '60%' }} />
          </div>
          <div className={styles.bookSpine} />
          <div className={styles.bookRight}>
            <div className={styles.bookLine} />
            <div className={styles.bookLine} style={{ width: '80%' }} />
            <div className={styles.bookLine} style={{ width: '65%' }} />
            <div className={styles.bookLine} style={{ width: '75%' }} />
          </div>
        </div>

        {/* Candle / lamp */}
        <div className={styles.lamp}>
          <div className={styles.flame}>
            <div className={styles.flameInner} />
          </div>
          <div className={styles.candleBody} />
          <div className={styles.candleBase} />
        </div>
      </div>
    </div>
  );
}
