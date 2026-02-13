'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import StarField from '@/components/StarField';
import ContentCard from '@/components/ContentCard';
import { contentApi } from '@/utils/api';
import { getStories } from '@/utils/seedData';
import { useI18n } from '@/utils/i18n';
import styles from './page.module.css';

const FILTER_TYPES = [
  { id: 'all', en: 'All', hi: 'Sabhi' },
  { id: 'story', en: 'Stories', hi: 'Kahaniyan' },
  { id: 'poem', en: 'Poems', hi: 'Kavitayein' },
  { id: 'song', en: 'Songs', hi: 'Gaane' },
];

const THEMES = [
  { id: 'fantasy', emoji: '🧙', en: 'Fantasy', hi: 'Kalpana' },
  { id: 'adventure', emoji: '⚔️', en: 'Adventure', hi: 'Sahas' },
  { id: 'animals', emoji: '🦁', en: 'Animals', hi: 'Janwar' },
  { id: 'space', emoji: '🚀', en: 'Space', hi: 'Antariksh' },
  { id: 'ocean', emoji: '🐚', en: 'Ocean', hi: 'Samundar' },
  { id: 'forest', emoji: '🌲', en: 'Forest', hi: 'Jungle' },
  { id: 'magic', emoji: '✨', en: 'Magic', hi: 'Jaadu' },
  { id: 'friendship', emoji: '👫', en: 'Friendship', hi: 'Dosti' },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const { t, lang } = useI18n();
  const [filterType, setFilterType] = useState('all');
  const [theme, setTheme] = useState(searchParams.get('theme') || '');
  const [search, setSearch] = useState('');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const filters = {
          type: filterType === 'all' ? undefined : filterType,
          theme: theme || undefined,
          search: search || undefined,
          lang: lang,
        };
        const result = await contentApi.getContent(filters);
        const items = result.content || [];
        if (items.length > 0) {
          setContent(items);
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
  }, [filterType, theme, search, lang]);

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
          {content.map((item) => (
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
