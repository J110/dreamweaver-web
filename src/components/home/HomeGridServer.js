import { buildHomeGrid } from '@/server/homeGrid/buildHomeGrid';
import { isStory, isLongStory, isLullaby } from '@/utils/contentTypes';
import { sortByDiscovery } from '@/utils/listeningHistory';
import HomeAppClient from './HomeAppClient';

// SSR only the ABOVE-FOLD slice (~first cards of each row). SSR-ing the full
// 285-item grid serializes a 3.3MB payload → LCP 8.5s (measured); a ~12-item slice
// paints from ~0.9MB → LCP ~3.4s. The client island re-fetches the FULL grid on
// hydration and renders the rest after first paint (off-screen covers lazy-load).
const PER_ROW = 4;
function aboveFoldSlice(items) {
  // useHistory=false → history-independent order, matching the client's first render.
  const take = (pred) => sortByDiscovery(items.filter(pred), false).slice(0, PER_ROW);
  return [...take(isStory), ...take(isLongStory), ...take(isLullaby)];
}

// SSR renders the anonymous 'en' seed — the server can't know the user's language
// (localStorage-only) or entitlement (token in localStorage); the client corrects
// both post-hydration. Leak-safe: buildHomeGrid(null,...) returns the locked,
// audio-scrubbed anonymous view, and the slice is a subset of it.
export default async function HomeGridServer() {
  const { content } = await buildHomeGrid(null, 'en');
  return <HomeAppClient initialItems={aboveFoldSlice(content)} />;
}
