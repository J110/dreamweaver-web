import { SEED_STORIES } from '@/utils/seedData';
import { generateSlug, CATEGORY_MAP, AGE_RANGES } from '@/utils/slugify';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function sitemap() {
  const allStories = [...(SEED_STORIES.en || []), ...(SEED_STORIES.hi || [])];
  const now = new Date();

  // Static pages
  const staticPages = [
    { url: 'https://dreamvalley.app', lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://dreamvalley.app/how-it-works', lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://dreamvalley.app/about', lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://dreamvalley.app/explore', lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://dreamvalley.app/support', lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://dreamvalley.app/privacy', lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // SEO story pages (/stories/[slug])
  const slugsSeen = new Set();
  const storyUrls = allStories
    .map((story) => {
      const slug = generateSlug(story.title);
      if (!slug || slugsSeen.has(slug)) return null;
      slugsSeen.add(slug);
      return {
        url: `https://dreamvalley.app/stories/${slug}`,
        lastModified: story.addedAt ? new Date(story.addedAt) : now,
        changeFrequency: 'monthly',
        priority: 0.8,
      };
    })
    .filter(Boolean);

  // App player pages (for existing shared links)
  const playerUrls = allStories.map((story) => ({
    url: `https://dreamvalley.app/player/${story.id}`,
    lastModified: story.addedAt ? new Date(story.addedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Category pages
  const categoryUrls = Object.keys(CATEGORY_MAP).map((slug) => ({
    url: `https://dreamvalley.app/category/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Age pages
  const ageUrls = Object.keys(AGE_RANGES).map((range) => ({
    url: `https://dreamvalley.app/ages/${range}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Blog pages
  const blogStaticUrls = [
    { url: 'https://dreamvalley.app/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ];

  let blogPostUrls = [];
  try {
    const blogRes = await fetch(`${API_URL}/api/v1/blog/posts?page_size=1000&status=published`, {
      next: { revalidate: 3600 },
    });
    if (blogRes.ok) {
      const blogData = await blogRes.json();
      blogPostUrls = (blogData.posts || []).map((post) => ({
        url: `https://dreamvalley.app/blog/${post.slug}`,
        lastModified: post.updatedAt ? new Date(post.updatedAt) : (post.publishedAt ? new Date(post.publishedAt) : now),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
    }
  } catch {
    // Blog API not available — skip blog posts in sitemap
  }

  return [...staticPages, ...storyUrls, ...playerUrls, ...categoryUrls, ...ageUrls, ...blogStaticUrls, ...blogPostUrls];
}
