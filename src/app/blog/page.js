import Link from 'next/link';
import BlogPostCard from './BlogPostCard';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const metadata = {
  title: 'Dream Valley Blog — Bedtime Stories, Sleep Science & Parenting Tips',
  description:
    "Articles about children's sleep, bedtime routines, and the science behind Dream Valley's bedtime stories. Tips for parents and caregivers.",
  alternates: { canonical: 'https://dreamvalley.app/blog' },
  openGraph: {
    title: 'Dream Valley Blog — Bedtime Stories, Sleep Science & Parenting Tips',
    description:
      "Articles about children's sleep, bedtime routines, and the science behind Dream Valley's bedtime stories.",
    url: 'https://dreamvalley.app/blog',
    type: 'website',
  },
};

async function getPosts(page = 1) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/blog/posts?page=${page}&page_size=9&status=published`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { posts: [], page: 1, totalPages: 1, total: 0 };
}

export default async function BlogIndexPage({ searchParams }) {
  const page = parseInt(searchParams?.page || '1', 10);
  const data = await getPosts(page);
  const { posts, totalPages, total } = data;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Dream Valley Blog',
    description: "Articles about children's sleep, bedtime routines, and bedtime stories.",
    url: 'https://dreamvalley.app/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Dream Valley',
      logo: { '@type': 'ImageObject', url: 'https://dreamvalley.app/logo-new.png' },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.page}>
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <span>Blog</span>
        </nav>

        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>Dream Valley Blog</h1>
          <p className={styles.heroSubtitle}>
            Sleep science, bedtime routines, and parenting tips to help your
            child fall asleep peacefully.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className={styles.empty}>
            <p>No posts yet. Check back soon!</p>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {posts.map((post) => (
                <BlogPostCard key={post.slug} post={post} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav className={styles.pagination}>
                {page > 1 && (
                  <Link
                    href={`/blog?page=${page - 1}`}
                    className={styles.pageLink}
                  >
                    &larr; Newer posts
                  </Link>
                )}
                <span className={styles.pageInfo}>
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/blog?page=${page + 1}`}
                    className={styles.pageLink}
                  >
                    Older posts &rarr;
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </>
  );
}
