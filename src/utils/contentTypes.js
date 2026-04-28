// Central source of truth for content type predicates and display labels.
//
// CRITICAL: never check `item.type === 'song'` directly anywhere in the UI.
// Always go through one of the predicates below.
//
// Why: items with type='song' span THREE distinct categories — lullabies,
// funny shorts, and silly songs — distinguished only by `subtype`. Bare
// `type === 'song'` checks treat them all as lullabies and were the cause
// of the 2026-04-28 production bug where funny shorts appeared in the
// Loriyaan / Lullabies row.
//
// Adding a new subtype: update SUBTYPES + add an isXxx() predicate +
// add the display label in getDisplayCategory(). All UI surfaces will
// pick up the new type automatically since they call these helpers.

export const SUBTYPES = Object.freeze({
  FUNNY_SHORT: 'funny_short',
  SILLY_SONG: 'silly_song',
  LULLABY: 'lullaby', // implicit — type=song with no subtype is also a lullaby
});

// --- Predicates ---

export const isLullaby = (item) =>
  item?.type === 'song' &&
  (!item?.subtype || item.subtype === SUBTYPES.LULLABY);

export const isFunnyShort = (item) =>
  item?.type === 'song' && item?.subtype === SUBTYPES.FUNNY_SHORT;

export const isSillySong = (item) =>
  item?.type === 'song' && item?.subtype === SUBTYPES.SILLY_SONG;

export const isStory = (item) => item?.type === 'story';
export const isLongStory = (item) => item?.type === 'long_story';
export const isPoem = (item) => item?.type === 'poem';

// --- Display labels ---
//
// Hindi labels use Roman script per the Dream Valley content rules
// (no Devanagari in user-facing fields). Keep these short — they appear
// in section headers and badges.

const LABELS = {
  long_story:  { en: 'Long Story',   hi: 'Lambi Kahani' },
  story:       { en: 'Story',        hi: 'Kahani' },
  funny_short: { en: 'Funny Short',  hi: 'Mazedaar' },
  silly_song:  { en: 'Silly Song',   hi: 'Mast Geet' },
  lullaby:     { en: 'Lullaby',      hi: 'Lori' },
  poem:        { en: 'Poem',         hi: 'Kavita' },
};

const SECTION_LABELS = {
  long_story:  { en: '🌙 Long Stories',  hi: '🌙 Lambi Kahaniyan' },
  story:       { en: '📖 Stories',       hi: '📖 Kahaniyan' },
  funny_short: { en: '😂 Funny Shorts',  hi: '😂 Mazedaar Shorts' },
  silly_song:  { en: '🎶 Silly Songs',   hi: '🎶 Mast Geet' },
  lullaby:     { en: '🎵 Lullabies',     hi: '🎵 Loriyaan' },
  poem:        { en: '✨ Poems',         hi: '✨ Kavitaayein' },
};

const categoryKey = (item) => {
  if (isLongStory(item)) return 'long_story';
  if (isFunnyShort(item)) return 'funny_short';
  if (isSillySong(item)) return 'silly_song';
  if (isLullaby(item)) return 'lullaby';
  if (isStory(item)) return 'story';
  if (isPoem(item)) return 'poem';
  return null;
};

// Human-readable category label for a content item. Use in player labels,
// share previews, search results, etc.
export const getDisplayCategory = (item, lang = 'en') => {
  const key = categoryKey(item);
  if (!key) return (item?.type || 'STORY').toUpperCase();
  return LABELS[key][lang] || LABELS[key].en;
};

// Uppercase variant for badge-style rendering.
export const getDisplayCategoryUpper = (item, lang = 'en') =>
  getDisplayCategory(item, lang).toUpperCase();

// Section header (with emoji) for the home-page row of this category.
export const getSectionLabel = (typeKey, lang = 'en') =>
  SECTION_LABELS[typeKey]?.[lang] || SECTION_LABELS[typeKey]?.en || typeKey;
