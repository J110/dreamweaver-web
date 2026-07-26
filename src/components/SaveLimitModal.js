'use client';

import { useEffect, useId, useRef } from 'react';
import styles from './SaveLimitModal.module.css';

export default function SaveLimitModal({ premium, t, onDismiss, onUpgrade, returnFocusRef }) {
  const dismissRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    dismissRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusRef?.current?.focus();
    };
  }, [onDismiss, returnFocusRef]);

  const stopClick = (event) => event.stopPropagation();
  const dismiss = (event) => {
    event.stopPropagation();
    onDismiss();
  };
  const upgrade = (event) => {
    event.stopPropagation();
    onUpgrade();
  };

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onDismiss();
      }}
      onClick={stopClick}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={stopClick}
      >
        <button
          ref={dismissRef}
          type="button"
          className={styles.dismiss}
          aria-label={t('heartCapDismiss')}
          onClick={dismiss}
        >
          ×
        </button>
        <h2 id={titleId}>{t(premium ? 'premiumCapTitle' : 'heartCapTitle')}</h2>
        <p>{t(premium ? 'premiumCapBody' : 'heartCapBody')}</p>
        {!premium && (
          <button type="button" className={styles.upgrade} onClick={upgrade}>
            {t('heartCapUpgrade')}
          </button>
        )}
      </div>
    </div>
  );
}
