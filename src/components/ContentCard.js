'use client';

import Link from 'next/link';
import { getAmbientMusic } from '@/utils/ambientMusic';
import { isListened } from '@/utils/listeningHistory';
import styles from './ContentCard.module.css';

export default function ContentCard({ content, onClick }) {
  // Pre-unlock AudioContext on card click (before navigation to player page).
  // This is called inside the user's click gesture, so AudioContext.resume()
  // will succeed. The player page can then start music immediately.
  const handleCardClick = async () => {
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
      case 'poem':
        return styles.cardPoemGradient;
      case 'song':
        return styles.cardSongGradient;
      case 'story':
      default:
        return styles.cardStoryGradient;
    }
  };

  const getTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case 'poem':
        return 'badge-poem';
      case 'song':
        return 'badge-song';
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
  const isNew = !isListened(content.id);

  const cardContent = (
    <>
      <div className={`${styles.cardArt} ${content.cover ? styles.cardArtWithImage : getTypeColor(content.type)}`}>
        {content.cover ? (
          <img
            src={content.cover}
            alt={content.title || 'Story cover'}
            className={styles.coverImage}
            loading="lazy"
          />
        ) : (
          <div className={styles.cardIcon}>
            {content.type?.toLowerCase() === 'poem' && '📖'}
            {content.type?.toLowerCase() === 'song' && '🎵'}
            {content.type?.toLowerCase() === 'story' && '✨'}
          </div>
        )}
        {isNew && (
          <span className={styles.newBadge}>NEW</span>
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
            {content.type || 'Story'}
          </span>
        </div>
        <h3 className={styles.cardTitle}>{content.title || 'Untitled'}</h3>
        <div className={styles.cardFooter}>
          <span className={styles.cardMeta}>
            {durationLabel && <><span className={styles.clockIcon}>&#128336;</span> {durationLabel}</>}
          </span>
          <span className={styles.cardLikes}>
            ❤️ {content.save_count || 0}
          </span>
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
        <Link href={`/player/${content.id}`}>
          {cardContent}
        </Link>
      )}
    </div>
  );
}
