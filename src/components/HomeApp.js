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

const THEMES = [
  { id: 'all', emoji: '\u2728' },
  { id: 'dreamy', emoji: '\uD83C\uDF19' },
  { id: 'adventure', emoji: '\u2694\uFE0F' },
  { id: 'animals', emoji: '\uD83E\uDD81' },
  { id: 'space', emoji: '\uD83D\uDE80' },
  { id: 'fantasy', emoji: '\uD83E\uDDD9' },
  { id: 'fairy_tale', emoji: '\uD83E\uDDDA' },
  { id: 'nature', emoji: '\uD83C\uDF3F' },
  { id: 'ocean', emoji: '\uD83C\uDF0A' },
  { id: 'bedtime', emoji: '\uD83D\uDECF\uFE0F' },
  { id: 'friendship', emoji: '\uD83E\uDD1D' },
  { id: 'family', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67' },
  { id: 'mystery', emoji: '\uD83D\uDD0D' },
  { id: 'science', emoji: '\uD83D\uDD2C' },
];

const THEME_LABELS = {
  all: { en: 'All', hi: 'Sabhi' },
  dreamy: { en: 'Dreamy', hi: 'Sapne' },
  adventure: { en: 'Adventure', hi: 'Sahas' },
  animals: { en: 'Animals', hi: 'Janwar' },
  space: { en: 'Space', hi: 'Antariksh' },
  fantasy: { en: 'Fantasy', hi: 'Kalpana' },
  fairy_tale: { en: 'Fairy Tales', hi: 'Pari Kathayein' },
  nature: { en: 'Nature', hi: 'Prakriti' },
  ocean: { en: 'Ocean', hi: 'Samudra' },
  bedtime: { en: 'Bedtime', hi: 'Sone ka Samay' },
  friendship: { en: 'Friendship', hi: 'Dosti' },
  family: { en: 'Family', hi: 'Parivar' },
  mystery: { en: 'Mystery', hi: 'Rahasya' },
  science: { en: 'Science', hi: 'Vigyan' },
};

export default function HomeApp() {
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTheme, setActiveTheme] = useState('all');

  useEffect(() => {
    if (isLoggedIn()) {
      setUser(getUser());
    }
    loadStories();
  }, [lang]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await trendingApi.getTrending(100, lang);
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

  const filteredStories = activeTheme === 'all'
    ? stories
    : stories.filter((s) => s.theme === activeTheme);

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

        {/* Theme Filter Pills */}
        <div className={styles.themeFilter}>
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveTheme(theme.id)}
              className={`${styles.themePill} ${activeTheme === theme.id ? styles.themePillActive : ''}`}
            >
              <span>{theme.emoji}</span>
              <span>{THEME_LABELS[theme.id]?.[lang] || THEME_LABELS[theme.id]?.en}</span>
            </button>
          ))}
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
