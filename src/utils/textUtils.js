/**
 * Text utilities for cleaning and formatting story/poem content.
 */

// Matches emotional/TTS markers like [GENTLE], [PAUSE], [laugh], etc.
const MARKER_REGEX = /\[(GENTLE|CALM|JOYFUL|PAUSE|WHISPERING|SLEEPY|RHYTHMIC|CURIOUS|EXCITED|ADVENTUROUS|MYSTERIOUS|DRAMATIC_PAUSE|DRAMATIC|SINGING|HUMMING|laugh|chuckle)\]/gi;

/**
 * Remove emotional markers from display text.
 * These markers are used by TTS but should not be shown to the user.
 *
 * @param {string} text - Raw text possibly containing [MARKER] tags
 * @returns {string} Clean text with markers removed and extra whitespace collapsed
 */
export function stripEmotionMarkers(text) {
  if (!text) return text;
  return text.replace(MARKER_REGEX, '').replace(/  +/g, ' ').trim();
}
