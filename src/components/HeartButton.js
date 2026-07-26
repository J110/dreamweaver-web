'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { interactionApi } from '@/utils/api';
import { setUpgradeIntent } from '@/utils/upgradeIntent';
import { queueOfflinePackage, removeOfflinePackage } from '@/utils/offlineLibrary';
import { openOfflineStore } from '@/utils/offlineStore';
import SaveLimitModal from './SaveLimitModal';
import styles from './HeartButton.module.css';

export default function HeartButton({
  contentId,
  content,
  selectedVoice,
  effectivePremium,
  initialSaved = false,
  initialCount = null,
  variant = 'compact',
  className = '',
  activeClassName = '',
  onAuthRequired,
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [filled, setFilled] = useState(initialSaved);
  const [count, setCount] = useState(typeof initialCount === 'number' ? initialCount : null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [limitModal, setLimitModal] = useState(null);
  const heartRef = useRef(null);

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const adjustCount = (delta) => {
    setCount((c) => (typeof c === 'number' ? Math.max(0, c + delta) : c));
  };

  const offlineUserId = () => {
    try {
      const user = getUser();
      return user?.uid || user?.family_id || user?.username || null;
    } catch {
      return null;
    }
  };

  const queueConfirmedSave = async (userId) => {
    if (!userId || !content) return;
    const offlineContent = content.id ? content : { ...content, id: contentId };
    try {
      const store = await openOfflineStore();
      await queueOfflinePackage({
        userId,
        content: offlineContent,
        selectedVoice,
        store,
        fetchImpl: globalThis.fetch,
      });
    } catch {
    }
  };

  const removeConfirmedSave = async (userId) => {
    if (!userId) return;
    try {
      const store = await openOfflineStore();
      await removeOfflinePackage({ userId, contentId, store });
    } catch {
    }
  };

  const dismissLimitModal = useCallback(() => setLimitModal(null), []);

  const handleUpgrade = () => {
    const intent = typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`;
    setUpgradeIntent(intent);
    router.push(`/upgrade?intent=${encodeURIComponent(intent)}`);
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
    const userId = offlineUserId();
    setBusy(true);

    if (!wasFilled) {
      setFilled(true);
      try {
        const res = await interactionApi.saveContent(contentId);
        if (res?.cap_reached) {
          setFilled(false);
          setLimitModal(effectivePremium === true || res.save_cap > 5 ? 'premium' : 'free');
        } else if (res?.saved) {
          adjustCount(+1);
          flashToast(t('playerSavedToProfile'));
          if (res.offline_allowed) void queueConfirmedSave(userId);
        } else {
          setFilled(false);
        }
      } catch (err) {
        setFilled(false);
        if (err?.status === 401) flashToast(t('heartSignInToSave'));
      } finally {
        setBusy(false);
      }
    } else {
      setFilled(false);
      try {
        await interactionApi.unsaveContent(contentId);
        adjustCount(-1);
        flashToast(t('playerRemovedFromSaved'));
        void removeConfirmedSave(userId);
      } catch (err) {
        setFilled(true);
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
        ref={heartRef}
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
      {limitModal && (
        <SaveLimitModal
          premium={limitModal === 'premium'}
          t={t}
          onDismiss={dismissLimitModal}
          onUpgrade={handleUpgrade}
          returnFocusRef={heartRef}
        />
      )}
    </>
  );
}
