import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';
import HomeAppClient from './HomeAppClient';

// SSR always renders the anonymous 'en' seed — the server cannot know the user's
// language (localStorage-only) or entitlement (token in localStorage). The client
// island corrects both after hydration (real lang via useI18n, real entitlement
// via the /api/home-grid BFF). The 'en' seed is leak-safe: buildHomeGrid(null,...)
// returns the locked, audio-scrubbed anonymous view.
export default async function HomeGridServer() {
  const { content } = await buildHomeGrid(null, 'en');
  return <HomeAppClient initialItems={content} />;
}
