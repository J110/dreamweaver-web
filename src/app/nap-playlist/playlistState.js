export const canPlayTrack = (items, index) =>
  Boolean(items[index] && !items[index].is_locked && items[index].audio_url);

export const nextPlayableIndex = (items, index) =>
  canPlayTrack(items, index + 1) ? index + 1 : null;
