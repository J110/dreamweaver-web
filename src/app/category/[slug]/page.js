import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getStories } from '@/utils/seedData';
import { generateSlug, CATEGORY_MAP, AGE_RANGES } from '@/utils/slugify';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const CATEGORY_INTROS = {
  ocean: 'Dive into magical ocean worlds where dolphins sing lullabies, waves rock your child to sleep, and coral reefs glow in the moonlight.',
  adventure: 'Embark on thrilling bedtime adventures where brave characters explore enchanted lands — with each journey ending in peaceful slumber.',
  animals: 'Meet cuddly creatures and brave little animals in stories where the whole forest winds down for the night together.',
  space: 'Float among stars and distant planets in dreamy space tales that carry your child gently into the cosmos of sleep.',
  'fairy-tales': 'Classic fairy tale magic reimagined for bedtime — enchanted castles, friendly dragons, and happy endings that drift into dreams.',
  nature: 'Discover the gentle rhythms of nature — whispering trees, flowing rivers, and peaceful meadows that lull your child to rest.',
  fantasy: 'Enter magical realms of wizards, enchanted creatures, and spellbinding adventures that fade into dreamy calm.',
  bedtime: 'Stories crafted specifically for the transition from day to night — the perfect companion for your bedtime routine.',
  dreamy: 'Soft, ethereal tales designed to transport your child into a world of gentle wonder and peaceful sleep.',
  friendship: 'Heartwarming stories about friends who care for each other — ending each night with warmth and connection.',
  family: 'Stories about family bonds, love, and togetherness that make bedtime feel safe and cozy.',
  mystery: 'Gentle mysteries with curious characters solving puzzles — keeping little minds engaged before drifting off.',
  science: 'Fascinating stories about nature, space, and discovery that feed curiosity and lead to peaceful dreams.',
};

async function getStoriesByCategory(theme) {
  let stories = [];

  // Try API
  try {
    const res = await fetch(`${API_URL}/api/v1/content?category=${theme}&page_size=100`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const items = data?.data || data?.content || data;
      if (Array.isArray(items)) stories = items;
    }
  } catch {}

  // Merge seed data (always — API may be down at build time)
  try {
    const seed = getStories('en') || [];
    const seedFiltered = seed.filter((s) => s && s.theme === theme);
    const existing = new Set(stories.map((s) => s.id));
    for (const s of seedFiltered) {
      if (s.id && !existing.has(s.id)) stories.push(s);
    }
  } catch {}

  return stories;
}

export async function generateMetadata({ params }) {
  const cat = CATEGORY_MAP[params.slug];
  if (!cat) return { title: 'Category Not Found | Dream Valley' };

  return {
    title: `${cat.seoTitle} | Dream Valley`,
    description: CATEGORY_INTROS[params.slug] || `Discover ${cat.display.toLowerCase()} bedtime stories on Dream Valley.`,
    alternates: { canonical: `https://dreamvalley.app/category/${params.slug}` },
    openGraph: {
      title: `${cat.seoTitle} | Dream Valley`,
      description: CATEGORY_INTROS[params.slug] || `Discover ${cat.display.toLowerCase()} bedtime stories.`,
      type: 'website',
      url: `https://dreamvalley.app/category/${params.slug}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }) {
  const cat = CATEGORY_MAP[params.slug];
  if (!cat) notFound();

  const stories = await getStoriesByCategory(cat.theme);
  const intro = CATEGORY_INTROS[params.slug] || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: cat.seoTitle,
    description: intro,
    url: `https://dreamvalley.app/category/${params.slug}`,
    isPartOf: { '@type': 'WebSite', '@id': 'https://dreamvalley.app/#website' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>{cat.display} Stories</span>
        </nav>

        <h1 className={styles.title}>{cat.seoTitle}</h1>
        <p className={styles.intro}>{intro}</p>

        {/* Story grid */}
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
                  {s.story_type && {'folk_tale':'Folk Tale','mythological':'Mythological','fable':'Fable','nature':'Nature Story','slice_of_life':'Slice of Life','dream':'Dream'}[s.story_type] || { story: 'Story', song: 'Lullaby', long_story: 'Long Story' }[s.type] || 'Story'}
                </span>
                <h3 className={styles.cardTitle}>{s.title}</h3>
              </div>
            </Link>
          ))}
        </div>

        {stories.length === 0 && (
          <p className={styles.empty}>No stories found in this category yet. Check back soon!</p>
        )}

        {/* Cross-links */}
        <div className={styles.crossLinks}>
          <h2>Explore More</h2>
          <div className={styles.linkGrid}>
            {Object.entries(CATEGORY_MAP)
              .filter(([slug]) => slug !== params.slug)
              .slice(0, 6)
              .map(([slug, val]) => (
                <Link key={slug} href={`/category/${slug}`} className={styles.crossLink}>
                  {val.display}
                </Link>
              ))}
          </div>
          <div className={styles.ageLinks}>
            {Object.entries(AGE_RANGES).map(([range, val]) => (
              <Link key={range} href={`/ages/${range}`} className={styles.ageLink}>
                {val.display}
              </Link>
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
