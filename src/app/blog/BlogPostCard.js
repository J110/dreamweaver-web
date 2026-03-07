import Link from 'next/link';
import styles from './BlogPostCard.module.css';

/**
 * Reusable blog post card for index and tag pages.
 */
export default function BlogPostCard({ post }) {
  const {
    slug,
    title,
    subtitle,
    publishedAt,
    tags = [],
    coverImage,
    engagement = {},
    readingTime,
  } = post;

  const coverUrl = coverImage?.url || '/blog/covers/default.webp';
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <Link href={`/blog/${slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        <img
          src={coverUrl}
          alt={coverImage?.alt || title}
          className={styles.coverImage}
          loading="lazy"
        />
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          {formattedDate && <span className={styles.date}>{formattedDate}</span>}
          {readingTime && (
            <>
              <span className={styles.dot}>·</span>
              <span className={styles.readTime}>{readingTime} min read</span>
            </>
          )}
        </div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {tags.length > 0 && (
          <div className={styles.tags}>
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}
        <div className={styles.engagement}>
          <span className={styles.stat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {engagement.likes || 0}
          </span>
          <span className={styles.stat}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {engagement.commentCount || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
