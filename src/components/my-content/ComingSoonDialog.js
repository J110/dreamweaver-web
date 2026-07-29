'use client';

import { useEffect, useRef } from 'react';
import styles from './ComingSoonDialog.module.css';

export default function ComingSoonDialog({ kind, copy, onClose, triggerRef }) {
  const closeRef = useRef(null);
  const activeElementRef = useRef(null);

  const restoreFocus = () => {
    (triggerRef?.current || activeElementRef.current)?.focus();
  };

  const handleClose = () => {
    restoreFocus();
    onClose();
  };

  useEffect(() => {
    activeElementRef.current = document.activeElement;
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus();
    };
  }, [onClose, triggerRef]);

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) handleClose();
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`coming-soon-${kind}`} className={styles.dialog}>
        <h2 id={`coming-soon-${kind}`}>{copy.title}</h2>
        <p>{copy.body}</p>
        <button ref={closeRef} type="button" onClick={handleClose}>{copy.close}</button>
      </div>
    </div>
  );
}
