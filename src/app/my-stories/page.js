'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import ContentShelf from '@/components/my-content/ContentShelf';
import CreationCard from '@/components/my-content/CreationCard';
import LockedPreviewCard from '@/components/my-content/LockedPreviewCard';
import ComingSoonDialog from '@/components/my-content/ComingSoonDialog';
import { isLoggedIn } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { interactionApi, subscriptionApi } from '@/utils/api';
import styles from './page.module.css';

const LOCKED_PREVIEWS = {
  characters: [
    { id: 'character-1', label: 'Moon Explorer', image: '/upgrade-showcase.webp' },
    { id: 'character-2', label: 'Dream Guardian', image: '/blog/covers/default.webp' },
  ],
  voices: [
    { id: 'voice-1', label: 'Gentle Storyteller', image: '/og-image.png' },
    { id: 'voice-2', label: 'Moonlight Voice', image: '/upgrade-showcase.webp' },
  ],
};

export default function MyStoriesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditTotal, setCreditTotal] = useState(null);
  const [activeDialogKind, setActiveDialogKind] = useState(null);
  const dialogTriggerRef = useRef(null);

  const loadUserContent = ({ silent = false } = {}) => {
    if (!silent) setLoading(true);

    return interactionApi.getUserSaves()
      .then((savesData) => {
        setFavorites(savesData.items || []);
      })
      .catch(() => {
        setFavorites([]);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    const authenticated = isLoggedIn();

    loadUserContent();

    if (authenticated) {
      setCreditTotal(null);
      subscriptionApi.getCurrent()
        .then((subscription) => {
          setCreditTotal(
            typeof subscription.credits_total === 'number'
              ? subscription.credits_total
              : null
          );
        })
        .catch(() => {
          setCreditTotal(null);
        });
    } else {
      setCreditTotal(3);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadUserContent({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const openComingSoon = (kind, event) => {
    dialogTriggerRef.current = event.currentTarget;
    setActiveDialogKind(kind);
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
          <ContentShelf
            title={t('myFavorites')}
            emptyMessage={!loading && favorites.length === 0 ? t('myEmptyFavoritesText') : ''}
            exploreLabel={t('myExplore')}
            onExplore={() => router.push('/before-bed')}
          >
            <CreationCard
              icon="＋"
              label={t('myCreateContent')}
              onActivate={(event) => openComingSoon('content', event)}
            />
            {loading && <div className={styles.loadingMessage}>{t('loading')}</div>}
            {favorites.map((item) => <ContentCard key={item.id} content={item} />)}
          </ContentShelf>

          <ContentShelf title={t('myCharacters')}>
            <CreationCard
              icon="＋"
              label={t('myCreateCharacter')}
              onActivate={(event) => openComingSoon('character', event)}
            />
            {LOCKED_PREVIEWS.characters.map((preview) => (
              <LockedPreviewCard
                key={preview.id}
                imageSrc={preview.image}
                label={preview.label}
                onActivate={(event) => openComingSoon('character', event)}
              />
            ))}
          </ContentShelf>

          <ContentShelf title={t('myVoices')}>
            <CreationCard
              icon="●"
              label={t('myRecordVoice')}
              onActivate={(event) => openComingSoon('voice', event)}
            />
            {LOCKED_PREVIEWS.voices.map((preview) => (
              <LockedPreviewCard
                key={preview.id}
                imageSrc={preview.image}
                label={preview.label}
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
