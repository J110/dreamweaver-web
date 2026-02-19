import { SEED_STORIES } from '@/utils/seedData';

export async function generateMetadata({ params }) {
  const { id } = await params;

  // Look up story in seed data (both en and hi arrays)
  const allStories = [...(SEED_STORIES.en || []), ...(SEED_STORIES.hi || [])];
  const story = allStories.find(s => s.id === id);

  if (!story) {
    return {
      title: 'Dream Valley - Listen to a Story',
      description: 'Magical bedtime stories for kids — listen now on Dream Valley.',
    };
  }

  const title = `${story.title} | Dream Valley`;
  const description = story.description || 'A magical bedtime story for kids';
  // Use generic OG image — SVG covers aren't supported by social platforms
  const ogImage = '/og-image.png';

  return {
    title,
    description,
    openGraph: {
      title: story.title,
      description,
      type: 'article',
      siteName: 'Dream Valley',
      url: `https://dreamvalley.app/player/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: story.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description,
      images: [ogImage],
    },
  };
}

export default function PlayerLayout({ children }) {
  return children;
}
