# Dream Valley — Ambient Music Design Guide

This guide defines the sound design system for all story background music in Dream Valley (Sapno ki Duniya). Every new story must include a unique ambient music profile that follows these specifications to ensure immersive, calming, non-repetitive soundscapes.

---

## 1. System Overview

| Property | Value |
|----------|-------|
| Engine | `AmbientMusicEngine` class in `src/utils/ambientMusic.js` |
| Technology | Web Audio API (no audio files — pure synthesis) |
| Default volume | 30% (background level, never competing with TTS narration) |
| Fade in/out | 3 seconds |
| Singleton | Access via `getAmbientMusic()` |
| Profile key format | `kebab-case` (e.g., `forest-night`, `ocean-drift`) |
| Registration | `musicProfile` field in `seedData.js` story objects |

### Why Procedural Audio (not audio files)

- Zero bandwidth — no MP3/WAV downloads
- Infinite variation — randomized timing/pitch prevents exact loops
- Per-story uniqueness — each profile generates a distinct soundscape
- Tiny footprint — all 8 profiles in ~1300 lines of JS
- User control — volume slider and mute toggle in player UI

---

## 2. Anatomy of a Sound Profile

Every profile is a dedicated builder method (`_buildProfileName()`) in the `AmbientMusicEngine` class. Each profile must contain these layers:

```
LAYER 1: Harmonic Foundation   — Sustained chord pad (sets mood/key)
LAYER 2: Ambient Texture       — Continuous noise (wind, ocean, space hum)
LAYER 3: Environment Events    — Recurring sounds (animal calls, water drops, creaks)
LAYER 4: Melodic Element       — Gentle repeating melody (music box, harp, bells)
LAYER 5: Sparkle/Accent Layer  — Rare, magical moments (sparkle cascades, shooting stars)
LAYER 6: Spatial Variety       — Stereo-panned events for immersion
```

### Minimum Requirements

| Requirement | Minimum |
|-------------|---------|
| Distinct sound layers | 5+ |
| Scheduled event types | 4+ (via `_scheduleRepeating`) |
| Unique chord/key | Must differ from all existing profiles |
| Oscillator types used | 2+ different types |
| Stereo-panned elements | 3+ events with `pan` parameter |

---

## 3. Harmonic Foundation — Pad Layer

### 3.1 Chord Assignments (Existing)

Each profile uses a unique chord voicing. New profiles must NOT duplicate these chords:

| Profile | Key/Chord | Notes (Hz) | Oscillator | Character |
|---------|-----------|------------|------------|-----------|
| dreamy-clouds | C major | 130.81, 164.81, 196.00, 261.63 | sine | Warm, safe, lullaby |
| forest-night | E minor | 82.41, 123.47, 164.81, 196.00 | triangle | Dark, mysterious, organic |
| moonlit-meadow | F major 7th | 87.31, 130.81, 164.81, 207.65 | sine | Dreamy, open, floating |
| cosmic-voyage | D minor | 73.42, 110.00, 146.83, 174.61 | sine | Deep, vast, ethereal |
| enchanted-garden | G major | 98.00, 146.83, 196.00, 246.94 | sine | Bright, magical, cheerful |
| starlight-lullaby | Ab major | 103.83, 155.56, 207.65, 311.13 | sine | Tender, intimate, delicate |
| autumn-forest | D major | 73.42, 110.00, 146.83, 220.00 | sawtooth | Warm, rich, textured |
| ocean-drift | Eb major | 77.78, 116.54, 155.56, 233.08 | sine | Vast, rhythmic, calming |

### 3.2 Available Chords for New Profiles

These chords are NOT yet used and would provide good contrast:

| Chord | Character | Good For |
|-------|-----------|----------|
| A minor | Melancholic, introspective | Rainy day, cave story |
| Bb major | Warm, noble, open | Mountain sunrise, castle |
| B minor | Wistful, mysterious | Snow scene, northern lights |
| C minor | Serious, deep | Underwater, night cave |
| E major | Bright, bold | Desert, sunny meadow |
| F# minor | Ethereal, strange | Crystal cave, fairy ring |
| G minor | Dark but warm | Stormy night, cozy indoor |

### 3.3 Pad Construction Rules

```javascript
this._createPad([note1, note2, note3, note4], {
  type: 'sine',        // sine = smooth, triangle = organic, sawtooth = rich (use low gain!)
  gain: 0.035-0.05,    // NEVER above 0.06 — pad is background, not foreground
  detune: 2-8,         // Higher = wider/dreamier, lower = focused/intimate
  filterFreq: 400-1100, // Lower = warmer/muffled, higher = brighter/present
  filterQ: 0.3-1.2,    // Keep low for smooth sound
  lfoRate: 0.03-0.12,  // Filter modulation speed (Hz) — slower = more meditative
  lfoDepth: 20-60,     // Filter modulation amount — higher = more movement
});
```

### 3.4 Pad Diversity Requirements

When creating a new profile, the pad must differ from all existing profiles in at least 3 of these 5 axes:

- **Root note** (different letter name, e.g., C vs D vs Eb)
- **Chord quality** (major vs minor vs 7th vs suspended)
- **Oscillator type** (sine vs triangle vs sawtooth)
- **Filter frequency range** (low <600 vs mid 600-900 vs high >900)
- **LFO speed** (slow <0.05 vs medium 0.05-0.08 vs fast >0.08)

---

## 4. Ambient Texture — Noise Layer

### 4.1 Noise Types

| Type | Character | Best For |
|------|-----------|----------|
| `pink` | Natural, balanced, like gentle wind | Most environments (wind, ocean wash, rain) |
| `brown` | Deep, rumbling, like distant thunder | Forests (rustling), caves, deep underwater |
| `white` | Bright, hissy, like static | Space environments, radio crackle, snow |

### 4.2 Noise Usage Rules

```javascript
// Continuous ambient texture (always running)
this._createAmbientNoise({
  type: 'pink',          // pink for most, brown for deep scenes, white for space
  gain: 0.004-0.02,      // SUBTLE — should barely be noticeable alone
  filterFreq: 200-2000,  // Lower = more muffled/distant, higher = more present
  filterQ: 0.3-0.5,      // Keep low for natural sound
});
```

### 4.3 Noise Bursts (Wind Gusts, Wave Crashes)

For intermittent texture events, use `_playNoiseBurst`:

```javascript
this._playNoiseBurst({
  noiseType: 'pink',         // Type of noise
  duration: 1-6,             // Seconds — longer for wind gusts, shorter for impacts
  gain: 0.004-0.015,         // Brief events can be slightly louder
  filterFreq: 150-3000,      // Sweep range for movement
  filterQ: 0.5-3,            // Higher Q for more "whooshy" character
  pan: -1.0 to 1.0,          // Stereo position (-1=left, 0=center, 1=right)
});
```

---

## 5. Environment Events — Sound Catalog

This is what makes each profile feel unique and alive. Events are scheduled with randomized timing so they never feel like a loop.

### 5.1 Scheduling System

```javascript
this._scheduleRepeating(
  () => { /* sound generation code */ },
  baseInterval,    // Average ms between events (e.g., 8000 = ~every 8 seconds)
  jitterFactor,    // 0.0-0.6 — randomization amount (0.4 = ±40% timing variation)
  initialDelay     // ms before first occurrence (null = random start)
);
```

### 5.2 Timing Guidelines

| Event Frequency | Interval | Use For |
|----------------|----------|---------|
| Very frequent | 2000-4000ms | Crickets, star twinkles, water drops |
| Frequent | 5000-8000ms | Bird calls, wind gusts, melody notes |
| Moderate | 8000-15000ms | Frog croaks, acorn drops, sparkle cascades |
| Rare | 15000-25000ms | Owl hoots, whale song, shooting stars |
| Very rare | 25000-35000ms | Fox call, bee flyby, comet whoosh |

### 5.3 Event Sound Catalog

#### Animal Sounds

| Sound | Technique | Key Parameters | Used In |
|-------|-----------|---------------|---------|
| **Cricket chirp** | Rapid sine bursts at 3800-5000Hz | gain: 0.003-0.008, decay: 0.06s, 4-8 chirps per burst | forest-night |
| **Frog croak** | Filtered square wave at 180-240Hz | gain: 0.006-0.008, decay: 0.12-0.15s, two-tone "ribbit" | forest-night |
| **Owl hoot** | Sine with pitch glide, two-tone "hoo-HOO" | 340→390Hz, gain: 0.008-0.015, vibrato 5Hz | forest-night, autumn-forest |
| **Fox call** | Sine with rapid pitch sweep 600→900→400Hz | gain: 0.006, decay: 0.5s | moonlit-meadow |
| **Bird chirp** | Short sine burst at 1800-3200Hz | gain: 0.005-0.006, decay: 0.15-0.25s | moonlit-meadow, enchanted-garden |
| **Birdsong phrase** | Sequence of 3-6 chirps with pitch pattern | varied Hz, 80-140ms spacing | enchanted-garden |
| **Whale song** | Long sine with extreme pitch glides | 100Hz→250Hz→120Hz→80Hz over 5s | ocean-drift |
| **Seagull cry** | Sine pitch sweep 1200→1800→1000Hz | gain: 0.005, bandpass at 1500Hz | ocean-drift |
| **Squirrel chitter** | Rapid square wave clicks at 3500-4500Hz | gain: 0.003, decay: 0.03s, 5-10 clicks | autumn-forest |
| **Bee buzz** | Low sawtooth (140-180Hz), panning L→R | gain: 0.003, bandpass at 300Hz | enchanted-garden |

#### Nature Sounds

| Sound | Technique | Key Parameters | Used In |
|-------|-----------|---------------|---------|
| **Wind gust** | Shaped pink noise burst, 3-6s | gain: 0.008-0.012, filterFreq: 200-400Hz | forest-night, autumn-forest |
| **Water droplet** | Short sine at 1800-3300Hz | gain: 0.003-0.007, decay: 0.3-0.6s | moonlit-meadow |
| **Wave cycle** | Pink noise with gain+filter envelope | build 40%, crash 10%, recede 50% | ocean-drift |
| **Rustling leaves** | White noise bursts, 50-100ms | gain: 0.004, filterFreq: 3000-5000Hz | autumn-forest |
| **Acorn drop** | Low sine thud (100-130Hz) + bounce | gain: 0.004-0.008, decay: 0.06-0.1s | autumn-forest |

#### Magical/Atmospheric Sounds

| Sound | Technique | Key Parameters | Used In |
|-------|-----------|---------------|---------|
| **Wind chime** | Random notes from C6-A6 scale | gain: 0.015-0.025, decay: 3s, 2-4 chimes | dreamy-clouds |
| **Sparkle cascade** | 5-6 descending high tones (2000-3500Hz) | gain: 0.004-0.008, 150ms spacing, panned | dreamy-clouds, enchanted-garden |
| **Star twinkle** | Single high sine (2000-5500Hz) | gain: 0.004-0.005, decay: 0.6-1.2s | cosmic-voyage, starlight-lullaby |
| **Shooting star** | Bandpass noise sweep 1000→6000→2000Hz | gain: 0.008, panning, with sparkle tail | starlight-lullaby |
| **Firefly glow** | Slow-attack sine at 1200-2000Hz | gain: 0.003, attack: 0.5s, decay: 2s | forest-night, moonlit-meadow |
| **Flower opening** | Rising sine 200→600Hz over 2s | gain: 0.006 | enchanted-garden |
| **Heartbeat** | Two low sine thumps (50-55Hz) | gain: 0.012-0.018, "lub-dub" pattern | dreamy-clouds |

#### Mechanical/Environmental Sounds

| Sound | Technique | Key Parameters | Used In |
|-------|-----------|---------------|---------|
| **Ship engine hum** | Sawtooth drone at 55Hz, heavy filter | gain: 0.008, filterFreq: 100Hz | cosmic-voyage |
| **Radio crackle** | Short white noise bursts, high filter | gain: 0.008, filterFreq: 3000-5000Hz, Q: 3 | cosmic-voyage |
| **Sonar ping** | Sine at 800-1200Hz with echo | gain: 0.015 + echo at 0.006, 400ms delay | cosmic-voyage |
| **Comet whoosh** | Pink noise with descending bandpass | 3000→200Hz sweep, stereo pan L→R | cosmic-voyage |
| **Boat creak** | Sawtooth 60→80→55Hz with bandpass Q:5 | gain: 0.005, at 200Hz | ocean-drift |
| **Underwater bubble** | Rising sine 300→600Hz, very short | gain: 0.004, decay: 0.2s, 2-5 per burst | ocean-drift |
| **Sleeping breath** | Slow pink noise, in-out pattern | gain: 0.003-0.005, 1.5s in + 2s out | autumn-forest |

### 5.4 Building New Event Sounds

Use the `_playTone` helper for pitched sounds:

```javascript
this._playTone(frequency, {
  type: 'sine',        // sine, triangle, square, sawtooth
  gain: 0.01,          // Keep LOW — events are accents, not leads
  attack: 0.01,        // Seconds — short for percussive, long for pads
  decay: 2.0,          // Seconds — how long the sound rings
  filterFreq: 3000,    // Low-pass cutoff — lower = darker
  filterQ: 0.5,        // Resonance — higher = more "ringing" at cutoff
  detune: 0,           // Cents — ±5 to ±15 for organic variation
  pan: 0,              // -1 (left) to 1 (right) for spatial placement
});
```

For custom pitch-swept or complex sounds, use raw Web Audio API:

```javascript
const ctx = this._ctx;
const now = ctx.currentTime;
const osc = ctx.createOscillator();
osc.type = 'sine';
osc.frequency.setValueAtTime(startFreq, now);
osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
// ... connect through gain → filter → this._masterGain
// Always schedule cleanup via setTimeout → this._timeouts.push(t)
```

---

## 6. Melodic Element

### 6.1 Melody Instrument Types

| Instrument | Technique | Character |
|-----------|-----------|-----------|
| **Music box** | Sine, sharp attack (0.003s), 2s decay, high filterFreq (3500Hz) | Crystalline, nostalgic, intimate |
| **Harp** | Sine, sharp attack (0.005s), 2.5s decay, filterFreq 2500Hz | Bright, magical, flowing |
| **Bell chime** | Sine, instant attack, 3s+ decay, filterFreq 2000-4000Hz | Resonant, spacious, sacred |
| **Flute/wind** | Triangle, slow attack (0.2-0.3s), 3s+ decay, filterFreq 700-900Hz | Breathy, organic, warm |
| **Theremin** | Sine, slow attack (0.5s), 4s decay, filterFreq 1200Hz, ±15 detune | Ethereal, spacey, eerie |
| **Lullaby** | Sine, medium attack (0.1s), 2.5s decay, filterFreq 1500Hz | Gentle, familiar, sleepy |

### 6.2 Melody Construction Rules

- **Notes per phrase**: 6-16 notes in a repeating cycle
- **Note interval**: 2200-7000ms between notes (slower = more meditative)
- **Always add slight random detune**: `(Math.random() - 0.5) * 4-8` cents
- **Jitter factor**: 0.08-0.2 (melody should be more regular than events)
- **Key matching**: Melody notes must belong to the pad's chord/key
- **Range**: Stay within 1.5 octaves of the pad's root for cohesion

### 6.3 Melody Note Selection Guide

The melody should use notes from the profile's chord plus passing tones from the scale:

| Profile Key | Scale Notes (Hz) for Melody |
|------------|---------------------------|
| C major | 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25 |
| E minor | 164.81, 185.00, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63 |
| F major | 174.61, 196.00, 220.00, 233.08, 261.63, 293.66, 329.63, 349.23 |
| D minor | 146.83, 164.81, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66 |
| G major | 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 369.99, 392.00 |
| Ab major | 207.65, 233.08, 261.63, 277.18, 311.13, 349.23, 392.00, 415.30 |
| D major | 146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 277.18, 293.66 |
| Eb major | 155.56, 174.61, 196.00, 207.65, 233.08, 261.63, 293.66, 311.13 |

For higher-register melodies (music box, chimes), multiply any note by 2 (up one octave) or 4 (up two octaves).

---

## 7. Gain Level Guidelines

This is critical — the music must NEVER overpower the TTS narration.

### 7.1 Maximum Gain by Layer

| Layer | Max Gain | Notes |
|-------|----------|-------|
| Pad oscillators (each) | 0.05 | 4 oscillators × 0.05 = 0.20 total pad |
| Ambient noise | 0.02 | Continuous, must be subtle |
| Drone (if used) | 0.04 | Deep bass, felt more than heard |
| Melody notes | 0.025 | Brief, transient |
| Event sounds | 0.015 | Accents, not foreground |
| Sparkle/accent | 0.008 | Barely there, magical |
| Animal calls | 0.012 | Recognizable but not startling |

### 7.2 The Golden Rule

If any sound makes you notice it consciously over the TTS narration, its gain is too high. The music should feel like a warm blanket — enveloping but invisible.

### 7.3 Master Volume Chain

```
Individual gains → _masterGain (user volume, default 0.3) → destination
```

So the actual output level = individual gain × 0.3 = very quiet. Design for full volume (1.0), knowing most users will be at 0.2-0.4.

---

## 8. Stereo Panning Strategy

### 8.1 Panning Rules

| Element | Pan Range | Rationale |
|---------|-----------|-----------|
| Pad chord | Center (0) | Stable, grounding |
| Ambient noise | Center (0) | Enveloping |
| Drone | Center (0) | Foundation |
| Melody notes | ±0.15 to ±0.2 | Slight movement, alternating L/R |
| Animal calls | ±0.4 to ±1.0 | Environmental, placed in space |
| Sparkles | ±0.6 to ±1.8 | Wide, scattered, magical |
| Moving sounds (bee, comet) | Sweep -1 to +1 | Doppler-like motion |

### 8.2 Multi-Source Placement

When a profile has multiple instances of the same sound type (e.g., 3 cricket choruses), place them at distinct stereo positions:

```javascript
for (let c = 0; c < 3; c++) {
  const panPos = -0.8 + c * 0.8;  // -0.8, 0, +0.8
  // ... schedule with fixed pan position
}
```

---

## 9. Diversity Requirements

### 9.1 Diversity Axes

When creating a new profile, it must differ from ALL existing profiles in at least 4 of these 6 axes:

| Axis | Options |
|------|---------|
| **Setting** | Indoor, forest, ocean, space, garden, mountain, desert, arctic, cave, sky |
| **Chord quality** | Major, minor, 7th, sus, diminished |
| **Primary texture** | Wind (pink), rumble (brown), static (white), none |
| **Melody instrument** | Music box, harp, bells, flute, theremin, lullaby, none |
| **Signature sound** | Animal call, water, mechanical, magical, weather |
| **Energy level** | Very calm, calm, gentle, moderate |

### 9.2 Existing Profile Diversity Map

| Profile | Setting | Chord | Texture | Melody | Signature | Energy |
|---------|---------|-------|---------|--------|-----------|--------|
| dreamy-clouds | Sky | Major | Wind | Lullaby | Wind chimes, heartbeat | Very calm |
| forest-night | Forest | Minor | Rumble | Flute | Crickets, frogs, owl | Calm |
| moonlit-meadow | Meadow | Maj7 | Stream | Bells | Fox call, water drops | Very calm |
| cosmic-voyage | Space | Minor | Static | Theremin | Sonar, comet, engine | Gentle |
| enchanted-garden | Garden | Major | Wind | Harp | Birdsong, sparkles, bee | Gentle |
| starlight-lullaby | Sky | Major | Breath | Music box | Shooting stars, twinkles | Very calm |
| autumn-forest | Forest | Major | Rumble | Flute | Owl, squirrel, acorn | Calm |
| ocean-drift | Ocean | Major | Ocean wash | Bells | Waves, whale, boat | Calm |

### 9.3 Suggested Profiles for New Stories

| Theme | Chord | Texture | Melody | Signature Sounds |
|-------|-------|---------|--------|-----------------|
| Snowy night | B minor | Light white noise | Music box | Soft footsteps in snow, distant wind howl, icicle chimes |
| Rainy cozy | G minor | Heavy pink noise (rain) | Lullaby | Rain on window, distant thunder, fireplace crackle |
| Underwater | C minor | Brown noise (deep) | Bells (sonar-like) | Bubbles, dolphin clicks, current whoosh, fish scatter |
| Mountain dawn | Bb major | Light breeze | Harp | Eagle cry, rock echo, distant waterfall, sunrise shimmer |
| Crystal cave | F# minor | Quiet reverb | Music box (echo) | Crystal chimes, water drip echo, gem sparkle, bat flutter |
| Desert oasis | E major | Warm wind | Flute (Arabic feel) | Sand whisper, palm rustle, distant camel, star tones |
| Northern lights | A minor | Cold static | Theremin | Aurora shimmer, ice crack, wolf howl, snow crunch |
| Treehouse | G major | Light breeze | Harp | Rope creak, leaf rustle, lantern flicker, night bird |

---

## 10. Adding a New Profile — Step by Step

### Step 1: Choose a unique identity
Check the diversity map (Section 9.2). Your new profile must differ in 4+ of 6 axes.

### Step 2: Pick a chord
Choose from Section 3.2 (unused chords) or pick a unique voicing of an existing chord quality. Define 4 notes spanning 1-2 octaves.

### Step 3: Create the builder method

```javascript
// In AmbientMusicEngine class:
_buildNewProfileName() {
  // Layer 1: Harmonic foundation
  this._createPad([note1, note2, note3, note4], {
    type: 'sine', gain: 0.04, detune: 4,
    filterFreq: 800, lfoRate: 0.06, lfoDepth: 40,
  });

  // Layer 2: Ambient texture
  this._createAmbientNoise({ type: 'pink', gain: 0.01, filterFreq: 500 });

  // Layer 3: Environment events (minimum 3 different event types)
  this._scheduleRepeating(() => { /* event 1 */ }, 8000, 0.4, 5000);
  this._scheduleRepeating(() => { /* event 2 */ }, 12000, 0.5, 7000);
  this._scheduleRepeating(() => { /* event 3 */ }, 20000, 0.4, 10000);

  // Layer 4: Melodic element
  const melNotes = [/* notes from the chord's scale */];
  let mi = 0;
  this._scheduleRepeating(() => {
    this._playTone(melNotes[mi % melNotes.length], { /* melody params */ });
    mi++;
  }, 3000, 0.15, 4000);

  // Layer 5: Sparkle/accent (optional but recommended)
  this._scheduleRepeating(() => { /* rare magical sound */ }, 15000, 0.4, 8000);
}
```

### Step 4: Register in the play() method

```javascript
// In the play() method's builders object:
const builders = {
  // ... existing profiles
  'new-profile-name': () => this._buildNewProfileName(),
};
```

### Step 5: Add to seedData.js

```javascript
// In the story object:
{
  id: "seed-story-id",
  // ... other fields
  musicProfile: "new-profile-name",
}
```

Remember: add `musicProfile` to BOTH the English and Hindi versions of the story.

### Step 6: Validate
- Listen to the full profile for at least 60 seconds
- Verify no sound is jarring or startling
- Verify events don't cluster (jitter should spread them out)
- Verify stereo panning creates a spatial feel
- Verify it sounds distinct from all other profiles
- Play alongside TTS narration — music should be a subtle background

---

## 11. Technical Reference

### 11.1 Helper Methods

| Method | Purpose | Key Parameters |
|--------|---------|----------------|
| `_createPad(notes, opts)` | Sustained chord with LFO filter | notes: Hz[], type, gain, detune, filterFreq, lfoRate, lfoDepth |
| `_createAmbientNoise(opts)` | Continuous looping noise | type (pink/brown/white), gain, filterFreq |
| `_createDrone(freq, opts)` | Deep bass tone with modulation | freq, type, gain, lfoRate, lfoDepth, filterFreq |
| `_playTone(freq, opts)` | Single note with envelope | freq, type, gain, attack, decay, filterFreq, pan |
| `_playNoiseBurst(opts)` | Shaped noise event | noiseType, duration, gain, filterFreq, pan |
| `_scheduleRepeating(fn, interval, jitter, delay)` | Recurring random-timed event | fn, baseInterval (ms), jitterFactor (0-0.6), initialDelay (ms) |

### 11.2 Cleanup Rules

Every sound created inside `_scheduleRepeating` callbacks must be cleaned up:

```javascript
// For oscillators/sources created in callbacks:
osc.start(now);
osc.stop(now + duration);

const t = setTimeout(() => {
  try { osc.disconnect(); gain.disconnect(); filter.disconnect(); } catch(e) {}
}, (duration + 0.5) * 1000);
this._timeouts.push(t);  // REQUIRED — ensures cleanup on stop()
```

Persistent nodes (pad oscillators, noise sources) should be added to `this._nodes`:

```javascript
this._nodes.push(osc, gain, filter);  // Cleaned up by _cleanup()
```

### 11.3 Browser Compatibility Notes

- `AudioContext` may be `webkitAudioContext` on older Safari
- `createStereoPanner()` may not exist on all browsers — always check:
  ```javascript
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pan) { /* use panner */ } else { /* skip panning */ }
  ```
- AudioContext must be created/resumed on user gesture (handled by play button)

---

## 12. Quality Checklist

Before merging a new music profile, verify:

- [ ] Unique `kebab-case` profile name
- [ ] Chord differs from all existing profiles in 3+ axes (Section 3.4)
- [ ] Profile differs from all existing in 4+ diversity axes (Section 9.1)
- [ ] Has pad layer (harmonic foundation)
- [ ] Has ambient noise layer (texture)
- [ ] Has 4+ scheduled event types
- [ ] Has melodic element with notes from the correct scale
- [ ] Has 3+ stereo-panned elements
- [ ] All gains within documented limits (Section 7.1)
- [ ] No sound is jarring, sudden, or startling
- [ ] Jitter prevents exact repetition patterns
- [ ] All callback-created nodes have cleanup timeouts
- [ ] All persistent nodes added to `this._nodes`
- [ ] Builder method registered in `play()` builders object
- [ ] `musicProfile` added to BOTH English and Hindi story objects
- [ ] Sounds distinct from all other profiles when compared
- [ ] Background-appropriate when played alongside TTS narration
- [ ] Tested for 60+ seconds without audio glitches

---

## 13. Existing Profile Reference

| # | Profile Key | Story (EN) | Story (HI) | Layers | Events | Energy |
|---|------------|-----------|-----------|--------|--------|--------|
| 1 | dreamy-clouds | The Sleepy Cloud | Neendwala Badal | 5 | Wind chimes, heartbeat, lullaby, sparkles | Very calm |
| 2 | forest-night | The Brave Little Firefly | Bahadur Chhota Jugnu | 7 | 3× crickets, frogs, owl, fireflies, wind gusts | Calm |
| 3 | moonlit-meadow | The Moon's Lullaby | Chaand ki Lori | 6 | Stream drops, bell chimes, fox call, fireflies, night bird | Very calm |
| 4 | cosmic-voyage | Captain Stardust | Captain Sitaara | 7 | Engine, radio, sonar+echo, comet, stars, theremin | Gentle |
| 5 | enchanted-garden | The Whispering Garden | Gungunata Baag | 7 | Birdsong, butterfly, sparkles, harp, flower, bee | Gentle |
| 6 | starlight-lullaby | Twinkle Dream | Chamakta Sapna | 5 | Music box, shooting star, twinkles, shimmer | Very calm |
| 7 | autumn-forest | The Owl's Goodnight | Ullu ki Shubh Raatri | 8 | Owl+vibrato, wind, acorn, squirrel, leaves, breath, melody | Calm |
| 8 | ocean-drift | Sailing to Dreamland | Sapnon ki Naav | 7 | Waves, whale, seagull, boat creak, bubbles, ship bell | Calm |

---

*This guide is maintained alongside the codebase. Update it when adding new profiles or changing the sound design system.*
