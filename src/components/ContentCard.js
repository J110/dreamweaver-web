'use client';

import Link from 'next/link';
import { getAmbientMusic } from '@/utils/ambientMusic';
import { isListened } from '@/utils/listeningHistory';
import { dvAnalytics } from '@/utils/analytics';
import { useI18n } from '@/utils/i18n';
import { isFunnyShort, isSillySong, isLullaby, isPoem, isLongStory, getDisplayCategory } from '@/utils/contentTypes';
import styles from './ContentCard.module.css';

const MOOD_CONFIG = {
  calm:    { emoji: '\uD83D\uDE0C', label: { en: 'Calm',    hi: 'Shaant' } },
  curious: { emoji: '\uD83D\uDD0D', label: { en: 'Curious', hi: 'Curious' } },
  wired:   { emoji: '\u26A1',       label: { en: 'Wired',   hi: 'Hyper' } },
  sad:     { emoji: '\uD83D\uDCA7', label: { en: 'Sad',     hi: 'Udaas' } },
  anxious: { emoji: '\uD83C\uDF00', label: { en: 'Anxious', hi: 'Pareshaan' } },
  angry:   { emoji: '\uD83D\uDD25', label: { en: 'Angry',   hi: 'Gussa' } },
};

const LANGUAGE_LEVEL_LABELS = {
  basic: 'Keep Simple',
  intermediate: 'Medium',
  advanced: 'Challenge',
};

const STORY_TYPE_LABELS = {
  folk_tale: 'Folk Tale',
  mythological: 'Mythological',
  fable: 'Fable',
  nature: 'Nature Story',
  slice_of_life: 'Slice of Life',
  dream: 'Dream',
};

export default function ContentCard({ content, onClick }) {
  const { lang } = useI18n();
  // Pre-unlock AudioContext on card click (before navigation to player page).
  // This is called inside the user's click gesture, so AudioContext.resume()
  // will succeed. The player page can then start music immediately.
  const handleCardClick = async () => {
    dvAnalytics.track('content_view', {
      contentId: content.id,
      contentType: content.type,
      ageGroup: content.age_group,
      category: content.category,
    });
    try {
      const engine = getAmbientMusic();
      engine._ensureContext();
      // Also explicitly wait for resume to complete within the gesture
      if (engine._ctx && engine._ctx.state === 'suspended') {
        await engine._ctx.resume();
      }
    } catch { /* ignore */ }
  };
  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'song':
        return styles.cardSongGradient;
      case 'story':
      default:
        return styles.cardStoryGradient;
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'song':
        return 'badge-song';
      case 'long_story':
      case 'story':
      default:
        return 'badge-story';
    }
  };

  // Derive age group label from age_group or target_age
  const getAgeLabel = () => {
    if (content.age_group) return content.age_group;
    const age = content.target_age;
    if (age == null) return null;
    if (age <= 1) return '0-1';
    if (age <= 5) return '2-5';
    if (age <= 8) return '6-8';
    return '9-12';
  };

  // Compute display duration: prefer top-level duration, else average from audio_variants
  const getDuration = () => {
    if (content.duration) return `${content.duration} min`;
    const variants = content.audio_variants || [];
    const durs = variants.map(v => v.duration_seconds).filter(Boolean);
    if (durs.length > 0) {
      const avgSeconds = durs.reduce((a, b) => a + b, 0) / durs.length;
      return `${Math.max(1, Math.ceil(avgSeconds / 60))} min`;
    }
    return null;
  };

  const durationLabel = getDuration();
  const ageLabel = getAgeLabel();
  const listened = isListened(content.id);

  // "NEW" badge: only for content added today
  const isAddedToday = (() => {
    if (!content.addedAt) return false;
    const today = new Date().toISOString().slice(0, 10);
    return content.addedAt.slice(0, 10) === today;
  })();

  // Covers serve from a SUBTYPE path built off cover_file; the store `cover`
  // field is often null for silly_songs/poems even though the file exists and
  // serves 200 (before-bed/playlist already derive this way). Resolve order:
  // cover → cover_file by subtype → emoji. Root /covers/{file} 404s for
  // silly_songs, so the dir is keyed off the subtype, mirroring before-bed.
  const coverFromFile = (() => {
    const f = content.cover_file;
    if (!f) return null;
    if (isSillySong(content)) return `/covers/silly-songs/${f}`;
    if (isPoem(content)) return `/covers/poems/${f}`;
    if (isFunnyShort(content)) return `/covers/${content.lang === 'hi' ? 'funny-shorts-hi' : 'funny-shorts'}/${f}`;
    return null;
  })();
  const resolvedCover = content.cover || coverFromFile;

  const cardContent = (
    <>
      <div className={`${styles.cardArt} ${resolvedCover ? styles.cardArtWithImage : getTypeColor(content.type)} ${content.premium_locked ? styles.cardArtLocked : ''}`}>
        {resolvedCover ? (
          resolvedCover.endsWith('.svg') ? (
            <object
              data={resolvedCover}
              type="image/svg+xml"
              className={styles.coverImage}
              aria-label={content.title || 'Story cover'}
            />
          ) : (
            <img
              src={resolvedCover}
              alt={content.title || 'Story cover'}
              className={styles.coverImage}
              loading="lazy"
            />
          )
        ) : (
          <div className={styles.cardIcon}>
            {isFunnyShort(content) ? '😄'
              : isSillySong(content) ? '🎶'
              : isLullaby(content) ? '🎵'
              : isPoem(content) ? '✨'
              : isLongStory(content) ? '🌙'
              : '✨'}
          </div>
        )}
        {content.premium_locked ? (
          <span className={styles.lockBadge}>Premium</span>
        ) : listened ? (
          <span className={styles.listenedBadge}>✓</span>
        ) : isAddedToday ? (
          <span className={styles.newBadge}>NEW</span>
        ) : (
          <span className={styles.unreadDot} />
        )}
        {ageLabel && (
          <span className={styles.ageBadge}>
            {ageLabel} yrs
          </span>
        )}
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <span className={`badge ${getTypeBadge(content.type)}`}>
            {content.story_type && STORY_TYPE_LABELS[content.story_type]
              ? STORY_TYPE_LABELS[content.story_type]
              : getDisplayCategory(content, lang)}
          </span>
        </div>
        <h3 className={styles.cardTitle}>{content.title || 'Untitled'}</h3>
        <div className={styles.cardFooter}>
          <span className={styles.cardMeta}>
            {durationLabel && <><span className={styles.clockIcon}>&#128336;</span> {durationLabel}</>}
          </span>
          {content.mood && MOOD_CONFIG[content.mood] && (
            <span className={`${styles.moodBadge} ${styles[`mood_${content.mood}`]}`}>{MOOD_CONFIG[content.mood].emoji} {MOOD_CONFIG[content.mood].label[lang] || MOOD_CONFIG[content.mood].label.en}</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`${styles.card} card card-interactive`}
      onClick={(e) => {
        handleCardClick();
        if (onClick) onClick(e);
      }}
    >
      {onClick ? (
        cardContent
      ) : (
        <Link href={`/player/${content.id}?autoplay=1`}>
          {cardContent}
        </Link>
      )}
    </div>
  );
}
