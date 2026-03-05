/**
 * musicComposer.js — Client-side Music Composition from Musical Briefs
 *
 * Takes a ~500-byte Musical Brief (from Mistral) and deterministically
 * composes full musicParams at runtime in the browser.
 *
 * Pipeline: Musical Brief → Scale Builder → Markov Melody → Pad Preset
 *           → Phase Derivation → musicParams for ambientMusic.js
 */

// ── Scale Builder ────────────────────────────────────────────────────────────

const SCALE_INTERVALS = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  dorian:           [0, 2, 3, 5, 7, 9, 10],
  aeolian:          [0, 2, 3, 5, 7, 8, 10],
  mixolydian:       [0, 2, 4, 5, 7, 9, 10],
};

const ROOT_FREQ = {
  'C': 261.63, 'D': 293.66, 'Eb': 311.13, 'E': 329.63,
  'F': 349.23, 'G': 392.00, 'Ab': 415.30, 'A': 440.00,
  'Bb': 466.16, 'B': 493.88,
};

/**
 * Build array of frequencies for a given scale across specified octaves.
 * Octave 4 = middle C octave.
 */
export function buildScale(mode, rootNote, octaveRange = [3, 5]) {
  const intervals = SCALE_INTERVALS[mode] || SCALE_INTERVALS.major_pentatonic;
  const root = ROOT_FREQ[rootNote] || ROOT_FREQ['C'];
  const freqs = [];

  for (let oct = octaveRange[0]; oct <= octaveRange[1]; oct++) {
    const octMult = Math.pow(2, oct - 4);
    for (const semitones of intervals) {
      freqs.push(root * octMult * Math.pow(2, semitones / 12));
    }
  }
  return freqs;
}

/**
 * Get chord tones (root + fifth) from the scale for pad harmony.
 */
export function buildChord(mode, rootNote, octave = 3) {
  const root = ROOT_FREQ[rootNote] || ROOT_FREQ['C'];
  const octMult = Math.pow(2, octave - 4);
  const r = root * octMult;
  const fifth = root * octMult * Math.pow(2, 7 / 12);
  return [r, fifth];
}


// ── Seeded PRNG ──────────────────────────────────────────────────────────────

/**
 * Linear congruential generator for deterministic random output.
 * Same seed + same calls = same sequence every time.
 */
export function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

/**
 * Pick from weighted options using a random value.
 * @param {Object} weights - {option: probability}
 * @param {Function} rng - seeded random function
 * @returns {number} selected option (parsed as int)
 */
function weightedChoice(weights, rng) {
  const r = rng();
  let cumulative = 0;
  for (const [option, prob] of Object.entries(weights)) {
    cumulative += prob;
    if (r <= cumulative) return parseInt(option);
  }
  return parseInt(Object.keys(weights).pop());
}


// ── Markov Melody Engine ─────────────────────────────────────────────────────

/**
 * Transition tables indexed by scale degree (1-indexed).
 * Values are {nextDegree: probability}, summing to 1.0.
 */
const MELODY_MARKOV = {
  descending_lullaby: {
    5: { 4: 0.35, 3: 0.30, 5: 0.15, 1: 0.10, 2: 0.10 },
    4: { 3: 0.35, 2: 0.25, 4: 0.15, 5: 0.15, 1: 0.10 },
    3: { 2: 0.30, 1: 0.30, 3: 0.15, 4: 0.15, 5: 0.10 },
    2: { 1: 0.40, 3: 0.20, 2: 0.20, 5: 0.10, 4: 0.10 },
    1: { 5: 0.30, 2: 0.25, 1: 0.20, 3: 0.15, 4: 0.10 },
  },
  cycling_arpeggio: {
    1: { 3: 0.55, 2: 0.25, 5: 0.15, 1: 0.05 },
    2: { 3: 0.45, 1: 0.35, 4: 0.10, 2: 0.10 },
    3: { 5: 0.50, 4: 0.20, 2: 0.20, 3: 0.10 },
    4: { 5: 0.45, 3: 0.30, 1: 0.15, 4: 0.10 },
    5: { 3: 0.30, 4: 0.25, 1: 0.25, 5: 0.10, 2: 0.10 },
  },
  drone_with_ornaments: {
    1: { 1: 0.50, 2: 0.20, 5: 0.20, 3: 0.10 },
    2: { 1: 0.60, 3: 0.15, 2: 0.15, 5: 0.10 },
    3: { 2: 0.35, 1: 0.35, 3: 0.15, 4: 0.15 },
    4: { 5: 0.40, 3: 0.30, 4: 0.15, 1: 0.15 },
    5: { 5: 0.45, 1: 0.25, 4: 0.20, 3: 0.10 },
  },
  stillness: {
    1: { 1: 0.70, 5: 0.20, 2: 0.10 },
    2: { 1: 0.65, 2: 0.25, 3: 0.10 },
    3: { 1: 0.50, 2: 0.30, 3: 0.20 },
    4: { 5: 0.50, 1: 0.30, 4: 0.20 },
    5: { 1: 0.45, 5: 0.40, 4: 0.15 },
  },
};

/**
 * Generate a single melodic phrase using Markov chain.
 */
function generatePhrase(markovType, scaleFreqs, phraseLength, seed) {
  const table = MELODY_MARKOV[markovType] || MELODY_MARKOV.descending_lullaby;
  const rng = seededRandom(seed);
  const maxDegree = Math.min(5, Object.keys(table).length);

  // Start high for descending types, on root for drones
  let currentDegree = maxDegree;
  if (markovType === 'drone_with_ornaments' || markovType === 'stillness') {
    currentDegree = 1;
  }

  const notes = [];
  for (let i = 0; i < phraseLength; i++) {
    const transitions = table[currentDegree];
    if (!transitions) { currentDegree = 1; continue; }

    const nextDegree = weightedChoice(transitions, rng);
    const freqIndex = Math.min(nextDegree - 1, scaleFreqs.length - 1);
    notes.push(scaleFreqs[Math.max(0, freqIndex)]);
    currentDegree = nextDegree;
  }
  return notes;
}

/**
 * Generate a full melody sequence with phrase repetition and mutation.
 * ambientMusic.js walks through this array sequentially, looping at the end.
 */
export function generateMelodySequence(markovType, scaleFreqs, opts = {}) {
  const {
    phraseLength = 5,
    repetitions = 4,
    mutationRate = 0.15,
    seed = 42,
  } = opts;

  const seedPhrase = generatePhrase(markovType, scaleFreqs, phraseLength, seed);
  const fullSequence = [...seedPhrase];

  for (let rep = 1; rep < repetitions; rep++) {
    const rng = seededRandom(seed + rep * 1000);
    const variation = seedPhrase.map((freq) => {
      if (rng() < mutationRate) {
        const currentIndex = scaleFreqs.indexOf(freq);
        if (currentIndex === -1) return freq;
        const offset = rng() < 0.5 ? -1 : 1;
        const newIndex = Math.max(0, Math.min(scaleFreqs.length - 1, currentIndex + offset));
        return scaleFreqs[newIndex];
      }
      return freq;
    });
    fullSequence.push(...variation);
  }

  return fullSequence;
}


// ── Pad Presets ──────────────────────────────────────────────────────────────

const PAD_PRESETS = {
  warm_strings: {
    padType: 'chorus',
    filterCutoff: 1200,
    lfoRate: 0.06,
    gain: 0.10,
  },
  crystal_air: {
    padType: 'simple',
    filterCutoff: 2000,
    lfoRate: 0.08,
    gain: 0.08,
  },
  deep_ocean: {
    padType: 'resonant',
    filterCutoff: 600,
    lfoRate: 0.03,
    gain: 0.12,
    noiseType: 'brown',
  },
  forest_hum: {
    padType: 'resonant',
    filterCutoff: 800,
    lfoRate: 0.05,
    gain: 0.08,
    noiseType: 'pink',
  },
  starfield: {
    padType: 'simple',
    filterCutoff: 3000,
    lfoRate: 0.02,
    gain: 0.06,
  },
  earth_drone: {
    padType: 'fm',
    filterCutoff: 500,
    lfoRate: 0.03,
    gain: 0.10,
  },
  silk_veil: {
    padType: 'chorus',
    filterCutoff: 1500,
    lfoRate: 0.04,
    gain: 0.07,
  },
  cave_resonance: {
    padType: 'resonant',
    filterCutoff: 400,
    lfoRate: 0.02,
    gain: 0.09,
    noiseType: 'brown',
  },
};


// ── Loop Key Matching (3-key system) ─────────────────────────────────────────

const LOOP_BASE_KEYS = ['C', 'F', 'A'];
const SEMITONES = {
  'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
  'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11,
};

/**
 * Select the nearest base key file and compute pitch shift.
 * Max ±3 semitones → max ~19% tempo impact.
 */
export function selectLoopKeyAndShift(targetRoot) {
  const targetSemi = SEMITONES[targetRoot] ?? 0;

  let bestKey = 'C';
  let bestShift = 12;

  for (const baseKey of LOOP_BASE_KEYS) {
    const baseSemi = SEMITONES[baseKey];
    let shift = targetSemi - baseSemi;
    if (shift > 6) shift -= 12;
    if (shift < -6) shift += 12;

    if (Math.abs(shift) < Math.abs(bestShift)) {
      bestShift = shift;
      bestKey = baseKey;
    }
  }

  return {
    baseKey: bestKey,
    playbackRate: Math.pow(2, bestShift / 12),
    tempoImpact: (Math.pow(2, bestShift / 12) - 1) * 100,
  };
}


// ── Loop Fallback Mapping ────────────────────────────────────────────────
// Maps primaryLoop names to existing music loop preset names (from soundscapeConfig.js)
// Used when 3-key loop files aren't available

const LOOP_FALLBACK = {
  harp_arpeggios: 'calmHarp',
  koto_plucks: 'cosmicSynth',
  kalimba_melody: 'musicBox',
  singing_bowl_rings: 'etherealPad',
  cello_sustains: 'softStrings',
  hang_drum_melody: 'cosmicSynth',
  guitar_fingerpick: 'gentleGuitar',
  music_box_melody: 'musicBox',
  flute_breathy: 'forestFlute',
  marimba_soft: 'oceanMelody',
  dulcimer_gentle: 'calmHarp',
  piano_lullaby: 'pianoLullaby',
};


// ── Nature Sound → Soundscape Mapping ────────────────────────────────────────

const NATURE_SOUND_TO_SOUNDSCAPE = {
  'forest_night': 'forest',
  'rain_steady': 'rain',
  'rain_light': 'rain',
  'ocean_waves_close': 'ocean',
  'ocean_waves_distant': 'ocean',
  'river_stream': 'river',
  'wind_gentle': 'wind',
  'wind_high': 'wind',
  'underwater': 'ocean',
  'fireplace_crackle': 'fireplace',
  'near_silence': null,
};


// ── Age-specific Intervals ───────────────────────────────────────────────────

const AGE_INTERVALS = {
  '2-5':  { phase1: 4500, phase2: 7500, phase3: null },
  '6-8':  { phase1: 5500, phase2: 8000, phase3: 13000 },
  '9-12': { phase1: 8000, phase2: null, phase3: null },
};


// ── Hash Function ────────────────────────────────────────────────────────────

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 1; // avoid 0 seed
}


// ── Phase Derivation ─────────────────────────────────────────────────────────

function derivePhase2(p1, intervals, ageGroup) {
  return {
    ...p1,
    padFilter: p1.padFilter * 0.70,
    padLfo: p1.padLfo * 0.60,
    padGain: p1.padGain * 0.85,

    melodyInterval: intervals.phase2,
    melodyGain: ageGroup === '9-12' ? 0 : p1.melodyGain * 0.60,

    noiseGain: p1.noiseGain * 1.5,
    droneGain: p1.droneGain * 0.70,

    musicLoopGain: p1.musicLoopGain * 0.60,

    events: (p1.events || []).map(e => ({
      ...e,
      interval: e.interval * 2,
      gain: e.gain * 0.70,
    })),
  };
}

function derivePhase3(p1) {
  return {
    ...p1,
    padType: 'simple',
    padFilter: p1.padFilter * 0.40,
    padLfo: p1.padLfo * 0.30,
    padGain: p1.padGain * 0.50,

    melodyGain: 0,

    noiseGain: p1.noiseGain * 2.0,
    droneGain: p1.droneGain * 0.40,

    musicLoopGain: 0,

    events: [],
  };
}


// ── Main Composition Function ────────────────────────────────────────────────

/**
 * Translate a Musical Brief into a v2-compatible musicParams object.
 * Output feeds directly into ambientMusic.js play().
 *
 * @param {Object} brief - Musical Brief from Mistral
 * @returns {Object} v2 musicParams with phase1/phase2/phase3
 */
export function composeMusicParams(brief) {
  const seed = hashString(brief.storyId || 'default');
  const ageGroup = brief.ageGroup || '6-8';

  // 1. Build scale frequencies
  const mode = brief.tonality?.mode || 'major_pentatonic';
  const rootNote = brief.tonality?.rootNote || 'C';
  const scaleFreqs = buildScale(mode, rootNote, [3, 5]);
  const chordFreqs = buildChord(mode, rootNote, 3);

  // 2. Generate melody sequence
  const melodicCharacter = brief.melodicCharacter || 'descending_lullaby';
  const isSilent = melodicCharacter === 'stillness';

  const phraseOpts = {
    '2-5':  { phraseLength: 5, repetitions: 6, mutationRate: 0.12 },
    '6-8':  { phraseLength: 6, repetitions: 4, mutationRate: 0.20 },
    '9-12': { phraseLength: 4, repetitions: 3, mutationRate: 0.25 },
  };
  const opts = phraseOpts[ageGroup] || phraseOpts['6-8'];

  const melodySequence = isSilent ? [] : generateMelodySequence(
    melodicCharacter, scaleFreqs, { ...opts, seed }
  );

  // 3. Get pad preset
  const padChar = brief.musicalIdentity?.padCharacter || 'warm_strings';
  const pad = PAD_PRESETS[padChar] || PAD_PRESETS.warm_strings;

  // 4. Music loop path and pitch shift
  const loopId = brief.musicalIdentity?.primaryLoop || 'piano_lullaby';
  const loopKeyInfo = selectLoopKeyAndShift(rootNote);
  const loopPath = `/audio/music-loops/${loopId}_${loopKeyInfo.baseKey}.mp3`;
  const loopFallback = LOOP_FALLBACK[loopId] || 'pianoLullaby';

  // 5. Note intervals
  const intervals = AGE_INTERVALS[ageGroup] || AGE_INTERVALS['6-8'];
  const jitter = (brief.rhythm?.feel === 'free_rubato') ? 0.30 : 0.15;

  // 6. Soundscape from nature sound
  const soundscapePreset = NATURE_SOUND_TO_SOUNDSCAPE[
    brief.environment?.natureSoundPrimary
  ] || 'rain';

  // 7. Ambient events
  const rng = seededRandom(seed + 999);
  const ambientEvents = (brief.environment?.ambientEvents || []).map(type => ({
    type,
    interval: 12000 + (rng() * 10000),
    gain: 0.03,
  }));

  // 8. Assemble Phase 1 params (field names match _buildFromParams expectations)
  const melodyGain = isSilent ? 0 : (ageGroup === '9-12' ? 0.03 : 0.06);
  const phase1 = {
    chordNotes: chordFreqs,
    padType: pad.padType,
    padFilter: pad.filterCutoff,
    padLfo: pad.lfoRate,
    padGain: pad.gain,
    noiseType: pad.noiseType || 'pink',
    noiseGain: 0.04,
    noiseFilterCenter: 500,
    droneFreq: chordFreqs[0],
    droneGain: 0.04,
    melodyNotes: scaleFreqs, // fallback for legacy code
    melodySequence: melodySequence,
    melodyInterval: intervals.phase1,
    melodyIntervalJitter: jitter,
    melodyGain: melodyGain,
    // bass and counter melody disabled per sleep overhaul
    bassInterval: 99999, // effectively disabled
    bassGain: 0,
    events: ambientEvents,
    // music loop info for ambientMusic.js
    musicLoopPath: loopPath,
    musicLoopPlaybackRate: loopKeyInfo.playbackRate,
    musicLoopGain: ageGroup === '9-12' ? 0.04 : 0.08,
  };

  // 9. Derive Phase 2 and Phase 3
  const phase2 = derivePhase2(phase1, intervals, ageGroup);
  const phase3 = derivePhase3(phase1);

  return {
    version: 2,
    counterMelody: false,
    soundscapePreset: soundscapePreset,
    musicLoop: loopFallback, // fallback: existing preset if 3-key files unavailable
    phase1,
    phase2,
    phase3,
    masterLowpass: { '1': 8000, '2': 4000, '3': 2000 },
    transitions: {
      '1to2': { duration: 75 },
      '2to3': { duration: 90 },
    },
  };
}

/**
 * Detect whether an object is a Musical Brief (vs raw musicParams).
 */
export function isMusicalBrief(obj) {
  return obj && typeof obj === 'object' &&
    obj.musicalIdentity && obj.tonality && obj.melodicCharacter;
}
