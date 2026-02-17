/**
 * Listening history tracking via localStorage.
 *
 * Shape: { [storyId]: { lastPlayedAt: number, completionPercent: number, playCount: number } }
 */

const HISTORY_KEY = 'dreamvalley_listening_history';

function _getAll() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function _save(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save listening history:', e);
  }
}

/**
 * Record that the user listened to a story.
 * @param {string} storyId
 * @param {number} completionPercent - 0-100 how far through the story
 */
export function recordListen(storyId, completionPercent) {
  if (!storyId) return;
  const history = _getAll();
  const existing = history[storyId] || { playCount: 0, completionPercent: 0 };

  history[storyId] = {
    lastPlayedAt: Date.now(),
    completionPercent: Math.max(existing.completionPercent, Math.round(completionPercent)),
    playCount: existing.playCount + (existing.lastPlayedAt ? 0 : 1),
  };

  // Increment play count only on first call per session (tracked by a separate flag)
  // Actually, simpler: always update, increment count when completionPercent goes from <20 to >=20
  if (completionPercent >= 20 && existing.completionPercent < 20) {
    history[storyId].playCount = existing.playCount + 1;
  }

  _save(history);
}

/**
 * Mark a story as fully listened (100% completion).
 * Called on audio 'ended' event.
 * @param {string} storyId
 */
export function markCompleted(storyId) {
  if (!storyId) return;
  const history = _getAll();
  const existing = history[storyId] || { playCount: 0, completionPercent: 0 };

  history[storyId] = {
    lastPlayedAt: Date.now(),
    completionPercent: 100,
    playCount: Math.max(existing.playCount, 1),
  };

  _save(history);
}

/**
 * Check if a story has been listened to (>= 20% completion).
 * @param {string} storyId
 * @returns {boolean}
 */
export function isListened(storyId) {
  const history = _getAll();
  const entry = history[storyId];
  return !!(entry && entry.completionPercent >= 20);
}

/**
 * Get the timestamp when a story was last played.
 * @param {string} storyId
 * @returns {number|null} Unix timestamp or null
 */
export function getLastPlayedAt(storyId) {
  const history = _getAll();
  return history[storyId]?.lastPlayedAt || null;
}

/**
 * Get the full history entry for a story.
 * @param {string} storyId
 * @returns {{ lastPlayedAt: number, completionPercent: number, playCount: number } | null}
 */
export function getHistoryEntry(storyId) {
  const history = _getAll();
  return history[storyId] || null;
}

/**
 * Sort stories: unlistened first (in original order), then listened (oldest listen first).
 * @param {Array} stories - Array of story objects with 'id' field
 * @returns {Array} Sorted copy
 */
export function sortByDiscovery(stories) {
  if (!stories || !stories.length) return stories;

  const history = _getAll();

  const unlistened = [];
  const listened = [];

  for (const story of stories) {
    const entry = history[story.id];
    if (entry && entry.completionPercent >= 20) {
      listened.push({ story, lastPlayedAt: entry.lastPlayedAt });
    } else {
      unlistened.push(story);
    }
  }

  // Listened: sort by oldest listen first (so most recently listened are at the very end)
  listened.sort((a, b) => a.lastPlayedAt - b.lastPlayedAt);

  return [...unlistened, ...listened.map((l) => l.story)];
}
