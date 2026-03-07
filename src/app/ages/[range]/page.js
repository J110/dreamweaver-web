import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStories } from '@/utils/seedData';
import { generateSlug, AGE_RANGES, CATEGORY_MAP } from '@/utils/slugify';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AGE_INTROS = {
  '0-1': 'Gentle lullabies and the simplest stories for your littlest one. Soft sounds, soothing rhythms, and calm visuals designed for babies and infants.',
  '2-5': 'Short, engaging stories with friendly characters and simple adventures. Perfect attention span for toddlers — exciting enough to captivate, calming enough to guide them toward sleep.',
  '6-8': 'Longer narratives with richer worlds and more complex characters. These stories grow with your child while still moving through the three sleep phases.',
  '9-12': 'Immersive adventures and thoughtful tales for older kids. Sophisticated storytelling that respects their intelligence while gently easing them into rest.',
};

async function getStoriesByAge(min, max) {
  let stories = [];

  try {
    const res = await fetch(`${API_URL}/api/v1/content?page_size=200`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const items = data.data || data.content || [];
      if (Array.isArray(items)) {
        stories = items.filter((s) => {
          const sMin = s.age_min ?? 0;
          const sMax = s.age_max ?? 12;
          return sMin <= max && sMax >= min;
        });
      }
    }
  } catch {}

  // Merge seed data
  try {
    const seed = getStories('en') || [];
    const seedFiltered = seed.filter((s) => {
      if (!s) return false;
      const age = s.target_age ?? 3;
      return age >= min && age <= max;
    });
    const existing = new Set(stories.map((s) => s.id));
    for (const s of seedFiltered) {
      if (s.id && !existing.has(s.id)) stories.push(s);
    }
  } catch {}

  return stories;
}

export async function generateMetadata({ params }) {
  const range = AGE_RANGES[params.range];
  if (!range) return { title: 'Age Group Not Found | Dream Valley' };

  return {
    title: `${range.seoTitle} | Dream Valley`,
    description: AGE_INTROS[params.range] || `Bedtime stories for ages ${params.range}.`,
    alternates: { canonical: `https://dreamvalley.app/ages/${params.range}` },
    openGraph: {
      title: `${range.seoTitle} | Dream Valley`,
      description: AGE_INTROS[params.range],
      type: 'website',
      url: `https://dreamvalley.app/ages/${params.range}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(AGE_RANGES).map((range) => ({ range }));
}

export default async function AgePage({ params }) {
  const range = AGE_RANGES[params.range];
  if (!range) notFound();

  const stories = await getStoriesByAge(range.min, range.max);
  const intro = AGE_INTROS[params.range] || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: range.seoTitle,
    description: intro,
    url: `https://dreamvalley.app/ages/${params.range}`,
    isPartOf: { '@type': 'WebSite', '@id': 'https://dreamvalley.app/#website' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>Ages {params.range}</span>
        </nav>

        <h1 className={styles.title}>{range.seoTitle}</h1>
        <p className={styles.intro}>{intro}</p>

        <div className={styles.grid}>
          {stories.map((s) => (
            <Link key={s.id} href={`/stories/${generateSlug(s.title)}`} className={styles.card}>
              {s.cover && (
                <div className={styles.cardCover}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.cover} alt={s.title} className={styles.cardCoverImg} />
                </div>
              )}
              <div className={styles.cardInfo}>
                <span className={styles.cardType}>
                  {{ story: 'Story', poem: 'Poem', song: 'Lullaby', long_story: 'Long Story' }[s.type] || 'Story'}
                </span>
                <h3 className={styles.cardTitle}>{s.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        {stories.length === 0 && (
          <p className={styles.empty}>No stories found for this age group yet. Check back soon!</p>
        )}

        {/* Cross-links */}
        <div className={styles.crossLinks}>
          <h2>Other Age Groups</h2>
          <div className={styles.ageLinks}>
            {Object.entries(AGE_RANGES)
              .filter(([r]) => r !== params.range)
              .map(([r, val]) => (
                <Link key={r} href={`/ages/${r}`} className={styles.ageLink}>{val.display}</Link>
              ))}
          </div>
          <h2>Browse by Category</h2>
          <div className={styles.categoryLinks}>
            {Object.entries(CATEGORY_MAP).slice(0, 8).map(([slug, val]) => (
              <Link key={slug} href={`/category/${slug}`} className={styles.categoryLink}>{val.display}</Link>
            ))}
          </div>
        </div>

        <div className={styles.backLink}>
          <Link href="/">← Back to Dream Valley</Link>
        </div>
      </div>
    </>
  );
}
