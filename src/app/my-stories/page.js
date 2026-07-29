'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import ContentShelf from '@/components/my-content/ContentShelf';
import CreationCard from '@/components/my-content/CreationCard';
import LockedPreviewCard from '@/components/my-content/LockedPreviewCard';
import ComingSoonDialog from '@/components/my-content/ComingSoonDialog';
import { getUser, isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { interactionApi, subscriptionApi } from '@/utils/api';
import {
  getOfflineReconciliationRunner,
  loadSavedLibrary,
  reconcileOfflineLibrary,
  subscribeOfflineLibraryChanges,
} from '@/utils/offlineLibrary';
import { openOfflineStore } from '@/utils/offlineStore';
import { getStoredDefaultVoice } from '@/utils/voicePreferences';
import { setUpgradeIntent } from '@/utils/upgradeIntent';
import styles from './page.module.css';

const LOCKED_PREVIEWS = {
  characters: [
    { id: 'character-1', labelKey: 'myMoonExplorer', image: '/covers/gen-40f8fecefbfe.svg' },
    { id: 'character-2', labelKey: 'myDreamGuardian', image: '/covers/gen-1ba62b9e17cc.svg' },
  ],
  voices: [
    { id: 'voice-1', labelKey: 'myGentleStoryteller', image: '/covers/warning-6-8-59f6.svg' },
    { id: 'voice-2', labelKey: 'myMoonlightVoice', image: '/covers/gen-8c9859bb56c2.svg' },
  ],
};

export default function MyStoriesPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditTotal, setCreditTotal] = useState(null);
  const [saveCap, setSaveCap] = useState(null);
  const [isPremiumUser, setIsPremiumUser] = useState(true);
  const [activeDialogKind, setActiveDialogKind] = useState(null);
  const dialogTriggerRef = useRef(null);
  const reconciliationRunner = getOfflineReconciliationRunner({
    getCurrentUser: getUser,
    isAuthenticated: isLoggedIn,
    api: interactionApi,
    openStore: openOfflineStore,
    reconcile: reconcileOfflineLibrary,
    getDefaultVoice: (content) => getStoredDefaultVoice(content?.lang || content?.language || lang),
  });

  const loadUserContent = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const currentUser = getUser();
      const userId = currentUser?.uid || currentUser?.family_id || currentUser?.username;
      const savesData = await loadSavedLibrary({
        userId,
        reconciliationRunner,
        getCurrentUser: getUser,
        openStore: openOfflineStore,
      });
      if (savesData.stale) {
        setFavorites([]);
        return;
      }
      setFavorites(savesData.items || []);
      setSaveCap(savesData.saveCap);
      setIsPremiumUser(savesData.effectivePremium);
    } catch {
      setFavorites([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const authenticated = isLoggedIn();
    loadUserContent();

    if (authenticated && subscriptionApi?.getCurrent) {
      subscriptionApi.getCurrent()
        .then((subscription) => {
          setCreditTotal(
            typeof subscription.credits_total === 'number'
              ? subscription.credits_total
              : null
          );
        })
        .catch(() => setCreditTotal(null));
    } else {
      setCreditTotal(3);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const refresh = () => {
      if (document.visibilityState === 'visible') loadUserContent({ silent: true });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(
    () => subscribeOfflineLibraryChanges((change) => {
      if (change?.type === 'saved-library') loadUserContent({ silent: true });
    }),
    []
  );

  const openComingSoon = (kind, event) => {
    dialogTriggerRef.current = event.currentTarget;
    setActiveDialogKind(kind);
  };

  const handleUpgrade = () => {
    const intent = `${window.location.pathname}${window.location.search}`;
    setUpgradeIntent(intent);
    router.push(`/upgrade?intent=${encodeURIComponent(intent)}`);
  };

  const dialogCopy = activeDialogKind ? {
    title: t({
      content: 'myContentComingTitle',
      character: 'myCharacterComingTitle',
      voice: 'myVoiceComingTitle',
    }[activeDialogKind]),
    body: t('myComingBody'),
    close: t('myComingSoonClose'),
  } : null;

  const planCard = isPremiumUser ? (
    <div className={styles.planCard} data-library-plan-card="premium">
      <img src="/upgrade-showcase.webp" alt="" className={styles.ticketImage} />
      <span className={styles.ticketBorder} aria-hidden />
      <span className={styles.ticketBody}>
        <span className={styles.ticketEyebrow}>Premium library</span>
        <strong>30 saves included</strong>
        <span>Save favorites and listen offline</span>
      </span>
    </div>
  ) : (
    <button
      type="button"
      onClick={handleUpgrade}
      className={`${styles.planCard} ${styles.lockedPlanCard}`}
      data-library-plan-card="free"
    >
      <img src="/upgrade-showcase.webp" alt="" className={styles.ticketImage} />
      <span className={styles.ticketBorder} aria-hidden />
      <span className={styles.ticketBody}>
        <span className={styles.ticketEyebrow}>Premium pass</span>
        <strong>Unlock your full library</strong>
        <span>30 favorites + offline downloads</span>
      </span>
    </button>
  );

  return (
    <>
      <StarField />
      <main className={styles.app}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>{t('myContentTitle')}</h1>
            <span className={styles.creditPill}>
              {t('myCredits')}: {creditTotal ?? '—'}
            </span>
          </div>
          <p className={styles.subtitle}>{t('myContentSubtitle')}</p>
        </header>

        <div className={styles.shelves}>
          <section>
            {saveCap != null && !isPremiumUser && (
              <button
                type="button"
                onClick={handleUpgrade}
                className={styles.upgradeBanner}
                data-library-upgrade-banner
              >
                <span className={styles.savedCount}>{favorites.length} of {saveCap}{' '}</span>
                <span className={styles.upgradeBannerCopy}>
                  <strong>saved</strong>
                  <small>More slots + offline downloads</small>
                </span>
                <span className={styles.upgradeBannerAction}>Get Premium →</span>
              </button>
            )}
            <ContentShelf
              title={t('myFavorites')}
              emptyMessage={!loading && favorites.length === 0 ? t('myEmptyFavoritesText') : ''}
              exploreLabel={t('myExplore')}
              onExplore={() => router.push('/before-bed')}
            >
              <CreationCard
                icon="＋"
                label={t('myCreateContent')}
                statusLabel={t('myComingSoon')}
                onActivate={(event) => openComingSoon('content', event)}
              />
              {loading && <div className={styles.loadingMessage}>{t('loading')}</div>}
              {favorites.map((item) => <ContentCard key={item.id} content={item} compact />)}
              {planCard}
            </ContentShelf>
          </section>

          <ContentShelf title={t('myCharacters')}>
            <CreationCard
              icon="＋"
              label={t('myCreateCharacter')}
              statusLabel={t('myComingSoon')}
              onActivate={(event) => openComingSoon('character', event)}
            />
            {LOCKED_PREVIEWS.characters.map((preview) => (
              <LockedPreviewCard
                key={preview.id}
                imageSrc={preview.image}
                label={t(preview.labelKey)}
                lockedLabel={t('myLocked')}
                onActivate={(event) => openComingSoon('character', event)}
              />
            ))}
          </ContentShelf>

          <ContentShelf title={t('myVoices')}>
            <CreationCard
              icon="●"
              label={t('myRecordVoice')}
              statusLabel={t('myComingSoon')}
              onActivate={(event) => openComingSoon('voice', event)}
            />
            {LOCKED_PREVIEWS.voices.map((preview) => (
              <LockedPreviewCard
                key={preview.id}
                imageSrc={preview.image}
                label={t(preview.labelKey)}
                lockedLabel={t('myLocked')}
                onActivate={(event) => openComingSoon('voice', event)}
              />
            ))}
          </ContentShelf>
        </div>
      </main>

      {activeDialogKind && (
        <ComingSoonDialog
          kind={activeDialogKind}
          copy={dialogCopy}
          onClose={() => setActiveDialogKind(null)}
          triggerRef={dialogTriggerRef}
        />
      )}
    </>
  );
}
