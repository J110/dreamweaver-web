'use client';

import { useState } from 'react';
import { isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { interactionApi } from '@/utils/api';
import { isNativeApp } from '@/utils/platformDetect';
import styles from './HeartButton.module.css';

const HINT_SESSION_KEY = 'dv_heart_cap_hint_shown';

export default function HeartButton({
  contentId,
  effectivePremium,
  initialSaved = false,
  initialCount = null,
  variant = 'compact',
  className = '',
  activeClassName = '',
  onAuthRequired,
}) {
  const { t } = useI18n();
  // filled = heart shows as active. mode tracks WHY it's filled so untapping
  // calls the right teardown (a cap-fallback like must be unliked, not unsaved).
  const [filled, setFilled] = useState(initialSaved);
  const [mode, setMode] = useState(initialSaved ? 'saved' : null);
  const [count, setCount] = useState(typeof initialCount === 'number' ? initialCount : null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const adjustCount = (delta) => {
    setCount((c) => (typeof c === 'number' ? Math.max(0, c + delta) : c));
  };

  const handleClick = async (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (busy) return;

    if (!isLoggedIn()) {
      if (onAuthRequired) return onAuthRequired();
      // Soft inline prompt — never bounce to the magic-link /login wall.
      flashToast(t('heartSignInToSave'));
      return;
    }

    const wasFilled = filled;
    const prevMode = mode;
    setBusy(true);

    if (!wasFilled) {
      // Optimistic fill.
      setFilled(true);
      try {
        const res = await interactionApi.saveContent(contentId);
        if (res?.cap_reached) {
          // Backend registered a like, NOT a save. Heart still fills.
          setMode('liked');
          // Gentle upgrade hint only for the FREE cap (save_cap === 5), on
          // web, not premium, and at most once per session. Native = "Liked!"
          // only (reader-app rule). Premium hitting their own 20 cap = "Liked!".
          const freeCapHit = typeof res.save_cap === 'number' && res.save_cap <= 5;
          const showHint =
            !isNativeApp() &&
            effectivePremium !== true &&
            freeCapHit &&
            typeof window !== 'undefined' &&
            !sessionStorage.getItem(HINT_SESSION_KEY);
          if (showHint) {
            sessionStorage.setItem(HINT_SESSION_KEY, '1');
            flashToast(t('heartCapHint'));
          } else {
            flashToast(t('heartLiked'));
          }
        } else {
          setMode('saved');
          adjustCount(+1);
          flashToast(t('playerSavedToProfile'));
        }
      } catch (err) {
        setFilled(false);
        setMode(prevMode);
        // 401 from silent401: token preserved, no logout, no /login bounce.
        if (err?.status === 401) flashToast(t('heartSignInToSave'));
      } finally {
        setBusy(false);
      }
    } else {
      // Optimistic un-fill.
      setFilled(false);
      setMode(null);
      try {
        if (prevMode === 'liked') {
          await interactionApi.unlikeContent(contentId);
        } else {
          await interactionApi.unsaveContent(contentId);
          adjustCount(-1);
        }
        flashToast(t('playerRemovedFromSaved'));
      } catch (err) {
        setFilled(true);
        setMode(prevMode);
        if (err?.status === 401) flashToast(t('heartSignInToSave'));
      } finally {
        setBusy(false);
      }
    }
  };

  // 'full' (player) keeps its host styling + always-❤️ look untouched, so the
  // existing screen is visually identical. 'compact' (playlist) gets the
  // component's own heart styling + the empty→filled swap and pop.
  const base = variant === 'compact' ? styles.heart : '';
  const pop = variant === 'compact' && filled ? styles.filled : '';
  const cls = `${className} ${filled ? activeClassName : ''} ${base} ${pop}`.trim();

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cls}
        aria-pressed={filled}
        aria-label={filled ? 'Saved' : 'Save'}
      >
        {variant === 'full' ? (
          <>
            <span aria-hidden>❤️</span>
            {typeof count === 'number' && <span>{count}</span>}
          </>
        ) : (
          <span aria-hidden>{filled ? '❤️' : '🤍'}</span>
        )}
      </button>
      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  );
}
