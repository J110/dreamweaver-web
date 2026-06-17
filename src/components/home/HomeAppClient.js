'use client';

import { useEffect, useState } from 'react';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import BedtimeBanner from '@/components/BedtimeBanner';
import NapBanner from '@/components/NapBanner';
import { isLoggedIn, getUser } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { isStory, isLongStory, isLullaby, getSectionLabel } from '@/utils/contentTypes';
import { sortByDiscovery } from '@/utils/listeningHistory';
import styles from '@/app/page.module.css';

const AGE_GROUPS = [
  { id: 'all', emoji: '✨', label: { en: 'All', hi: 'Sabhi' } },
  { id: '0-1', emoji: '👶', label: { en: '0-1 yrs', hi: '0-1 saal' }, min: 0, max: 1 },
  { id: '2-5', emoji: '🧒', label: { en: '2-5 yrs', hi: '2-5 saal' }, min: 2, max: 5 },
  { id: '6-8', emoji: '👦', label: { en: '6-8 yrs', hi: '6-8 saal' }, min: 6, max: 8 },
  { id: '9-12', emoji: '🧑', label: { en: '9-12 yrs', hi: '9-12 saal' }, min: 9, max: 12 },
];

const MOODS = [
  { id: 'all', emoji: '✨', label: { en: 'All', hi: 'Sabhi' } },
  { id: 'calm', emoji: '😌', label: { en: 'Calm', hi: 'Shaant' } },
  { id: 'curious', emoji: '🤔', label: { en: 'Curious', hi: 'Curious' } },
  { id: 'sad', emoji: '🥹', label: { en: 'Sad', hi: 'Udaas' } },
  { id: 'anxious', emoji: '😟', label: { en: 'Anxious', hi: 'Pareshaan' } },
  { id: 'wired', emoji: '⚡', label: { en: 'Wired', hi: 'Hyper' } },
  { id: 'angry', emoji: '😤', label: { en: 'Angry', hi: 'Gussa' } },
];

export default function HomeAppClient({ lang, initialItems }) {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [activeAge, setActiveAge] = useState('all');
  const [activeMood, setActiveMood] = useState('all');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dv_language_filter');
    }
  }, []);

  const loadStories = async () => {
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('dreamweaver_token')) || '';
      const res = await fetch(`/api/home-grid?lang=${encodeURIComponent(lang)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.content)) setStories(data.content);
    } catch { /* keep current items */ }
  };

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
    loadStories();

    const handler = () => {
      if (isLoggedIn()) {
        setUser(getUser());
      }
      loadStories();
    };
    window.addEventListener('dv-auth-changed', handler);
    return () => window.removeEventListener('dv-auth-changed', handler);
  }, [lang]);

  const getAgeGroup = (s) => {
    if (s.age_group) return s.age_group;
    const age = s.target_age;
    if (age == null) return null;
    if (age <= 1) return '0-1';
    if (age <= 5) return '2-5';
    if (age <= 8) return '6-8';
    return '9-12';
  };

  const filteredStories = stories.filter((s) => {
    if (activeAge !== 'all') {
      const ageGroup = getAgeGroup(s);
      if (ageGroup !== activeAge) return false;
    }
    if (activeMood !== 'all') {
      if (s.mood !== activeMood) return false;
    }
    return true;
  });

  const storyItems = sortByDiscovery(filteredStories.filter(isStory));
  const longStoryItems = sortByDiscovery(filteredStories.filter(isLongStory));
  const lullabyItems = sortByDiscovery(filteredStories.filter(isLullaby));

  const appName = lang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley';
  const logoSrc = lang === 'hi' ? '/logo-hi.png' : '/logo-new.png';

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <BedtimeBanner />
        <NapBanner />
        <div className={styles.appHeader}>
          <div className={styles.headerLeft}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt={appName} className={styles.headerLogo} />
          </div>
          {user && (
            <div className={styles.headerRight}>
              <span className={styles.greeting}>
                {t('homeGreeting')}, {user.username}
              </span>
            </div>
          )}
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{lang === 'hi' ? 'Umra' : 'Age'}</span>
          <div className={styles.themeFilter}>
            {AGE_GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveAge(g.id)}
                className={`${styles.themePill} ${activeAge === g.id ? styles.themePillActive : ''}`}
              >
                <span>{g.emoji}</span>
                <span>{g.label[lang] || g.label.en}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>{lang === 'hi' ? 'Mood' : 'Mood'}</span>
          <div className={styles.themeFilter}>
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveMood(m.id)}
                className={`${styles.themePill} ${activeMood === m.id ? styles.themePillActive : ''}`}
              >
                <span>{m.emoji}</span>
                <span>{m.label[lang] || m.label.en}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingMsg}>{t('loading')}</div>
        ) : (
          <div className={styles.sections}>
            {storyItems.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {lang === 'hi' ? '📖 Kahaniyan' : '📖 Short Stories'}
                </h2>
                <div className={styles.horizontalScroll}>
                  {storyItems.map((item) => (
                    <div key={item.id} className={styles.cardWrapper}>
                      <ContentCard content={item} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {longStoryItems.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {lang === 'hi' ? '🌙 Lambi Kahaniyan' : '🌙 Long Stories'}
                </h2>
                <div className={styles.horizontalScroll}>
                  {longStoryItems.map((item) => (
                    <div key={item.id} className={styles.cardWrapper}>
                      <ContentCard content={item} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {lullabyItems.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {getSectionLabel('lullaby', lang)}
                </h2>
                <div className={styles.horizontalScroll}>
                  {lullabyItems.map((item) => (
                    <div key={item.id} className={styles.cardWrapper}>
                      <ContentCard content={item} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredStories.length === 0 && (
              <div className={styles.emptyMsg}>{t('noStories')}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
