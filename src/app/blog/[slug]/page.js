import Link from 'next/link';
import BlogMarkdown from '../BlogMarkdown';
import LikeButton from './LikeButton';
import ShareButtons from './ShareButtons';
import CommentsSection from './CommentsSection';
import BlogViewTracker from './BlogViewTracker';
import BlogPostCard from '../BlogPostCard';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function getPost(slug) {
  try {
    const res = await fetch(`${API_URL}/api/v1/blog/posts/${slug}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

async function getRelatedPosts(tags, currentSlug) {
  if (!tags || tags.length === 0) return [];
  try {
    const res = await fetch(
      `${API_URL}/api/v1/blog/posts/tag/${tags[0]}?page_size=4`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const data = await res.json();
      return (data.posts || []).filter((p) => p.slug !== currentSlug).slice(0, 3);
    }
  } catch {}
  return [];
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: 'Post Not Found | Dream Valley Blog' };
  }

  return {
    title: post.seo?.metaTitle || `${post.title} | Dream Valley Blog`,
    description: post.seo?.metaDescription || post.subtitle || '',
    alternates: { canonical: `https://dreamvalley.app/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.subtitle || post.seo?.metaDescription || '',
      url: `https://dreamvalley.app/blog/${post.slug}`,
      type: 'article',
      images: post.coverImage?.url
        ? [`https://dreamvalley.app${post.coverImage.url}`]
        : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getPost(params.slug);

  if (!post) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <h1>Post Not Found</h1>
          <p>This blog post doesn&apos;t exist or has been removed.</p>
          <Link href="/blog" className={styles.backLink}>
            &larr; Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const coverUrl = post.coverImage?.url || '/blog/covers/default.webp';
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const related = await getRelatedPosts(post.tags, post.slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seo?.metaDescription || post.subtitle || '',
    image: `https://dreamvalley.app${coverUrl}`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': 'Organization', name: 'Dream Valley' },
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
      <BlogViewTracker slug={post.slug} />
      <div className={styles.page}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> /{' '}
          <span>{post.title}</span>
        </nav>

        {/* Cover Image */}
        <div className={styles.coverWrapper}>
          <img
            src={coverUrl}
            alt={post.coverImage?.alt || post.title}
            className={styles.coverImage}
          />
        </div>

        {/* Article Header */}
        <article className={styles.article}>
          <header className={styles.header}>
            <h1 className={styles.title}>{post.title}</h1>
            {post.subtitle && (
              <p className={styles.subtitle}>{post.subtitle}</p>
            )}
            <div className={styles.meta}>
              <span>{post.author || 'Dream Valley'}</span>
              <span className={styles.dot}>·</span>
              <span>{formattedDate}</span>
              <span className={styles.dot}>·</span>
              <span>{post.readingTime || 1} min read</span>
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className={styles.tags}>
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog/tag/${tag}`}
                    className={styles.tag}
                  >
                    {tag.replace(/-/g, ' ')}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Post Body */}
          <div className={styles.body}>
            <BlogMarkdown content={post.body} />
          </div>

          {/* Like & Share */}
          <div className={styles.actions}>
            <LikeButton slug={post.slug} initialLikes={post.engagement?.likes || 0} />
            <ShareButtons slug={post.slug} title={post.title} />
          </div>
        </article>

        {/* Related Posts */}
        {related.length > 0 && (
          <section className={styles.related}>
            <h2 className={styles.relatedTitle}>Related Articles</h2>
            <div className={styles.relatedGrid}>
              {related.map((p) => (
                <BlogPostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* Comments */}
        <section className={styles.commentsWrapper}>
          <CommentsSection
            slug={post.slug}
            initialComments={post.comments || []}
          />
        </section>
      </div>
    </>
  );
}
