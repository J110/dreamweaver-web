'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import { contentApi } from '@/utils/api';
import { getStories } from '@/utils/seedData';
import { sortByDiscovery } from '@/utils/listeningHistory';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

const FILTER_TYPES = [
  { id: 'all', en: 'All', hi: 'Sabhi' },
  { id: 'story', en: 'Short Stories', hi: 'Kahaniyan' },
  { id: 'long_story', en: 'Long Stories', hi: 'Lambi Kahaniyan' },
  { id: 'song', en: 'Lullabies', hi: 'Loriyaan' },
];

const THEMES = [
  { id: 'fantasy', emoji: '🧙', en: 'Fantasy', hi: 'Kalpana' },
  { id: 'adventure', emoji: '⚔️', en: 'Adventure', hi: 'Sahas' },
  { id: 'animals', emoji: '🦁', en: 'Animals', hi: 'Janwar' },
  { id: 'space', emoji: '🚀', en: 'Space', hi: 'Antariksh' },
  { id: 'ocean', emoji: '🌊', en: 'Ocean', hi: 'Samudra' },
  { id: 'nature', emoji: '🌿', en: 'Nature', hi: 'Prakriti' },
  { id: 'bedtime', emoji: '🛏️', en: 'Bedtime', hi: 'Sone ka Samay' },
  { id: 'science', emoji: '🔬', en: 'Science', hi: 'Vigyan' },
  { id: 'friendship', emoji: '🤝', en: 'Friendship', hi: 'Dosti' },
  { id: 'family', emoji: '👨‍👩‍👧', en: 'Family', hi: 'Parivar' },
  { id: 'mystery', emoji: '🔍', en: 'Mystery', hi: 'Rahasya' },
  { id: 'dreamy', emoji: '🌙', en: 'Dreamy', hi: 'Sapne' },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();
  const [filterType, setFilterType] = useState('all');
  const [theme, setTheme] = useState(searchParams.get('theme') || '');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef(null);

  // Debounce search input — wait 400ms after user stops typing
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const filters = {
          type: filterType === 'all' ? undefined : filterType,
          theme: theme || undefined,
          search: debouncedSearch || undefined,
          lang: lang,
        };
        const result = await contentApi.getContent(filters);
        const items = result.content || [];
        if (items.length > 0) {
          // Enrich API items with seed-only fields (cover, audio_variants, musicParams)
          const seedItems = getStories(lang);
          const seedById = {};
          for (const s of seedItems) {
            seedById[s.id] = s;
          }
          const hasRealCover = (c) => c && !c.includes('default.svg');
          const enriched = items.map((item) => {
            // Id-only seed lookup. Title fallback is unsafe — the pipeline
            // mutates seed entries by title (preserving the OLD id), which
            // would otherwise pull stale cover/audio/addedAt onto fresh items.
            const seed = seedById[item.id];
            const base = {
              ...item,
              addedAt: item.created_at || item.addedAt,
            };
            if (!seed) return base;
            return {
              ...base,
              cover: hasRealCover(item.cover) ? item.cover : (seed.cover || item.cover),
              audio_variants: item.audio_variants || seed.audio_variants,
              musicParams: item.musicParams || seed.musicParams,
              musicProfile: item.musicProfile || seed.musicProfile,
              duration: item.duration || seed.duration,
            };
          });
          setContent(enriched);
        } else {
          let fallback = getStories(lang);
          if (filterType !== 'all') fallback = fallback.filter((s) => s.type === filterType);
          if (theme) fallback = fallback.filter((s) => s.theme === theme || s.categories?.some((c) => c.toLowerCase() === theme));
          setContent(fallback);
        }
      } catch (err) {
        let fallback = getStories(lang);
        if (filterType !== 'all') fallback = fallback.filter((s) => s.type === filterType);
        if (theme) fallback = fallback.filter((s) => s.theme === theme || s.categories?.some((c) => c.toLowerCase() === theme));
        setContent(fallback);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [filterType, theme, debouncedSearch, lang]);

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('exploreTitle')}</h1>
      </div>

      <input
        type="text"
        placeholder={t('exploreSearch')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.searchInput}
      />

      {/* Type Filter */}
      <div className={styles.filterRow}>
        {FILTER_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setFilterType(type.id)}
            className={`${styles.pill} ${filterType === type.id ? styles.pillActive : ''}`}
          >
            {type[lang] || type.en}
          </button>
        ))}
      </div>

      {/* Theme Filter */}
      <div className={styles.filterRow}>
        <button
          onClick={() => setTheme('')}
          className={`${styles.pill} ${!theme ? styles.pillActive : ''}`}
        >
          {t('exploreAll')}
        </button>
        {THEMES.map((th) => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            className={`${styles.pill} ${theme === th.id ? styles.pillActive : ''}`}
          >
            {th.emoji} {th[lang] || th.en}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingMsg}>{t('loading')}</div>
      ) : content.length > 0 ? (
        <div className={styles.grid}>
          {sortByDiscovery(content).map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyMsg}>
          <div className={styles.emptyIcon}>🌙</div>
          <p>{t('exploreEmpty')}</p>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <>
      <StarField />
      <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#B8B3D8' }}>Loading...</div>}>
        <ExploreContent />
      </Suspense>
    </>
  );
}
