/**
 * Shared voice configuration — single source of truth for all voice metadata.
 * Used by onboarding, player, and settings pages.
 */

export const VOICES = {
  female_1: { label: 'Calm',    labelHi: 'शांत',   icon: '🌙' },
  female_2: { label: 'Soft',    labelHi: 'कोमल',   icon: '🌿' },
  female_3: { label: 'Melodic', labelHi: 'मधुर',   icon: '🎵' },
  male_2:   { label: 'Gentle',  labelHi: 'सौम्य',  icon: '🌊' },
  asmr:     { label: 'ASMR',    labelHi: 'ASMR',   icon: '🎧' },
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

/** Get all selectable voices as [id, meta] pairs. */
export const getSelectableVoices = () => Object.entries(VOICES);

/** Get the voice label, respecting language. */
export const getVoiceLabel = (baseId, lang) => {
  const meta = VOICES[baseId];
  if (!meta) return baseId;
  return lang === 'hi' ? meta.labelHi : meta.label;
};
