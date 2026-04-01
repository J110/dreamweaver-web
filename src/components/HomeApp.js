'use client';

/**
 * HomeApp — The authenticated story grid experience.
 * Extracted from the original page.js so it can coexist with the landing page.
 * This is shown to logged-in users and native app WebView users.
 */

import { useEffect, useState } from 'react';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import { isLoggedIn, getUser } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { trendingApi } from '@/utils/api';
import { getStories } from '@/utils/seedData';
import { sortByDiscovery } from '@/utils/listeningHistory';
import styles from '@/app/page.module.css';

const AGE_GROUPS = [
  { id: 'all', emoji: '\u2728', label: { en: 'All', hi: 'Sabhi' } },
  { id: '0-1', emoji: '\uD83D\uDC76', label: { en: '0-1 yrs', hi: '0-1 saal' }, min: 0, max: 1 },
  { id: '2-5', emoji: '\uD83E\uDDD2', label: { en: '2-5 yrs', hi: '2-5 saal' }, min: 2, max: 5 },
  { id: '6-8', emoji: '\uD83D\uDC66', label: { en: '6-8 yrs', hi: '6-8 saal' }, min: 6, max: 8 },
  { id: '9-12', emoji: '\uD83E\uDDD1', label: { en: '9-12 yrs', hi: '9-12 saal' }, min: 9, max: 12 },
];

const MOODS = [
  { id: 'all', emoji: '\u2728', label: { en: 'All', hi: 'Sabhi' } },
  { id: 'calm', emoji: '\uD83D\uDE0C', label: { en: 'Calm', hi: 'Shant' } },
  { id: 'curious', emoji: '\uD83E\uDD14', label: { en: 'Curious', hi: 'Jigyasu' } },
  { id: 'sad', emoji: '\uD83E\uDD79', label: { en: 'Sad', hi: 'Udaas' } },
  { id: 'anxious', emoji: '\uD83D\uDE1F', label: { en: 'Anxious', hi: 'Chintit' } },
  { id: 'wired', emoji: '\u26A1', label: { en: 'Wired', hi: 'Chanchal' } },
  { id: 'angry', emoji: '\uD83D\uDE24', label: { en: 'Angry', hi: 'Gussa' } },
];

const LANGUAGE_LEVELS = [
  { id: 'basic', label: { en: 'Keep Simple', hi: 'Saral' } },
  { id: 'intermediate', label: { en: 'Medium', hi: 'Madhyam' } },
  { id: 'advanced', label: { en: 'Challenge', hi: 'Chunauti' } },
];

export default function HomeApp() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAge, setActiveAge] = useState('all');
  const [activeMood, setActiveMood] = useState('all');
  const [activeLanguageLevel, setActiveLanguageLevel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dv_language_filter') || 'all';
    }
    return 'all';
  });
  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
    loadStories();
  }, [lang]);

  const loadStories = async () => {
    // Show seed data instantly so the page isn't blank while API loads
    if (stories.length === 0) {
      setStories(getStories(lang));
    }
    setLoading(true);
    try {
      const data = await trendingApi.getTrending(200, lang);
      const apiItems = data.content || [];
      const seedItems = getStories(lang);
      const seedById = {};
      const seedByTitle = {};
      for (const s of seedItems) {
        seedById[s.id] = s;
        seedByTitle[s.title] = s;
      }
      const hasRealCover = (c) => c && !c.includes('default.svg');
      const enriched = apiItems.map((item) => {
        const seed = seedById[item.id] || seedByTitle[item.title];
        const base = {
          ...item,
          addedAt: item.addedAt || item.created_at,
        };
        if (!seed) return base;
        return {
          ...base,
          cover: hasRealCover(item.cover) ? item.cover : (seed.cover || item.cover),
          audio_variants: item.audio_variants || seed.audio_variants,
          musicParams: item.musicParams || seed.musicParams,
          musicProfile: item.musicProfile || seed.musicProfile,
          addedAt: item.addedAt || seed.addedAt || item.created_at,
          duration: item.duration || seed.duration,
          story_type: item.story_type || seed.story_type,
        };
      });
      const apiIds = new Set(apiItems.map((s) => s.id));
      const titleMap = new Set(apiItems.map((s) => s.title));
      const extras = seedItems.filter(
        (s) => !apiIds.has(s.id) && !titleMap.has(s.title)
      );
      const merged = [...enriched, ...extras];
      setStories(merged.length > 0 ? merged : seedItems);
    } catch (err) {
      setStories(getStories(lang));
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageLevelChange = (levelId) => {
    setActiveLanguageLevel(levelId);
    if (typeof window !== 'undefined') {
      if (levelId === 'all') {
        localStorage.removeItem('dv_language_filter');
      } else {
        localStorage.setItem('dv_language_filter', levelId);
      }
    }
  };

  // Match ContentCard's age resolution: prefer age_group, fall back to target_age
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
    if (activeLanguageLevel !== 'all') {
      if (s.language_level !== activeLanguageLevel) return false;
    }
    return true;
  });

  const storyItems = sortByDiscovery(filteredStories.filter((s) => s.type === 'story'));
  const longStoryItems = sortByDiscovery(filteredStories.filter((s) => s.type === 'long_story'));
  const poemItems = sortByDiscovery(filteredStories.filter((s) => s.type === 'poem'));
  const songItems = sortByDiscovery(filteredStories.filter((s) => s.type === 'song'));

  const appName = lang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley';
  const logoSrc = lang === 'hi' ? '/logo-hi.png' : '/logo-new.png';

  return (
    <>
      <StarField />
      <div className={styles.app}>
        {/* App Header */}
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

        {/* Announcement Banner */}
        <div className={styles.banner}>
          <div className={styles.bannerIcon}>🎉</div>
          <div className={styles.bannerContent}>
            <h3 className={styles.bannerTitle}>{t('homeBannerTitle')}</h3>
            <p className={styles.bannerText}>{t('homeBannerText')}</p>
          </div>
        </div>

        {/* Filter Pills */}
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
          <span className={styles.filterLabel}>{lang === 'hi' ? 'Bhasha' : 'Language'}</span>
          <div className={styles.themeFilter}>
            <button
              onClick={() => setActiveLanguageLevel('all')}
              className={`${styles.themePill} ${activeLanguageLevel === 'all' ? styles.themePillActive : ''}`}
            >
              <span>✨</span>
              <span>{lang === 'hi' ? 'Sabhi' : 'All'}</span>
            </button>
            {LANGUAGE_LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLanguageLevel(l.id)}
                className={`${styles.themePill} ${activeLanguageLevel === l.id ? styles.themePillActive : ''}`}
              >
                <span>{l.label[lang] || l.label.en}</span>
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

        {/* Content */}
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

            {poemItems.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {lang === 'hi' ? '📝 Kavitayein' : '📝 Poems'}
                </h2>
                <div className={styles.horizontalScroll}>
                  {poemItems.map((item) => (
                    <div key={item.id} className={styles.cardWrapper}>
                      <ContentCard content={item} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {songItems.length > 0 && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>
                  {lang === 'hi' ? '🎵 Loriyaan' : '🎵 Lullabies'}
                </h2>
                <div className={styles.horizontalScroll}>
                  {songItems.map((item) => (
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
