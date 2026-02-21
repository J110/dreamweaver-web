'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import { isLoggedIn, getUser } from '@/utils/auth';
import { useI18n } from '@/utils/i18n';
import { interactionApi } from '@/utils/api';
import styles from './page.module.css';

const THEMES_DATA = [
  { id: 'fantasy', en: '🧙 Fantasy', hi: '🧙 Kalpana' },
  { id: 'adventure', en: '⚔️ Adventure', hi: '⚔️ Sahas' },
  { id: 'animals', en: '🦁 Animals', hi: '🦁 Janwar' },
  { id: 'space', en: '🚀 Space', hi: '🚀 Antariksh' },
  { id: 'ocean', en: '🐚 Ocean', hi: '🐚 Samundar' },
  { id: 'forest', en: '🌲 Forest', hi: '🌲 Jungle' },
  { id: 'magic', en: '✨ Magic', hi: '✨ Jaadu' },
  { id: 'friendship', en: '👫 Friendship', hi: '👫 Dosti' },
];

export default function MyStoriesPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('favorites');
  const [favorites, setFavorites] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [prefThemes, setPrefThemes] = useState([]);
  const [prefLength, setPrefLength] = useState('medium');
  const [prefContentType, setPrefContentType] = useState('story');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    setUser(getUser());

    if (typeof window !== 'undefined') {
      const savedPrefs = localStorage.getItem('dreamvalley_preferences');
      if (savedPrefs) {
        try {
          const prefs = JSON.parse(savedPrefs);
          setPrefThemes(prefs.themes || []);
          setPrefLength(prefs.length || 'medium');
          setPrefContentType(prefs.contentType || 'story');
        } catch (e) {}
      }
    }
    loadUserContent();
  }, [router]);

  const loadUserContent = async () => {
    setLoading(true);
    try {
      const savesData = await interactionApi.getUserSaves().catch(() => ({ items: [] }));
      const items = savesData.items || [];
      setFavorites(items);
      setSaved(items);
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dreamvalley_preferences', JSON.stringify({
        themes: prefThemes, length: prefLength, contentType: prefContentType,
      }));
    }
  }, [prefThemes, prefLength, prefContentType]);

  const toggleTheme = (themeId) => {
    setPrefThemes((prev) => prev.includes(themeId)
      ? prev.filter((t) => t !== themeId)
      : [...prev, themeId]
    );
  };

  const getFilteredContent = (items) => {
    if (filterType === 'all') return items;
    return items.filter((item) => item.type?.toLowerCase() === filterType);
  };

  if (!user) return null;

  const displayContent = favorites;
  const filteredContent = getFilteredContent(displayContent);

  return (
    <>
      <StarField />
      <div className={styles.app}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('myStoriesTitle')}</h1>
          <p className={styles.subtitle}>{t('myStoriesSubtitle')}</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button onClick={() => setActiveTab('favorites')} className={`${styles.tab} ${activeTab === 'favorites' ? styles.tabActive : ''}`}>
            ❤️ {t('myFavorites')}
          </button>
          <button onClick={() => setActiveTab('preferences')} className={`${styles.tab} ${activeTab === 'preferences' ? styles.tabActive : ''}`}>
            ⚙️ {t('myPreferences')}
          </button>
        </div>

        {activeTab !== 'preferences' ? (
          <>
            <div className={styles.filterBar}>
              {[
                { id: 'all', label: lang === 'hi' ? 'Sabhi' : 'All' },
                { id: 'story', label: lang === 'hi' ? 'Kahaniyan' : 'Short Stories' },
                { id: 'poem', label: lang === 'hi' ? 'Kavitayein' : 'Poems' },
                { id: 'song', label: lang === 'hi' ? 'Gaane' : 'Songs' },
              ].map((type) => (
                <button key={type.id} onClick={() => setFilterType(type.id)}
                  className={`${styles.filterChip} ${filterType === type.id ? styles.filterChipActive : ''}`}
                >{type.label}</button>
              ))}
            </div>

            {loading ? (
              <div className={styles.loadingMessage}>{t('loading')}</div>
            ) : filteredContent.length > 0 ? (
              <div className={styles.grid}>
                {filteredContent.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>❤️</div>
                <h3 className={styles.emptyTitle}>
                  {t('myEmptyFavorites')}
                </h3>
                <p className={styles.emptyText}>
                  {t('myEmptyFavoritesText')}
                </p>
                <button onClick={() => router.push('/explore')} className="btn btn-primary">
                  {t('myExplore')}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.preferencesSection}>
            <div className={styles.prefCard}>
              <h2 className={styles.prefTitle}>{t('myPrefThemes')}</h2>
              <p className={styles.prefDescription}>{t('myPrefThemesDesc')}</p>
              <div className={styles.themeGrid}>
                {THEMES_DATA.map((theme) => (
                  <button key={theme.id} onClick={() => toggleTheme(theme.id)}
                    className={`${styles.themeChip} ${prefThemes.includes(theme.id) ? styles.themeChipActive : ''}`}
                  >{theme[lang] || theme.en}</button>
                ))}
              </div>
            </div>

            <div className={styles.prefCard}>
              <h2 className={styles.prefTitle}>{t('myPrefContent')}</h2>
              <p className={styles.prefDescription}>{t('myPrefContentDesc')}</p>
              <div className={styles.prefOptions}>
                {[
                  { id: 'story', icon: '✨', en: 'Short Stories', hi: 'Kahaniyan' },
                  { id: 'poem', icon: '📖', en: 'Poems', hi: 'Kavitayein' },
                  { id: 'song', icon: '🎵', en: 'Songs', hi: 'Gaane' },
                ].map((type) => (
                  <button key={type.id} onClick={() => setPrefContentType(type.id)}
                    className={`${styles.prefOption} ${prefContentType === type.id ? styles.prefOptionActive : ''}`}
                  >
                    <span className={styles.prefOptionIcon}>{type.icon}</span>
                    <span>{type[lang] || type.en}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prefCard}>
              <h2 className={styles.prefTitle}>{t('myPrefLength')}</h2>
              <p className={styles.prefDescription}>{t('myPrefLengthDesc')}</p>
              <div className={styles.prefOptions}>
                {[
                  { id: 'short', en: 'Short', hi: 'Chhoti', detail: '2-3 min' },
                  { id: 'medium', en: 'Medium', hi: 'Beech ki', detail: '5-7 min' },
                  { id: 'long', en: 'Long', hi: 'Lambi', detail: '10-15 min' },
                ].map((len) => (
                  <button key={len.id} onClick={() => setPrefLength(len.id)}
                    className={`${styles.prefOption} ${prefLength === len.id ? styles.prefOptionActive : ''}`}
                  >
                    <span>{len[lang] || len.en}</span>
                    <span className={styles.prefOptionDetail}>{len.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.prefSaved}>{t('myPrefSaved')} ✓</div>
          </div>
        )}
      </div>
    </>
  );
}
