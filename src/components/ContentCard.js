'use client';

import Link from 'next/link';
import { getAmbientMusic } from '@/utils/ambientMusic';
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
            {content.duration && `${content.duration} min`}
          </span>
          <span className={styles.cardLikes}>
            ❤️ {content.like_count || 0}
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
