import { isLongStory, isFunnyShort } from '@/utils/contentTypes';

// Free-content backlog window. MUST equal backend FREE_BACKLOG_DAYS
// (app/utils/backlog.py:28 — verified = 14). This seed-extras predicate is the
// only place SSR gates content outside the backend, so keep it provably in sync;
// the drift-guard test in enrichGrid.test.js trips if this constant changes.
const FREE_BACKLOG_MS = 14 * 24 * 60 * 60 * 1000;

function stripAudio(item) {
  const { audio_variants, audio_url, audio_file, audio_dir, ...rest } = item;
  return rest;
}

export function enrichGrid({ apiItems, seedItems, isPremium }) {
  const seedById = new Map(seedItems.map((s) => [s.id, s]));
  const apiIds = new Set(apiItems.map((i) => i.id));
  const apiTitles = new Set(apiItems.map((i) => i.title));
  const hasRealCover = (c) => c && !c.includes('default.svg');

  const enriched = apiItems.map((item) => {
    const seed = seedById.get(item.id);
    const base = { ...item, addedAt: item.created_at || item.addedAt };
    if (!seed) return base.premium_locked ? stripAudio(base) : base;
    const merged = {
      ...base,
      cover: hasRealCover(item.cover) ? item.cover : (seed.cover || item.cover),
      musicParams: item.musicParams || seed.musicParams,
      musicProfile: item.musicProfile || seed.musicProfile,
      duration: item.duration || seed.duration,
      story_type: item.story_type || seed.story_type,
    };
    if (merged.premium_locked) return stripAudio(merged);     // LEAK RULE
    merged.audio_variants = item.audio_variants || seed.audio_variants;
    return merged;
  });

  const cutoff = Date.now() - FREE_BACKLOG_MS;
  const extras = seedItems
    .filter((s) => !apiIds.has(s.id) && !apiTitles.has(s.title))
    .map((s) => {
      if (isPremium) return s;
      const isPremiumType = isLongStory(s) || isFunnyShort(s);
      const createdMs = s.created_at ? new Date(s.created_at).getTime() : 0;
      const locked = isPremiumType || createdMs < cutoff;
      return locked ? stripAudio({ ...s, premium_locked: true }) : s;
    });

  return [...enriched, ...extras];
}
