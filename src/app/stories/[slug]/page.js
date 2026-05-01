import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStories } from '@/utils/seedData';
import { generateSlug, findStoryBySlug, CATEGORY_MAP } from '@/utils/slugify';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetch all stories and find one by slug.
 * Tries API first, falls back to seed data.
 */
async function getStoryBySlug(slug) {
  // Try API
  try {
    const res = await fetch(`${API_URL}/api/v1/content?page_size=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const items = data.data || data.content || data;
      if (Array.isArray(items)) {
        const match = findStoryBySlug(slug, items);
        if (match) return match;
      }
    }
  } catch {}

  // Fallback to seed data
  const seedEn = getStories('en') || [];
  const seedHi = getStories('hi') || [];
  return findStoryBySlug(slug, [...seedEn, ...seedHi]);
}

/**
 * Get related stories (same theme or type, excluding current).
 */
async function getRelatedStories(story) {
  const allStories = getStories('en') || [];
  return allStories
    .filter((s) => s && s.id !== story.id && (s.theme === story.theme || s.type === story.type))
    .slice(0, 4);
}

/**
 * Dynamic metadata for SEO.
 */
export async function generateMetadata({ params }) {
  const story = await getStoryBySlug(params.slug);
  if (!story) {
    return { title: 'Story Not Found | Dream Valley' };
  }

  const typeLabel = { story: 'Story', song: 'Lullaby', long_story: 'Long Story' }[story.type] || 'Story';
  const ageLabel = story.age_group || (story.target_age <= 1 ? '0-1' : story.target_age <= 5 ? '2-5' : story.target_age <= 8 ? '6-8' : '9-12');

  const title = `${story.title} — Bedtime ${typeLabel} for Ages ${ageLabel} | Dream Valley`;
  const description = story.description
    || `Listen to "${story.title}" — a magical bedtime ${typeLabel.toLowerCase()} for kids on Dream Valley. Calming narration, original music, and living animated art.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://dreamvalley.app/stories/${params.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://dreamvalley.app/stories/${params.slug}`,
      siteName: 'Dream Valley',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * Generate static params for known stories (optional — enables ISR).
 */
export async function generateStaticParams() {
  const stories = getStories('en') || [];
  return stories
    .filter((s) => s && s.title)
    .map((s) => ({ slug: generateSlug(s.title) }));
}

export default async function StoryPage({ params }) {
  const story = await getStoryBySlug(params.slug);

  if (!story) {
    notFound();
  }

  const related = await getRelatedStories(story);
  const typeLabel = { story: 'Story', song: 'Lullaby', long_story: 'Long Story' }[story.type] || 'Story';
  const ageLabel = story.age_group || (story.target_age <= 1 ? '0-1' : story.target_age <= 5 ? '2-5' : story.target_age <= 8 ? '6-8' : '9-12');
  const duration = story.duration || (story.audio_variants?.[0]?.duration_seconds ? Math.round(story.audio_variants[0].duration_seconds / 60) : null);
  const categories = story.categories || [];
  const themeSlug = Object.entries(CATEGORY_MAP).find(([, v]) => v.theme === story.theme)?.[0];

  // First few paragraphs for preview
  const textPreview = story.text
    ? story.text.split('\n\n').filter(Boolean).slice(0, 3).join('\n\n')
    : null;

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: story.title,
    description: story.description || `A bedtime ${typeLabel.toLowerCase()} for children`,
    genre: "Children's Literature",
    url: `https://dreamvalley.app/stories/${params.slug}`,
    image: story.cover ? `https://dreamvalley.app${story.cover}` : undefined,
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: story.age_min || 0,
      suggestedMaxAge: story.age_max || 12,
    },
    ...(duration && {
      duration: `PT${duration}M`,
    }),
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://dreamvalley.app/#website',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.page}>
        {/* Hero with cover */}
        <div className={styles.hero}>
          {story.cover && (
            <div className={styles.coverWrap}>
              <object
                type="image/svg+xml"
                data={story.cover}
                className={styles.coverImg}
                aria-label={`Cover for ${story.title}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.cover} alt={`Cover for ${story.title}`} className={styles.coverImg} />
              </object>
            </div>
          )}
        </div>

        <div className={styles.content}>
          {/* Badge + Title */}
          <div className={styles.badges}>
            <span className={styles.typeBadge}>{typeLabel}</span>
            <span className={styles.ageBadge}>{ageLabel} yrs</span>
            {duration && <span className={styles.durationBadge}>{duration} min</span>}
          </div>

          <h1 className={styles.title}>{story.title}</h1>

          {/* Description */}
          {story.description && (
            <p className={styles.description}>{story.description}</p>
          )}

          {/* Character card */}
          {story.character && (
            <div className={styles.characterCard}>
              <h3>Meet {story.character.name}</h3>
              <p className={styles.characterIdentity}>{story.character.identity}</p>
              {story.character.special && (
                <p className={styles.characterSpecial}>{story.character.special}</p>
              )}
              {story.character.personality_tags && (
                <div className={styles.personalityTags}>
                  {story.character.personality_tags.map((tag) => (
                    <span key={tag} className={styles.personalityTag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Story preview text */}
          {textPreview && (
            <div className={styles.preview}>
              <h2>Story Preview</h2>
              {textPreview.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <p className={styles.previewFade}>Continue reading with a free account...</p>
            </div>
          )}

          {/* CTA */}
          <div className={styles.ctaSection}>
            <Link href={`/player/${story.id}`} className={styles.ctaPrimary}>
              Listen to This Story
            </Link>
            <p className={styles.ctaHint}>Free — no credit card required</p>
          </div>

          {/* Category + age links */}
          <div className={styles.linkSection}>
            {themeSlug && (
              <Link href={`/category/${themeSlug}`} className={styles.categoryLink}>
                More {CATEGORY_MAP[themeSlug]?.display} stories →
              </Link>
            )}
            <Link href={`/ages/${ageLabel}`} className={styles.categoryLink}>
              More stories for ages {ageLabel} →
            </Link>
          </div>

          {/* Related stories */}
          {related.length > 0 && (
            <div className={styles.related}>
              <h2>You Might Also Like</h2>
              <div className={styles.relatedGrid}>
                {related.map((s) => (
                  <Link
                    key={s.id}
                    href={`/stories/${generateSlug(s.title)}`}
                    className={styles.relatedCard}
                  >
                    {s.cover && (
                      <div className={styles.relatedCover}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.cover} alt={s.title} className={styles.relatedCoverImg} />
                      </div>
                    )}
                    <span className={styles.relatedTitle}>{s.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back to home link */}
        <div className={styles.backLink}>
          <Link href="/">← Back to Dream Valley</Link>
        </div>
      </div>
    </>
  );
}
