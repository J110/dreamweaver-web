'use client';

import { useEffect, useRef } from 'react';
import styles from './SaveLimitModal.module.css';

export default function SaveLimitModal({ premium, t, onDismiss, onUpgrade }) {
  const dismissRef = useRef(null);

  useEffect(() => {
    dismissRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const titleId = 'save-limit-title';

  return (
    <div className={styles.backdrop} onMouseDown={onDismiss}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={dismissRef}
          type="button"
          className={styles.dismiss}
          aria-label={t('heartCapDismiss')}
          onClick={onDismiss}
        >
          ×
        </button>
        <h2 id={titleId}>{t(premium ? 'premiumCapTitle' : 'heartCapTitle')}</h2>
        <p>{t(premium ? 'premiumCapBody' : 'heartCapBody')}</p>
        {!premium && (
          <button type="button" className={styles.upgrade} onClick={onUpgrade}>
            {t('heartCapUpgrade')}
          </button>
        )}
      </div>
    </div>
  );
}
