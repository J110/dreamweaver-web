import { SEED_STORIES } from '@/utils/seedData';

export default function sitemap() {
  const allStories = [...(SEED_STORIES.en || []), ...(SEED_STORIES.hi || [])];

  const storyUrls = allStories.map((story) => ({
    url: `https://dreamvalley.app/player/${story.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const staticPages = [
    { url: 'https://dreamvalley.app', lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: 'https://dreamvalley.app/explore', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://dreamvalley.app/support', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://dreamvalley.app/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  return [...staticPages, ...storyUrls];
}
