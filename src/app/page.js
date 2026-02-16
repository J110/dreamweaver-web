'use client';

import { useEffect, useState } from 'react';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import { isLoggedIn, getUser } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { trendingApi } from '@/utils/api';
import { getStories } from '@/utils/seedData';
import styles from './page.module.css';

const THEMES = [
  { id: 'all', emoji: '✨' },
  { id: 'dreamy', emoji: '🌙' },
  { id: 'adventure', emoji: '⚔️' },
  { id: 'animals', emoji: '🦁' },
  { id: 'space', emoji: '🚀' },
  { id: 'fantasy', emoji: '🧙' },
  { id: 'fairy_tale', emoji: '🧚' },
  { id: 'nature', emoji: '🌿' },
  { id: 'ocean', emoji: '🌊' },
  { id: 'bedtime', emoji: '🛏️' },
  { id: 'friendship', emoji: '🤝' },
  { id: 'family', emoji: '👨‍👩‍👧' },
  { id: 'science', emoji: '🔬' },
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
  science: { en: 'Science', hi: 'Vigyan' },
};

export default function Home() {
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
      const data = await trendingApi.getTrending(40, lang);
      const apiItems = data.content || [];
      const seedItems = getStories(lang);
      // Merge: use API items as base, then add any seedData stories not already present
      const apiIds = new Set(apiItems.map((s) => s.id));
      const titleMap = new Set(apiItems.map((s) => s.title));
      const extras = seedItems.filter(
        (s) => !apiIds.has(s.id) && !titleMap.has(s.title)
      );
      const merged = [...apiItems, ...extras];
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

  const storyItems = filteredStories.filter((s) => s.type === 'story');
  const poemItems = filteredStories.filter((s) => s.type === 'poem');
  const songItems = filteredStories.filter((s) => s.type === 'song');

  const appName = lang === 'hi' ? 'Sapno ki Duniya' : 'Dream Valley';
  const logoSrc = lang === 'hi' ? '/logo-hi.svg' : '/logo-new.svg';

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
                  {lang === 'hi' ? '📖 Kahaniyan' : '📖 Stories'}
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
                  {lang === 'hi' ? '🎵 Gaane' : '🎵 Songs'}
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
