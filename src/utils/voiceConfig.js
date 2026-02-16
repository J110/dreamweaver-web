/**
 * Shared voice configuration — single source of truth for all voice metadata.
 * Used by onboarding, player, and settings pages.
 */

export const VOICES = {
  female_1: { label: 'Calm',    labelHi: 'शांत',     icon: '🌙', gender: 'female' },
  female_2: { label: 'Soft',    labelHi: 'कोमल',    icon: '🌿', gender: 'female' },
  female_3: { label: 'Melodic', labelHi: 'मधुर',    icon: '🎵', gender: 'female' },
  male_1:   { label: 'Warm',    labelHi: 'स्नेही',   icon: '🧭', gender: 'male' },
  male_2:   { label: 'Gentle',  labelHi: 'सौम्य',   icon: '🌊', gender: 'male' },
  male_3:   { label: 'Musical', labelHi: 'संगीतमय', icon: '🎶', gender: 'male' },
  asmr:     { label: 'ASMR',    labelHi: 'ASMR',    icon: '🎧', gender: 'neutral', isSpecial: true },
};

/** Map a base voice ID to its language-specific variant. */
export const getVoiceId = (baseId, lang) => {
  // ASMR uses asmr / asmr_hi (not asmr_hi_hi)
  if (baseId === 'asmr') return lang === 'hi' ? 'asmr_hi' : 'asmr';
  return lang === 'hi' ? `${baseId}_hi` : baseId;
};

/** Get the sample audio URL for a voice. */
export const getSampleUrl = (baseId, lang) =>
  `/audio/samples/${getVoiceId(baseId, lang)}.mp3`;

/** Get all voices for a given gender as [id, meta] pairs (excludes special voices like ASMR). */
export const getVoicesForGender = (gender) =>
  Object.entries(VOICES).filter(([, v]) => v.gender === gender && !v.isSpecial);

/** Get the voice label, respecting language. */
export const getVoiceLabel = (baseId, lang) => {
  const meta = VOICES[baseId];
  if (!meta) return baseId;
  return lang === 'hi' ? meta.labelHi : meta.label;
};
