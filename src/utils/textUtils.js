/**
 * Text utilities for cleaning and formatting story/poem content.
 */

// Matches emotional/TTS markers like [GENTLE], [PAUSE], [laugh], etc.
const MARKER_REGEX = /\[(GENTLE|CALM|JOYFUL|PAUSE|WHISPERING|SLEEPY|RHYTHMIC|CURIOUS|EXCITED|ADVENTUROUS|MYSTERIOUS|DRAMATIC_PAUSE|DRAMATIC|SINGING|HUMMING|PHASE_2|PHASE_3|CHAR_START|CHAR_END|LONG_PAUSE|BREATH_CUE|laugh|chuckle)\]/gi;

// Matches inline emphasis/safety markers: [EMPHASIS]word[/EMPHASIS], [SAFETY]word[/SAFETY]
const INLINE_MARKER_REGEX = /\[(EMPHASIS|SAFETY)\](.*?)\[\/\1\]/gi;

/**
 * Remove emotional markers from display text.
 * These markers are used by TTS but should not be shown to the user.
 *
 * @param {string} text - Raw text possibly containing [MARKER] tags
 * @returns {string} Clean text with markers removed and extra whitespace collapsed
 */
export function stripEmotionMarkers(text) {
  if (!text) return text;
  return text
    .replace(INLINE_MARKER_REGEX, '$2')
    .replace(MARKER_REGEX, '')
    .replace(/  +/g, ' ')
    .trim();
}
