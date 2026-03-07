import Link from 'next/link';
import BlogPostCard from '../../BlogPostCard';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function formatTagName(tag) {
  return tag
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getPostsByTag(tag, page = 1) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/blog/posts/tag/${tag}?page=${page}&page_size=9`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { posts: [], page: 1, totalPages: 1, total: 0, tag };
}

export async function generateMetadata({ params }) {
  const tagName = formatTagName(params.tag);
  return {
    title: `Articles about ${tagName} | Dream Valley Blog`,
    description: `Dream Valley articles about ${tagName.toLowerCase()}. Tips, research, and practical advice for parents.`,
    alternates: {
      canonical: `https://dreamvalley.app/blog/tag/${params.tag}`,
    },
  };
}

export default async function TagPage({ params, searchParams }) {
  const page = parseInt(searchParams?.page || '1', 10);
  const data = await getPostsByTag(params.tag, page);
  const { posts, totalPages } = data;
  const tagName = formatTagName(params.tag);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> /{' '}
        <span>{tagName}</span>
      </nav>

      <header className={styles.hero}>
        <div className={styles.tagBadge}>{tagName}</div>
        <h1 className={styles.heroTitle}>Articles about {tagName}</h1>
        <p className={styles.heroSubtitle}>
          {data.total} article{data.total === 1 ? '' : 's'} tagged with &ldquo;{tagName.toLowerCase()}&rdquo;
        </p>
      </header>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          <p>No posts with this tag yet.</p>
          <Link href="/blog" className={styles.backLink}>
            &larr; Back to Blog
          </Link>
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
                  href={`/blog/tag/${params.tag}?page=${page - 1}`}
                  className={styles.pageLink}
                >
                  &larr; Newer
                </Link>
              )}
              <span className={styles.pageInfo}>
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/blog/tag/${params.tag}?page=${page + 1}`}
                  className={styles.pageLink}
                >
                  Older &rarr;
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
