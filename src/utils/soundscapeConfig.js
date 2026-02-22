/**
 * Soundscape & Music Loop Configuration
 *
 * Defines ambient soundscape presets, music loop presets, and theme-based
 * mappings used by AmbientMusicEngine to layer real audio over synthesis.
 *
 * Audio files live in:
 *   /public/audio/soundscapes/  — ambient environment loops
 *   /public/audio/music-loops/  — melodic background music loops
 */

// ── Soundscape Presets ──────────────────────────────────────────────────────
// Each preset maps to 1-2 loopable audio files with a default gain level.
// The engine picks one file at random and loops it seamlessly.

export const SOUNDSCAPES = {
  rain:        { label: 'Rain',          files: ['rain-light.mp3', 'rain-heavy.mp3'],       gain: 0.15 },
  ocean:       { label: 'Ocean Waves',   files: ['ocean-waves.mp3', 'ocean-shore.mp3'],     gain: 0.12 },
  forest:      { label: 'Forest Night',  files: ['forest-crickets.mp3', 'forest-night.mp3'],gain: 0.10 },
  wind:        { label: 'Soft Wind',     files: ['wind-gentle.mp3', 'wind-leaves.mp3'],     gain: 0.10 },
  heartbeat:   { label: 'Heartbeat',     files: ['heartbeat-womb.mp3'],                     gain: 0.12 },
  fireplace:   { label: 'Fireplace',     files: ['fireplace-crackle.mp3'],                  gain: 0.10 },
  starryNight: { label: 'Starry Night',  files: ['night-ambient.mp3', 'night-ethereal.mp3'],gain: 0.08 },
  garden:      { label: 'Garden',        files: ['garden-birds.mp3', 'garden-morning.mp3'], gain: 0.10 },
  snow:        { label: 'Snow',          files: ['snow-wind.mp3', 'snow-quiet.mp3'],        gain: 0.08 },
  thunder:     { label: 'Distant Storm', files: ['thunder-rain.mp3', 'storm-distant.mp3'],  gain: 0.10 },
  river:       { label: 'River',         files: ['river-stream.mp3', 'babbling-brook.mp3'], gain: 0.12 },
  desert:      { label: 'Desert Night',  files: ['desert-wind.mp3', 'desert-crickets.mp3'], gain: 0.08 },
};

// ── Music Loop Presets ──────────────────────────────────────────────────────
// Single-file melodic loops that play alongside (or instead of) the synth pad.

export const MUSIC_LOOPS = {
  pianoLullaby:  { file: 'piano-lullaby.mp3',  gain: 0.08 },
  musicBox:      { file: 'music-box.mp3',      gain: 0.07 },
  gentleGuitar:  { file: 'gentle-guitar.mp3',  gain: 0.08 },
  etherealPad:   { file: 'ethereal-pad.mp3',   gain: 0.06 },
  softStrings:   { file: 'soft-strings.mp3',   gain: 0.07 },
  calmHarp:      { file: 'calm-harp.mp3',      gain: 0.08 },
  cosmicSynth:   { file: 'cosmic-synth.mp3',   gain: 0.06 },
  oceanMelody:   { file: 'ocean-melody.mp3',   gain: 0.07 },
  forestFlute:   { file: 'forest-flute.mp3',   gain: 0.07 },
  nightPiano:    { file: 'night-piano.mp3',    gain: 0.08 },
};

// ── Theme → Preset Mapping ─────────────────────────────────────────────────
// Each story theme maps to a soundscape + music loop combination.
// The engine uses this when a story has a `theme` but no explicit
// `soundscapePreset` / `musicLoop` in its musicParams.

export const THEME_PRESETS = {
  ocean:       { soundscape: 'ocean',       music: 'oceanMelody'   },
  animals:     { soundscape: 'forest',      music: 'forestFlute'   },
  nature:      { soundscape: 'garden',      music: 'gentleGuitar'  },
  fantasy:     { soundscape: 'starryNight', music: 'etherealPad'   },
  adventure:   { soundscape: 'wind',        music: 'gentleGuitar'  },
  space:       { soundscape: 'starryNight', music: 'cosmicSynth'   },
  bedtime:     { soundscape: 'rain',        music: 'pianoLullaby'  },
  friendship:  { soundscape: 'garden',      music: 'softStrings'   },
  mystery:     { soundscape: 'forest',      music: 'nightPiano'    },
  science:     { soundscape: 'river',       music: 'etherealPad'   },
  family:      { soundscape: 'fireplace',   music: 'calmHarp'      },
  dreamy:      { soundscape: 'rain',        music: 'pianoLullaby'  },
  fairy_tale:  { soundscape: 'garden',      music: 'musicBox'      },
};

// For babies (age 0-1): always use heartbeat + music box
export const BABY_PRESET = { soundscape: 'heartbeat', music: 'musicBox' };

// ── Path Helpers ────────────────────────────────────────────────────────────

export const SOUNDSCAPE_BASE_PATH = '/audio/soundscapes';
export const MUSIC_LOOP_BASE_PATH = '/audio/music-loops';

/** Resolve a soundscape preset name to full file URLs. */
export function getSoundscapeUrls(presetName) {
  const preset = SOUNDSCAPES[presetName];
  if (!preset) return null;
  return {
    ...preset,
    urls: preset.files.map(f => `${SOUNDSCAPE_BASE_PATH}/${f}`),
  };
}

/** Resolve a music loop preset name to its full file URL. */
export function getMusicLoopUrl(presetName) {
  const preset = MUSIC_LOOPS[presetName];
  if (!preset) return null;
  return {
    ...preset,
    url: `${MUSIC_LOOP_BASE_PATH}/${preset.file}`,
  };
}
