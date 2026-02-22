/**
 * AmbientMusicEngine v4 — Immersive 3-layer audio for bedtime stories.
 *
 * ARCHITECTURE (v4):
 *   Layer 1 (bottom):  Ambient soundscape loops — real recorded audio (rain, ocean, wind, etc.)
 *   Layer 2 (middle):  Music loops — real recorded lullabies/melodies OR enhanced synthesis
 *   Layer 3 (top):     Synthesis accents — sparkles, chimes, crickets (procedural)
 *
 *   All layers feed through:
 *     [synthGain]       ─┐
 *     [musicLoopGain]   ─┼─► [masterGain] ─► destination
 *     [soundscapeGain]  ─┘
 *
 *   Synth layer also routes through a convolver reverb for warmth.
 *
 * PRESERVED from v3:
 *   - All synthesis techniques (FM, Chorus, Resonant Noise, Plucked, Simple)
 *   - All environment event sounds (crickets, frogs, owls, sparkles, waves, etc.)
 *   - musicParams / musicProfile backward compatibility
 *   - Singleton export pattern, public API
 */

import { SOUNDSCAPES, MUSIC_LOOPS, getSoundscapeUrls, getMusicLoopUrl } from './soundscapeConfig';

// ── Noise Buffer Generators ──────────────────────────────────────────────────

function createNoiseBuffer(ctx, type = 'white', duration = 4) {
  const sr = ctx.sampleRate;
  const len = sr * duration;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179;
      b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520;
      b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522;
      b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02*w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  return buf;
}

// Create a shaped noise burst (used for wind gusts, wave crashes, etc.)
function createShapedNoise(ctx, type, duration) {
  const sr = ctx.sampleRate;
  const len = sr * duration;
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const base = createNoiseBuffer(ctx, type, duration).getChannelData(0);

  // Apply amplitude envelope: fade in 20%, sustain 50%, fade out 30%
  for (let i = 0; i < len; i++) {
    const pos = i / len;
    let env;
    if (pos < 0.2) env = pos / 0.2;
    else if (pos < 0.7) env = 1;
    else env = (1 - pos) / 0.3;
    d[i] = base[i] * env;
  }
  return buf;
}


// ── AmbientMusicEngine Class ─────────────────────────────────────────────────

export class AmbientMusicEngine {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._synthGain = null;         // submix for procedural synthesis (v4)
    this._soundscapeGain = null;    // submix for soundscape audio loops (v4)
    this._musicLoopGain = null;     // submix for music audio loops (v4)
    this._reverbNode = null;        // convolver reverb for synth warmth (v4)
    this._reverbGain = null;        // reverb wet level (v4)
    this._nodes = [];
    this._intervals = [];
    this._timeouts = [];
    this._soundscapeSources = [];   // active soundscape BufferSourceNodes (v4)
    this._musicLoopSource = null;   // active music loop BufferSourceNode (v4)
    this._audioBufferCache = {};    // cached decoded AudioBuffers (v4)
    this._playing = false;
    this._currentProfile = null;
    this._volume = 0.3;
    this._fadeTime = 3;
    this._playGeneration = 0; // increments on each play() call to cancel stale async plays
    this._fadeCleanupTimer = null; // pending fade-out cleanup timeout from stop(true)
  }

  _ensureContext() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 0;
      this._masterGain.connect(this._ctx.destination);
      // Expose context globally so Android WebView can resume it on user gesture
      window.__ambientCtx = this._ctx;
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume().catch(() => {});
    }
    return this._ctx;
  }

  /** Returns the gain node that synth methods should connect to.
   *  Uses _synthGain when submixes are active, otherwise _masterGain. */
  get _synthOut() {
    return this._synthGain || this._masterGain;
  }

  /** Wait for AudioContext to be in 'running' state. Resolves immediately if already running. */
  async _waitForContext() {
    this._ensureContext();
    if (this._ctx.state === 'running') return this._ctx;

    // Wait for state change (up to 3 seconds)
    return new Promise((resolve) => {
      const onStateChange = () => {
        if (this._ctx.state === 'running') {
          this._ctx.removeEventListener('statechange', onStateChange);
          clearTimeout(timeout);
          resolve(this._ctx);
        }
      };
      this._ctx.addEventListener('statechange', onStateChange);
      // Also try resume again
      this._ctx.resume().catch(() => {});
      // Timeout fallback — resolve even if suspended (caller can check)
      const timeout = setTimeout(() => {
        this._ctx.removeEventListener('statechange', onStateChange);
        resolve(this._ctx);
      }, 3000);
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // v4 — SUBMIX ROUTING, REVERB, AUDIO LOADING, SOUNDSCAPE & MUSIC LOOPS
  // ════════════════════════════════════════════════════════════════════════════

  /** Create the 3-layer submix routing graph + convolver reverb. */
  _setupSubmixes() {
    const ctx = this._ctx;

    // Synth submix — all procedural synthesis routes here
    this._synthGain = ctx.createGain();
    this._synthGain.gain.value = 1.0;

    // Soundscape submix — ambient audio loops route here
    this._soundscapeGain = ctx.createGain();
    this._soundscapeGain.gain.value = 1.0;

    // Music loop submix — melodic audio loops route here
    this._musicLoopGain = ctx.createGain();
    this._musicLoopGain.gain.value = 1.0;

    // Create convolver reverb for synth warmth
    this._setupReverb();

    // Route all submixes to master
    this._synthGain.connect(this._masterGain);
    this._soundscapeGain.connect(this._masterGain);
    this._musicLoopGain.connect(this._masterGain);

    // Send synth through reverb too (wet signal)
    if (this._reverbNode) {
      const reverbSend = ctx.createGain();
      reverbSend.gain.value = 0.3; // reverb send level
      this._synthGain.connect(reverbSend);
      reverbSend.connect(this._reverbNode);
      this._nodes.push(reverbSend);
    }
  }

  /** Create a synthetic impulse response for convolver reverb. */
  _setupReverb() {
    const ctx = this._ctx;
    try {
      const duration = 2.5;
      const decay = 2.0;
      const len = ctx.sampleRate * duration;
      const irBuffer = ctx.createBuffer(2, len, ctx.sampleRate);

      for (let ch = 0; ch < 2; ch++) {
        const d = irBuffer.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          // Exponential decay noise with stereo variation
          d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay / 3));
        }
      }

      this._reverbNode = ctx.createConvolver();
      this._reverbNode.buffer = irBuffer;

      this._reverbGain = ctx.createGain();
      this._reverbGain.gain.value = 0.15; // subtle wet level

      this._reverbNode.connect(this._reverbGain);
      this._reverbGain.connect(this._masterGain);

      this._nodes.push(this._reverbNode, this._reverbGain);
    } catch (e) {
      console.warn('AmbientMusic: reverb setup failed, continuing without', e);
      this._reverbNode = null;
      this._reverbGain = null;
    }
  }

  /** Fetch and decode an audio file, caching the result. */
  async _loadAudio(url) {
    if (this._audioBufferCache[url]) return this._audioBufferCache[url];
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this._ctx.decodeAudioData(arrayBuf);
      this._audioBufferCache[url] = audioBuf;
      return audioBuf;
    } catch (e) {
      console.warn(`AmbientMusic: failed to load audio ${url}`, e);
      return null;
    }
  }

  /** Start ambient soundscape loop(s) from a preset name. */
  async _startSoundscape(presetName) {
    const resolved = getSoundscapeUrls(presetName);
    if (!resolved) {
      console.warn(`AmbientMusic: unknown soundscape "${presetName}"`);
      return;
    }

    // Pick one file at random from the preset's files
    const url = resolved.urls[Math.floor(Math.random() * resolved.urls.length)];
    const buffer = await this._loadAudio(url);
    if (!buffer || !this._playing) return;

    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const g = ctx.createGain();
    g.gain.value = resolved.gain;

    src.connect(g);
    g.connect(this._soundscapeGain);
    src.start(ctx.currentTime);

    this._soundscapeSources.push(src);
    this._nodes.push(src, g);
  }

  /** Start a music loop from a preset name. */
  async _startMusicLoop(presetName) {
    const resolved = getMusicLoopUrl(presetName);
    if (!resolved) {
      console.warn(`AmbientMusic: unknown music loop "${presetName}"`);
      return;
    }

    const buffer = await this._loadAudio(resolved.url);
    if (!buffer || !this._playing) return;

    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const g = ctx.createGain();
    g.gain.value = resolved.gain;

    src.connect(g);
    g.connect(this._musicLoopGain);
    src.start(ctx.currentTime);

    this._musicLoopSource = src;
    this._nodes.push(src, g);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // END v4 additions
  // ════════════════════════════════════════════════════════════════════════════

  // ── Helper: schedule a repeating event with jitter ──
  _scheduleRepeating(fn, baseInterval, jitterFactor = 0.3, initialDelay = null) {
    const doNext = () => {
      if (!this._playing) return;
      const jitter = baseInterval * (1 - jitterFactor + Math.random() * jitterFactor * 2);
      const t = setTimeout(() => {
        fn();
        doNext();
      }, jitter);
      this._timeouts.push(t);
    };
    const startT = setTimeout(() => {
      fn();
      doNext();
    }, initialDelay !== null ? initialDelay : baseInterval * Math.random());
    this._timeouts.push(startT);
  }

  // ── Helper: play a single tone with envelope ──
  _playTone(freq, { type = 'sine', gain = 0.02, attack = 0.01, decay = 2.0, filterFreq = 3000, filterQ = 0.5, detune = 0, pan = 0 } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    f.Q.value = filterQ;

    osc.connect(g);

    if (pan !== 0 && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      g.connect(panner);
      panner.connect(f);
    } else {
      g.connect(f);
    }
    f.connect(this._synthOut);

    osc.start(now);
    osc.stop(now + attack + decay + 0.1);

    const cleanup = setTimeout(() => {
      try { osc.disconnect(); } catch(e) {}
      try { g.disconnect(); } catch(e) {}
      try { f.disconnect(); } catch(e) {}
    }, (attack + decay + 0.5) * 1000);
    this._timeouts.push(cleanup);
  }

  // ── Helper: play a noise burst ──
  _playNoiseBurst({ noiseType = 'white', duration = 1, gain = 0.01, filterFreq = 1000, filterQ = 0.5, pan = 0 } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const buf = createShapedNoise(ctx, noiseType, duration);
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const g = ctx.createGain();
    g.gain.value = gain;

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    f.Q.value = filterQ;

    src.connect(g);
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(f);
    } else {
      g.connect(f);
    }
    f.connect(this._synthOut);

    src.start(now);

    const cleanup = setTimeout(() => {
      try { src.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {}
    }, (duration + 0.5) * 1000);
    this._timeouts.push(cleanup);
  }

  // ── Base layer: sustained pad with filter modulation ──
  _createPad(notes, { type = 'sine', gain = 0.05, detune = 4, filterFreq = 800, filterQ = 0.5, lfoRate = 0.08, lfoDepth = 50 } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = filterFreq;
    padFilter.Q.value = filterQ;
    padFilter.connect(this._synthOut);

    // LFO on filter for movement
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoRate;
    const lfoG = ctx.createGain();
    lfoG.gain.value = lfoDepth;
    lfo.connect(lfoG);
    lfoG.connect(padFilter.frequency);
    lfo.start(now);
    this._nodes.push(lfo, lfoG);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = (i % 2 === 0 ? 1 : -1) * detune;

      const g = ctx.createGain();
      g.gain.value = gain;

      osc.connect(g);
      g.connect(padFilter);
      osc.start(now);
      this._nodes.push(osc, g);
    });

    this._nodes.push(padFilter);
  }

  // ── Continuous noise texture ──
  _createAmbientNoise({ type = 'pink', gain = 0.008, filterFreq = 600, filterQ = 0.5 } = {}) {
    const ctx = this._ctx;
    const buf = createNoiseBuffer(ctx, type, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const g = ctx.createGain();
    g.gain.value = gain;

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    f.Q.value = filterQ;

    src.connect(g);
    g.connect(f);
    f.connect(this._synthOut);
    src.start(ctx.currentTime);
    this._nodes.push(src, g, f);
  }

  // ── Drone: deep bass tone with slow modulation ──
  _createDrone(freq, { type = 'sine', gain = 0.04, lfoRate = 0.02, lfoDepth = 2, filterFreq = 200 } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.value = gain;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoRate;
    const lfoG = ctx.createGain();
    lfoG.gain.value = lfoDepth;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    f.Q.value = 1;

    osc.connect(g);
    g.connect(f);
    f.connect(this._synthOut);
    osc.start(now);
    lfo.start(now);
    this._nodes.push(osc, g, lfo, lfoG, f);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NEW SYNTHESIS HELPERS — FM, Chorus, Resonant Noise, Plucked
  // ════════════════════════════════════════════════════════════════════════════

  // ── FM Pad: Frequency-modulated synthesis for rich evolving harmonics ──
  // Creates complex timbres by using one oscillator to modulate another's frequency
  _createFMPad(carrier, modulator, modDepth, {
    carrierType = 'sine',
    modulatorType = 'sine',
    gain = 0.04,
    filterFreq = 800,
    filterQ = 0.5,
    lfoRate = 0.08,
    lfoDepth = 50
  } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Carrier oscillator
    const carrierOsc = ctx.createOscillator();
    carrierOsc.type = carrierType;
    carrierOsc.frequency.value = carrier;

    // Modulator oscillator (modulates carrier frequency)
    const modOsc = ctx.createOscillator();
    modOsc.type = modulatorType;
    modOsc.frequency.value = modulator;

    // Mod depth control
    const modG = ctx.createGain();
    modG.gain.value = modDepth;
    modOsc.connect(modG);
    modG.connect(carrierOsc.frequency);

    // Main gain
    const g = ctx.createGain();
    g.gain.value = gain;

    // Filter with LFO movement
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = filterQ;

    // LFO on filter
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoRate;
    const lfoG = ctx.createGain();
    lfoG.gain.value = lfoDepth;
    lfo.connect(lfoG);
    lfoG.connect(filt.frequency);

    carrierOsc.connect(g);
    g.connect(filt);
    filt.connect(this._synthOut);

    carrierOsc.start(now);
    modOsc.start(now);
    lfo.start(now);

    this._nodes.push(carrierOsc, modOsc, modG, g, filt, lfo, lfoG);
  }

  // ── Chorus Pad: Multiple slightly-detuned voices for lush, thick sound ──
  // Creates a string ensemble or choir effect by layering detuned copies
  _createChorusPad(notes, numVoices = 4, spreadCents = 12, {
    type = 'sine',
    gain = 0.04,
    filterFreq = 800,
    filterQ = 0.5,
    lfoRate = 0.08,
    lfoDepth = 50
  } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = filterFreq;
    padFilter.Q.value = filterQ;
    padFilter.connect(this._synthOut);

    // LFO on filter
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoRate;
    const lfoG = ctx.createGain();
    lfoG.gain.value = lfoDepth;
    lfo.connect(lfoG);
    lfoG.connect(padFilter.frequency);
    lfo.start(now);

    // For each note, create multiple detuned voices
    notes.forEach((freq, noteIdx) => {
      for (let i = 0; i < numVoices; i++) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;

        // Spread the voices ±spreadCents around the base note
        const detuneAmount = (i - numVoices/2 + 0.5) * (spreadCents / numVoices);
        osc.detune.value = detuneAmount;

        const g = ctx.createGain();
        g.gain.value = gain / numVoices;

        osc.connect(g);
        g.connect(padFilter);
        osc.start(now);

        this._nodes.push(osc, g);
      }
    });

    this._nodes.push(padFilter, lfo, lfoG);
  }

  // ── Resonant Noise Pad: Noise filtered through multiple bandpass filters ──
  // Creates organic, breathy, choir-like or wind sounds using filtered noise
  _createResonantNoisePad(frequencies, {
    noiseType = 'pink',
    gain = 0.015,
    Q = 10,
    lfoRate = 0.03,
    lfoDepth = 0.05
  } = {}) {
    const ctx = this._ctx;
    const now = ctx.currentTime;

    // Create noise source
    const buf = createNoiseBuffer(ctx, noiseType, 4);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = gain;

    noiseSrc.connect(noiseGain);

    // Create bandpass filters at each frequency
    let prev = noiseGain;
    frequencies.forEach((freq, i) => {
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = freq;
      filt.Q.value = Q;

      // Optional LFO on filter frequency
      if (lfoDepth > 0) {
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = lfoRate + i * 0.015; // stagger LFO rates
        const lfoG = ctx.createGain();
        lfoG.gain.value = lfoDepth * freq;
        lfo.connect(lfoG);
        lfoG.connect(filt.frequency);
        lfo.start(now);
        this._nodes.push(lfo, lfoG);
      }

      prev.connect(filt);
      prev = filt;

      this._nodes.push(filt);
    });

    prev.connect(this._synthOut);
    noiseSrc.start(now);

    this._nodes.push(noiseSrc, noiseGain);
  }

  // ── Plucked/Kalimba Pad: Noise burst → bandpass filter → feedback delay ──
  // Creates magical plucked string or kalimba sounds that sustain and resonate
  _createPluckedPad(notes, intervalMs = 2000, {
    gain = 0.02,
    Q = 20,
    filterFreq = null // defaults to note frequency if not specified
  } = {}) {
    // Schedule plucked notes at regular intervals
    let noteIdx = 0;
    const doPluck = () => {
      if (!this._playing) return;

      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      const ctx = this._ctx;
      const now = ctx.currentTime;

      // Create a short noise burst
      const noiseDur = 0.05;
      const buf = createShapedNoise(ctx, 'white', noiseDur);
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = buf;

      // Bandpass filter tuned to the note frequency
      const filt = ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = filterFreq || freq;
      filt.Q.value = Q;

      // Gain with envelope
      const g = ctx.createGain();
      g.gain.value = gain;

      noiseSrc.connect(g);
      g.connect(filt);
      filt.connect(this._synthOut);

      noiseSrc.start(now);

      // Cleanup
      const t = setTimeout(() => {
        try { noiseSrc.disconnect(); g.disconnect(); filt.disconnect(); } catch(e) {}
      }, (noiseDur + 0.5) * 1000);
      this._timeouts.push(t);

      // Schedule next pluck
      const nextT = setTimeout(doPluck, intervalMs + (Math.random() - 0.5) * intervalMs * 0.4);
      this._timeouts.push(nextT);
    };

    doPluck();
  }


  // ════════════════════════════════════════════════════════════════════════════
  // PROFILE BUILDERS — each one now uses distinct synthesis + layered melodies
  // ════════════════════════════════════════════════════════════════════════════


  // ════════════════════════════════════════════════════════════════════════════
  // PROFILE BUILDERS — each one creates a completely unique soundscape
  // ════════════════════════════════════════════════════════════════════════════

  // ── 1. DREAMY CLOUDS: FM synthesis base + 3-layer melody ──
  // Base: FM pad with warm, evolving bells
  // Melody: Main lullaby (sine) + slow bass walking pattern + descending countermelody thirds
  _buildDreamyClouds() {
    // FM SYNTHESIS: Carrier C3 (130.81 Hz), modulated by 2:1 ratio
    // Creates warm, organic bell-like tones
    this._createFMPad(
      130.81,    // carrier frequency (C3)
      261.63,    // modulator frequency (2:1 ratio, C4)
      25,        // mod depth — creates rich harmonics
      {
        carrierType: 'sine',
        modulatorType: 'sine',
        gain: 0.05,
        filterFreq: 900,
        filterQ: 0.5,
        lfoRate: 0.06,
        lfoDepth: 50,
      }
    );

    // Gentle wind texture
    this._createAmbientNoise({ type: 'pink', gain: 0.012, filterFreq: 500 });

    // Wind chimes — random high bell tones (unchanged)
    const chimeNotes = [1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00];
    this._scheduleRepeating(() => {
      const numChimes = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numChimes; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          const note = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
          this._playTone(note, {
            type: 'sine', gain: 0.015 + Math.random() * 0.01,
            attack: 0.005, decay: 3.0,
            filterFreq: 4000, detune: (Math.random() - 0.5) * 15,
            pan: (Math.random() - 0.5) * 1.4,
          });
        }, i * (200 + Math.random() * 400));
      }
    }, 5000, 0.4, 3000);

    // MELODIC LAYER A: Primary lullaby melody (Twinkle Twinkle feel)
    const melANotes = [523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
                       698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.02, attack: 0.1, decay: 2.5,
        filterFreq: 1500, detune: (Math.random() - 0.5) * 6,
      });
    }, 3000, 0.15, 5000);

    // MELODIC LAYER B: Slow bass walking pattern (C→G→Am→F progression at half speed)
    // Frequencies: C2(65.41), G2(98), A2(110), F2(87.31)
    const melBNotes = [65.41, 98, 110, 87.31];
    let melBIdx = 0;
    this._scheduleRepeating(() => {
      const note = melBNotes[melBIdx % melBNotes.length];
      melBIdx++;
      this._playTone(note, {
        type: 'triangle', gain: 0.018, attack: 0.2, decay: 5.5,
        filterFreq: 250, // heavy bass filter
        pan: -0.1,
      });
    }, 6000, 0.2, 7000);

    // MELODIC LAYER C: High countermelody doing descending thirds
    // Starting from E4, creating harmonic interest
    const melCNotes = [329.63, 293.66, 261.63, 246.94, 220.00, 196.00];
    let melCIdx = 0;
    this._scheduleRepeating(() => {
      const note = melCNotes[melCIdx % melCNotes.length];
      melCIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.012, // 60% of melody A's gain
        attack: 0.15, decay: 3.2,
        filterFreq: 1200,
        pan: 0.15,
      });
    }, 4500, 0.2, 6500);

    // Soft heartbeat pulse (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(55, { type: 'sine', gain: 0.018, attack: 0.02, decay: 0.4, filterFreq: 150 });
      setTimeout(() => {
        if (!this._playing) return;
        this._playTone(50, { type: 'sine', gain: 0.012, attack: 0.02, decay: 0.3, filterFreq: 120 });
      }, 250);
    }, 4000, 0.1, 2000);

    // Occasional soft sparkle cascade (unchanged)
    this._scheduleRepeating(() => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(2000 + i * 300 + Math.random() * 200, {
            type: 'sine', gain: 0.006, attack: 0.005, decay: 0.8,
            filterFreq: 5000, pan: (Math.random() - 0.5) * 1.6,
          });
        }, i * 150);
      }
    }, 15000, 0.3, 8000);
  }

  // ── 2. FOREST NIGHT: Resonant noise pad + 3-layer melody ──
  // Base: Brown noise through E minor bandpass filters (sounds like wind through hollow trees)
  // Melody: Triangle flute in E minor pentatonic + low drone root shift + rhythmic noise hits
  _buildForestNight() {
    // RESONANT NOISE: Brown noise through E minor chord frequencies
    // Creates organic, wind-like, hollow sound
    this._createResonantNoisePad(
      [82.41, 123.47, 164.81, 196.00],  // E minor chord: E2, B2, E3, G3
      {
        noiseType: 'brown',
        gain: 0.018,
        Q: 10,  // high Q for strong resonance
        lfoRate: 0.04,
        lfoDepth: 0.03,
      }
    );

    // Cricket chorus — multiple crickets at different positions (unchanged)
    for (let c = 0; c < 3; c++) {
      const baseFreq = 3800 + c * 600;
      const panPos = -0.8 + c * 0.8;
      this._scheduleRepeating(() => {
        const numChirps = 4 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numChirps; i++) {
          setTimeout(() => {
            if (!this._playing) return;
            this._playTone(baseFreq + (Math.random() - 0.5) * 300, {
              type: 'sine', gain: 0.005 + Math.random() * 0.003,
              attack: 0.003, decay: 0.06,
              filterFreq: 6000, pan: panPos + (Math.random() - 0.5) * 0.3,
            });
          }, i * (100 + Math.random() * 60));
        }
      }, 2500 + c * 800, 0.4, 2000 + c * 1500);
    }

    // Frog croaks (unchanged)
    this._scheduleRepeating(() => {
      const frogFreq = 180 + Math.random() * 60;
      const pan = (Math.random() - 0.5) * 1.4;
      this._playTone(frogFreq, {
        type: 'square', gain: 0.008, attack: 0.01, decay: 0.15,
        filterFreq: 500, filterQ: 3, pan,
      });
      setTimeout(() => {
        if (!this._playing) return;
        this._playTone(frogFreq * 1.3, {
          type: 'square', gain: 0.006, attack: 0.01, decay: 0.12,
          filterFreq: 600, filterQ: 3, pan,
        });
      }, 200);
    }, 7000, 0.5, 5000);

    // Distant owl (unchanged)
    this._scheduleRepeating(() => {
      const pan = (Math.random() - 0.5) * 1.0;
      this._playTone(340, {
        type: 'sine', gain: 0.008, attack: 0.05, decay: 0.5,
        filterFreq: 500, filterQ: 2, pan,
      });
      setTimeout(() => {
        if (!this._playing) return;
        this._playTone(390, {
          type: 'sine', gain: 0.012, attack: 0.05, decay: 0.7,
          filterFreq: 600, filterQ: 2, pan,
        });
      }, 600);
    }, 18000, 0.4, 10000);

    // Firefly twinkle (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(3000 + Math.random() * 2000, {
        type: 'sine', gain: 0.004, attack: 0.01, decay: 1.5,
        filterFreq: 6000, pan: (Math.random() - 0.5) * 1.8,
      });
    }, 3000, 0.5, 4000);

    // Gentle wind gusts (unchanged)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'pink', duration: 3 + Math.random() * 2,
        gain: 0.008, filterFreq: 300 + Math.random() * 200,
        pan: (Math.random() - 0.5) * 1.0,
      });
    }, 10000, 0.4, 6000);

    // MELODIC LAYER A: Breathy triangle flute melody in E minor pentatonic
    // E3, G3, A3, B3, D4, E4
    const melANotes = [329.63, 392.00, 440.00, 493.88, 587.33, 659.25];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'triangle', gain: 0.015, attack: 0.25, decay: 3.2,
        filterFreq: 900,
        pan: (Math.random() - 0.5) * 0.3,
      });
    }, 6500, 0.2, 8000);

    // MELODIC LAYER B: Low drone shifts between E2 and B2 every 8 bars (~32 seconds)
    let dronePitch = 82.41;
    this._scheduleRepeating(() => {
      dronePitch = dronePitch === 82.41 ? 123.47 : 82.41;
      this._playTone(dronePitch, {
        type: 'triangle', gain: 0.02, attack: 0.3, decay: 7.5,
        filterFreq: 200,
        pan: -0.15,
      });
    }, 8000, 0.1, 10000);

    // MELODIC LAYER C: Soft rhythmic pulse from filtered noise (like distant hand drum)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'pink', duration: 0.15,
        gain: 0.008, filterFreq: 350,
        pan: 0.1,
      });
    }, 3500, 0.3, 2000);
  }

  // ── 3. MOONLIT MEADOW: Chorus pad + 3-layer melody ──
  // Base: Fmaj7 chord with 4 detuned voices per note (warm string section sound)
  // Melody: Bell chime melody + gentle cello-like bass + call-and-response echo
  _buildMoonlitMeadow() {
    // CHORUS PAD: Fmaj7 (F, A, C, E) with 4 detuned voices each (±12 cents spread)
    // Creates a warm, lush string section effect
    this._createChorusPad(
      [87.31, 110.00, 130.81, 164.81],  // Fmaj7: F2, A2, C3, E3
      4,                                   // 4 voices per note
      12,                                  // ±12 cent spread = lush chorus
      {
        type: 'sine',
        gain: 0.05,
        filterFreq: 950,
        filterQ: 0.5,
        lfoRate: 0.08,
        lfoDepth: 50,
      }
    );

    // Babbling stream (unchanged)
    this._createAmbientNoise({ type: 'pink', gain: 0.01, filterFreq: 2000, filterQ: 0.3 });

    // Water trickle (unchanged)
    this._scheduleRepeating(() => {
      const numDrops = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numDrops; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(1800 + Math.random() * 1500, {
            type: 'sine', gain: 0.004 + Math.random() * 0.003,
            attack: 0.002, decay: 0.3 + Math.random() * 0.3,
            filterFreq: 4000, pan: (Math.random() - 0.5) * 1.0,
          });
        }, i * (80 + Math.random() * 120));
      }
    }, 4000, 0.5, 2000);

    // Distant fox call (unchanged)
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.006, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 800;
      f.Q.value = 1;

      osc.connect(g); g.connect(f); f.connect(this._synthOut);
      osc.start(now); osc.stop(now + 0.6);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 1200);
      this._timeouts.push(t);
    }, 25000, 0.4, 15000);

    // Firefly glow pulses (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(1200 + Math.random() * 800, {
        type: 'sine', gain: 0.003, attack: 0.5, decay: 2.0,
        filterFreq: 3000, pan: (Math.random() - 0.5) * 1.6,
      });
    }, 4000, 0.5, 3000);

    // Night bird (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(2200 + Math.random() * 400, {
        type: 'sine', gain: 0.005, attack: 0.01, decay: 0.2,
        filterFreq: 4000, pan: (Math.random() - 0.5) * 1.2,
      });
    }, 12000, 0.5, 9000);

    // MELODIC LAYER A: Bell chime melody — Fmaj7 arpeggio
    const melANotes = [349.23, 440.00, 523.25, 659.25, 523.25, 440.00];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.023, attack: 0.005, decay: 3.0,
        filterFreq: 2500, detune: (Math.random() - 0.5) * 8,
        pan: (Math.random() - 0.5) * 0.6,
      });
    }, 3200, 0.15, 4000);

    // MELODIC LAYER B: Gentle cello-like bass (low triangle, slow attack)
    // Moves between F2 and C2
    let bassFreqIdx = 0;
    const melBFreqs = [87.31, 65.41];
    this._scheduleRepeating(() => {
      const freq = melBFreqs[bassFreqIdx % 2];
      bassFreqIdx++;
      this._playTone(freq, {
        type: 'triangle', gain: 0.02, attack: 0.4, decay: 6.0,
        filterFreq: 220,
        pan: -0.1,
      });
    }, 6400, 0.2, 7000);

    // MELODIC LAYER C: Call-and-response voice — echoes melody at lower octave, 2 beats delayed
    const melCBaseNotes = melANotes.map(f => f / 2);
    let melCIdx = 0;
    this._scheduleRepeating(() => {
      setTimeout(() => {
        if (!this._playing) return;
        const note = melCBaseNotes[melCIdx % melCBaseNotes.length];
        melCIdx++;
        this._playTone(note, {
          type: 'sine', gain: 0.013, // 60% of melody A
          attack: 0.01, decay: 2.5,
          filterFreq: 1800,
          pan: 0.15,
        });
      }, 2000); // 2 beat delay
    }, 3200, 0.15, 6000);
  }

  // ── 4. COSMIC VOYAGE: FM synthesis + 3-layer melody ──
  // Base: FM pad (D minor, carrier:modulator 1:1.5 ratio, mod depth slowly evolves)
  // Melody: Theremin lead (slow portamento) + deep sub-bass pulse + high crystalline arpeggios
  _buildCosmicVoyage() {
    // FM SYNTHESIS: D minor with 1:1.5 ratio for metallic, alien timbre
    // Modulation depth slowly evolves to create pulsating alien quality
    this._createFMPad(
      146.83,    // carrier D3
      220.00,    // modulator A3 (1.5:1 ratio for metallic sheen)
      20,        // initial mod depth
      {
        carrierType: 'sine',
        modulatorType: 'sine',
        gain: 0.048,
        filterFreq: 550,
        filterQ: 0.5,
        lfoRate: 0.04,
        lfoDepth: 40,
      }
    );

    // Deep space drone (unchanged)
    this._createDrone(36.71, { type: 'sine', gain: 0.035, lfoRate: 0.015, lfoDepth: 1.5, filterFreq: 150 });

    // Ship engine hum (unchanged)
    this._createDrone(55, { type: 'sawtooth', gain: 0.008, lfoRate: 0.04, lfoDepth: 3, filterFreq: 100 });

    // White noise "space static" (unchanged)
    this._createAmbientNoise({ type: 'white', gain: 0.004, filterFreq: 250 });

    // Radio crackle (unchanged)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'white', duration: 0.1 + Math.random() * 0.2,
        gain: 0.008, filterFreq: 3000 + Math.random() * 2000,
        filterQ: 3, pan: (Math.random() - 0.5) * 1.0,
      });
    }, 8000, 0.6, 5000);

    // Sonar / radar pings (unchanged)
    this._scheduleRepeating(() => {
      const freq = 800 + Math.random() * 400;
      this._playTone(freq, {
        type: 'sine', gain: 0.015, attack: 0.005, decay: 1.8,
        filterFreq: 2000, pan: (Math.random() - 0.5) * 1.4,
      });
      setTimeout(() => {
        if (!this._playing) return;
        this._playTone(freq, {
          type: 'sine', gain: 0.006, attack: 0.005, decay: 1.2,
          filterFreq: 1500, pan: (Math.random() - 0.5) * 1.4,
        });
      }, 400);
    }, 10000, 0.4, 7000);

    // Comet whoosh (unchanged)
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const dur = 2 + Math.random();

      const buf = createShapedNoise(ctx, 'pink', dur);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const g = ctx.createGain();
      g.gain.value = 0.01;

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(3000, now);
      f.frequency.exponentialRampToValueAtTime(200, now + dur);
      f.Q.value = 2;

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.setValueAtTime(-0.8, now);
        pan.pan.linearRampToValueAtTime(0.8, now + dur);
      }

      src.connect(g);
      if (pan) { g.connect(pan); pan.connect(f); } else { g.connect(f); }
      f.connect(this._synthOut);
      src.start(now);

      const t = setTimeout(() => {
        try { src.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {}
      }, (dur + 1) * 1000);
      this._timeouts.push(t);
    }, 20000, 0.4, 12000);

    // Twinkling stars (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(2500 + Math.random() * 3000, {
        type: 'sine', gain: 0.004, attack: 0.005, decay: 0.6,
        filterFreq: 8000, pan: (Math.random() - 0.5) * 1.8,
      });
    }, 2500, 0.5, 3000);

    // MELODIC LAYER A: Theremin-like lead with slow portamento (pitch glides)
    const melANotes = [587.33, 523.25, 466.16, 440.00, 466.16, 523.25];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const freq = melANotes[melAIdx % melANotes.length];
      const prevFreq = melANotes[(melAIdx - 1 + melANotes.length) % melANotes.length];
      melAIdx++;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(prevFreq, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.6); // portamento

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.012, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1200;
      f.Q.value = 1;

      osc.connect(g); g.connect(f); f.connect(this._synthOut);
      osc.start(now); osc.stop(now + 4.5);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 5000);
      this._timeouts.push(t);
    }, 7000, 0.2, 6000);

    // MELODIC LAYER B: Deep sub-bass pulse on D1 (like ship's heartbeat)
    this._scheduleRepeating(() => {
      this._playTone(36.71, {
        type: 'sine', gain: 0.025, attack: 0.1, decay: 3.8,
        filterFreq: 150,
        pan: 0,
      });
    }, 5000, 0.15, 5000);

    // MELODIC LAYER C: High crystalline arpeggiated D minor triads (very softly)
    // D3, F3, A3 → repeating
    const melCNotes = [146.83, 174.61, 220.00];
    let melCIdx = 0;
    this._scheduleRepeating(() => {
      // Play chord as quick arpeggio (3 notes in ~150ms)
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          const note = melCNotes[(melCIdx + i) % melCNotes.length];
          this._playTone(note + 1200, { // octave higher
            type: 'sine', gain: 0.006, attack: 0.01, decay: 1.2,
            filterFreq: 2000, detune: (Math.random() - 0.5) * 4,
          });
        }, i * 50);
      }
      melCIdx += 3;
    }, 8000, 0.2, 7000);
  }

  // ── 5. ENCHANTED GARDEN: Plucked/kalimba pad + 3-layer melody ──
  // Base: G major notes plucked every 2-4s in random order (magical harp/kalimba bed)
  // Melody: Harp arpeggio + walking bass G→D→Em→C + high flutey countermelody with trills
  _buildEnchantedGarden() {
    // PLUCKED/KALIMBA PAD: G major notes (G2, B2, D3, G3) plucked in random order
    // Creates continuous bed of magical resonating strings
    const pluckedNotes = [98.00, 123.47, 146.83, 196.00];
    this._createPluckedPad(pluckedNotes, 3000, {
      gain: 0.022,
      Q: 22,
      filterFreq: null,
    });

    // Light breeze (unchanged)
    this._createAmbientNoise({ type: 'pink', gain: 0.007, filterFreq: 700 });

    // Birdsong (unchanged)
    const birdPhrases = [
      [2200, 2600, 2400, 2800, 2600],
      [1800, 2100, 1800],
      [2500, 3000, 2800, 3200, 3000, 2500],
      [1600, 2000, 2400],
    ];
    this._scheduleRepeating(() => {
      const phrase = birdPhrases[Math.floor(Math.random() * birdPhrases.length)];
      const pan = (Math.random() - 0.5) * 1.4;
      phrase.forEach((freq, i) => {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(freq + (Math.random() - 0.5) * 100, {
            type: 'sine', gain: 0.006, attack: 0.008, decay: 0.15 + Math.random() * 0.1,
            filterFreq: 5000, pan,
          });
        }, i * (80 + Math.random() * 60));
      });
    }, 8000, 0.5, 4000);

    // Butterfly flutter (unchanged)
    this._scheduleRepeating(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playNoiseBurst({
            noiseType: 'white', duration: 0.05,
            gain: 0.003, filterFreq: 6000 + Math.random() * 2000,
            pan: (Math.random() - 0.5) * 1.4,
          });
        }, i * 80);
      }
    }, 12000, 0.5, 7000);

    // Magical sparkle cascades (unchanged)
    this._scheduleRepeating(() => {
      const baseNote = 1500 + Math.random() * 500;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(baseNote + (5 - i) * 200, {
            type: 'sine', gain: 0.008 - i * 0.001,
            attack: 0.005, decay: 1.5 + i * 0.2,
            filterFreq: 5000, pan: -0.6 + i * 0.24,
          });
        }, i * 200);
      }
    }, 10000, 0.4, 5000);

    // Flower opening (unchanged)
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 2);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.006, now + 1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      osc.connect(g); g.connect(this._synthOut);
      osc.start(now); osc.stop(now + 3);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); } catch(e) {} }, 4000);
      this._timeouts.push(t);
    }, 20000, 0.4, 12000);

    // Bee buzzing by (unchanged)
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const dur = 1.5 + Math.random();

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 140 + Math.random() * 40;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.003, now + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.003, now + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 300;
      f.Q.value = 2;

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.setValueAtTime(-1, now);
        pan.pan.linearRampToValueAtTime(1, now + dur);
      }

      osc.connect(g); g.connect(f);
      if (pan) { f.connect(pan); pan.connect(this._synthOut); } else { f.connect(this._synthOut); }
      osc.start(now); osc.stop(now + dur + 0.1);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, (dur + 1) * 1000);
      this._timeouts.push(t);
    }, 30000, 0.5, 20000);

    // MELODIC LAYER A: Enhanced harp arpeggio (G major, longer phrases)
    const melANotes = [392.00, 493.88, 587.33, 783.99, 587.33, 493.88, 392.00, 329.63];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.022, attack: 0.005, decay: 2.5,
        filterFreq: 2500, detune: (Math.random() - 0.5) * 6,
        pan: (melAIdx % 2 === 0 ? -0.2 : 0.2),
      });
    }, 2800, 0.1, 3000);

    // MELODIC LAYER B: Walking bass G→D→Em→C on warm triangle
    // G2(98), D2(73.42), E2(82.41), C2(65.41)
    const melBNotes = [98.00, 73.42, 82.41, 65.41];
    let melBIdx = 0;
    this._scheduleRepeating(() => {
      const note = melBNotes[melBIdx % melBNotes.length];
      melBIdx++;
      this._playTone(note, {
        type: 'triangle', gain: 0.02, attack: 0.25, decay: 5.5,
        filterFreq: 240,
        pan: -0.15,
      });
    }, 5600, 0.15, 6000);

    // MELODIC LAYER C: High flutey countermelody with trills
    // Uses a note and its neighbor for rapid alternation
    let trillIdx = 0;
    this._scheduleRepeating(() => {
      const mainNote = [587.33, 659.25, 783.99, 880.00][trillIdx % 4];
      const trillNote = mainNote * 1.06; // slight interval for trill effect

      // Rapid trill: alternate between main and trill note 3 times
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          const note = i % 2 === 0 ? mainNote : trillNote;
          this._playTone(note, {
            type: 'sine', gain: 0.013, // 60% of melody A
            attack: 0.02, decay: 0.3,
            filterFreq: 1500,
            pan: 0.2,
          });
        }, i * 60);
      }
      trillIdx++;
    }, 5600, 0.2, 5500);
  }

  // ── 6. STARLIGHT LULLABY: Detuned chorus pad + 3-layer melody ──
  // Base: Ab major in tight unison (±5 cents) — like music box mechanism with slight imperfection
  // Melody: Music box melody (longer phrases) + soft bass root-fifth + celeste-like arpeggios
  _buildStarlightLullaby() {
    // CHORUS PAD (tight detuning): Ab major (Ab2, C3, Eb3, Ab3)
    // Very tight ±5 cent spread for music-box-like mechanical imperfection
    this._createChorusPad(
      [103.83, 130.81, 155.56, 207.65],  // Ab major: Ab2, C3, Eb3, Ab3
      6,                                    // 6 voices per note for lush but tight effect
      5,                                    // only ±5 cent spread = subtle chorus
      {
        type: 'sine',
        gain: 0.038,
        filterFreq: 1050,
        filterQ: 0.5,
        lfoRate: 0.06,
        lfoDepth: 20,
      }
    );

    // Very soft breath-like noise (unchanged)
    this._createAmbientNoise({ type: 'pink', gain: 0.004, filterFreq: 350 });

    // Shooting star whoosh (unchanged)
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const dur = 1.5;

      const buf = createShapedNoise(ctx, 'white', dur);
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.008, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(1000, now);
      f.frequency.exponentialRampToValueAtTime(6000, now + 0.5);
      f.frequency.exponentialRampToValueAtTime(2000, now + dur);
      f.Q.value = 1;

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        const startPan = -0.5 + Math.random();
        pan.pan.setValueAtTime(startPan, now);
        pan.pan.linearRampToValueAtTime(startPan + 0.6, now + dur);
      }

      src.connect(g);
      if (pan) { g.connect(pan); pan.connect(f); } else { g.connect(f); }
      f.connect(this._synthOut);
      src.start(now);

      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(3000 + Math.random() * 2000, {
            type: 'sine', gain: 0.004, attack: 0.005, decay: 0.5,
            filterFreq: 6000, pan: (Math.random() - 0.5) * 1.0,
          });
        }, 300 + i * 200);
      }

      const t = setTimeout(() => { try { src.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, (dur + 1) * 1000);
      this._timeouts.push(t);
    }, 16000, 0.4, 8000);

    // Twinkling stars (unchanged)
    this._scheduleRepeating(() => {
      const numStars = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numStars; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(2000 + Math.random() * 2500, {
            type: 'sine', gain: 0.005, attack: 0.01, decay: 1.2,
            filterFreq: 5000, pan: (Math.random() - 0.5) * 1.8,
          });
        }, i * (300 + Math.random() * 400));
      }
    }, 5000, 0.4, 3000);

    // MELODIC LAYER A: Music box melody (extended with longer phrases)
    const melANotes = [830.61, 622.25, 523.25, 415.30, 523.25, 622.25, 830.61, 1046.50,
                       830.61, 622.25, 415.30, 311.13, 415.30, 523.25, 622.25, 830.61];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.027, attack: 0.003, decay: 2.0,
        filterFreq: 3500, detune: (Math.random() - 0.5) * 4,
        pan: (melAIdx % 2 === 0 ? -0.15 : 0.15),
      });
    }, 2200, 0.08, 2000);

    // MELODIC LAYER B: Soft bass root-fifth pattern (Ab2 → Eb2, repeating)
    // Ab2(103.83), Eb2(77.78)
    let bassPitchIdx = 0;
    const melBFreqs = [103.83, 77.78];
    this._scheduleRepeating(() => {
      const freq = melBFreqs[bassPitchIdx % 2];
      bassPitchIdx++;
      this._playTone(freq, {
        type: 'sine', gain: 0.022, attack: 0.2, decay: 5.0,
        filterFreq: 200,
        pan: -0.1,
      });
    }, 4400, 0.15, 5000);

    // MELODIC LAYER C: Celeste-like arpeggiated chords (3 notes in quick succession every 4 beats)
    // Using Ab major arpeggio: Ab3, C4, Eb4
    const melCNotes = [207.65, 261.63, 311.13];
    let melCChordIdx = 0;
    this._scheduleRepeating(() => {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          const note = melCNotes[i];
          this._playTone(note, {
            type: 'sine', gain: 0.015, // 60% of melody A
            attack: 0.008, decay: 1.8,
            filterFreq: 1800,
            pan: 0.1,
          });
        }, i * 100);
      }
      melCChordIdx++;
    }, 4400, 0.2, 6000);

    // Gentle shimmer wave — slow evolving high pad (unchanged)
    const shimmerNotes = [1046.50, 1318.51];
    shimmerNotes.forEach((freq, i) => {
      const ctx = this._ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = (i % 2 === 0 ? 3 : -3);

      const g = ctx.createGain();
      g.gain.value = 0.004;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.15 + i * 0.08;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.003;
      lfo.connect(lfoG);
      lfoG.connect(g.gain);

      osc.connect(g); g.connect(this._synthOut);
      osc.start(ctx.currentTime);
      lfo.start(ctx.currentTime);
      this._nodes.push(osc, g, lfo, lfoG);
    });
  }

  // ── 7. AUTUMN FOREST: Resonant noise pad + 3-layer melody ──
  // Base: Pink noise through D major bandpass filters (warmer, woodier than forest-night)
  // Plus gentle filtered sawtooth drone underneath
  // Melody: Warm woody melody on filtered sawtooth + bass drone pattern + rhythmic wood-block-like clicks
  _buildAutumnForest() {
    // RESONANT NOISE: Pink noise through D major frequencies
    // Lower Q (5-8) than forest-night for warmer, woodier tone
    this._createResonantNoisePad(
      [73.42, 110.00, 146.83, 220.00],  // D major: D2, A2, D3, A3
      {
        noiseType: 'pink',
        gain: 0.02,
        Q: 6.5,  // lower Q = warmer tone
        lfoRate: 0.035,
        lfoDepth: 0.02,
      }
    );

    // Additional warm filtered sawtooth drone underneath
    this._createDrone(73.42, {
      type: 'sawtooth',
      gain: 0.012,
      lfoRate: 0.035,
      lfoDepth: 2,
      filterFreq: 380,
    });

    // Wind gusts (unchanged)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'pink', duration: 3 + Math.random() * 3,
        gain: 0.012, filterFreq: 250 + Math.random() * 150,
        pan: (Math.random() - 0.5) * 1.2,
      });
    }, 8000, 0.4, 4000);

    // Owl hoots (unchanged)
    this._scheduleRepeating(() => {
      const baseFreq = 350 + Math.random() * 40;
      const pan = (Math.random() - 0.5) * 0.8;

      this._playTone(baseFreq, {
        type: 'sine', gain: 0.012, attack: 0.05, decay: 0.4,
        filterFreq: 500, filterQ: 2, pan,
      });
      setTimeout(() => {
        if (!this._playing) return;
        const ctx = this._ctx;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 1.18, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.8);

        const vib = ctx.createOscillator();
        vib.type = 'sine';
        vib.frequency.value = 5;
        const vibG = ctx.createGain();
        vibG.gain.value = 8;
        vib.connect(vibG);
        vibG.connect(osc.frequency);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.015, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 600;
        f.Q.value = 2;

        osc.connect(g); g.connect(f); f.connect(this._synthOut);
        osc.start(now); osc.stop(now + 1.2);
        vib.start(now); vib.stop(now + 1.2);

        const t = setTimeout(() => {
          try { osc.disconnect(); g.disconnect(); f.disconnect(); vib.disconnect(); vibG.disconnect(); } catch(e) {}
        }, 2000);
        this._timeouts.push(t);
      }, 500);
    }, 12000, 0.4, 6000);

    // Acorn dropping (unchanged)
    this._scheduleRepeating(() => {
      this._playTone(100 + Math.random() * 30, {
        type: 'sine', gain: 0.008, attack: 0.003, decay: 0.1,
        filterFreq: 300, pan: (Math.random() - 0.5) * 1.2,
      });
      setTimeout(() => {
        if (!this._playing) return;
        this._playTone(150 + Math.random() * 50, {
          type: 'sine', gain: 0.004, attack: 0.002, decay: 0.06,
          filterFreq: 400, pan: (Math.random() - 0.5) * 1.2,
        });
      }, 200 + Math.random() * 100);
    }, 15000, 0.6, 8000);

    // Squirrel chitter (unchanged)
    this._scheduleRepeating(() => {
      const pan = (Math.random() - 0.5) * 1.0;
      const numClicks = 5 + Math.floor(Math.random() * 6);
      for (let i = 0; i < numClicks; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playTone(3500 + Math.random() * 1000, {
            type: 'square', gain: 0.003, attack: 0.002, decay: 0.03,
            filterFreq: 4000, pan,
          });
        }, i * (30 + Math.random() * 20));
      }
    }, 22000, 0.5, 14000);

    // Dry leaves skittering (unchanged)
    this._scheduleRepeating(() => {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          this._playNoiseBurst({
            noiseType: 'white', duration: 0.05 + Math.random() * 0.05,
            gain: 0.004, filterFreq: 3000 + Math.random() * 2000,
            pan: (Math.random() - 0.5) * 1.4,
          });
        }, i * (60 + Math.random() * 80));
      }
    }, 10000, 0.5, 6000);

    // Sleeping animal breathing (unchanged)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'pink', duration: 1.5,
        gain: 0.005, filterFreq: 200,
        pan: 0.3 + Math.random() * 0.3,
      });
      setTimeout(() => {
        if (!this._playing) return;
        this._playNoiseBurst({
          noiseType: 'pink', duration: 2.0,
          gain: 0.003, filterFreq: 180,
          pan: 0.3 + Math.random() * 0.3,
        });
      }, 2000);
    }, 8000, 0.15, 4000);

    // MELODIC LAYER A: Warm woody melody on filtered sawtooth (not triangle)
    // D minor pentatonic: D3, F3, A3, B3, D4
    const melANotes = [146.83, 174.61, 220.00, 246.94, 293.66];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sawtooth', gain: 0.014, attack: 0.2, decay: 3.5,
        filterFreq: 750, // warm, woody filter
        pan: (Math.random() - 0.5) * 0.2,
      });
    }, 6500, 0.15, 5500);

    // MELODIC LAYER B: Bass drone shifts D→A→G pattern
    // D2(73.42), A2(110), G2(98)
    let bassDroneIdx = 0;
    const melBFreqs = [73.42, 110, 98];
    this._scheduleRepeating(() => {
      const freq = melBFreqs[bassDroneIdx % 3];
      bassDroneIdx++;
      this._playTone(freq, {
        type: 'triangle', gain: 0.022, attack: 0.25, decay: 6.5,
        filterFreq: 220,
        pan: -0.12,
      });
    }, 6500, 0.15, 6500);

    // MELODIC LAYER C: Soft wood-block-like rhythmic clicks from filtered noise
    // (like distant woodpecker)
    this._scheduleRepeating(() => {
      this._playNoiseBurst({
        noiseType: 'brown', duration: 0.08,
        gain: 0.009, filterFreq: 800,
        pan: 0.15,
      });
    }, 3000, 0.35, 2500);
  }

  // ── 8. OCEAN DRIFT: Chorus pad + 3-layer melody ──
  // Base: Eb major with 4 detuned voices per note (±15 cent spread = vast, choir-like)
  // Plus deep ocean drone
  // Melody: Ship bell melody + whale-song-like bass with pitch glides + high harmony at third
  _buildOceanDrift() {
    // CHORUS PAD (wide detuning): Eb major (Eb2, G2, Bb2, Eb3)
    // Wide ±15 cent spread = vast, choir-like effect
    this._createChorusPad(
      [77.78, 98.00, 116.54, 155.56],  // Eb major: Eb2, G2, Bb2, Eb3
      4,                                  // 4 voices per note
      15,                                 // ±15 cent spread = lush, vast choir
      {
        type: 'sine',
        gain: 0.048,
        filterFreq: 750,
        filterQ: 0.5,
        lfoRate: 0.055,
        lfoDepth: 60,
      }
    );

    // Deep ocean drone
    this._createDrone(38.89, { type: 'sine', gain: 0.03, lfoRate: 0.025, lfoDepth: 2, filterFreq: 150 });

    // Sub-bass drone for extra depth
    this._createDrone(38.89 * 0.5, { type: 'sine', gain: 0.015, lfoRate: 0.02, lfoDepth: 1, filterFreq: 120 });

    // Ocean wash — continuous
    this._createAmbientNoise({ type: 'pink', gain: 0.016, filterFreq: 500 });

    // Wave cycles — rhythmic noise swells with filter sweep
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const dur = 4 + Math.random() * 2;

      const buf = createNoiseBuffer(ctx, 'pink', dur);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = false;

      const g = ctx.createGain();
      // Wave shape: build, crash, recede
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.02, now + dur * 0.4);
      g.gain.linearRampToValueAtTime(0.025, now + dur * 0.5); // crash peak
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(200, now);
      f.frequency.linearRampToValueAtTime(800, now + dur * 0.5);
      f.frequency.linearRampToValueAtTime(300, now + dur);
      f.Q.value = 0.5;

      src.connect(g); g.connect(f); f.connect(this._synthOut);
      src.start(now);

      const t = setTimeout(() => { try { src.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, (dur + 1) * 1000);
      this._timeouts.push(t);
    }, 7000, 0.25, 2000);

    // Whale song — slow, eerie pitch glides
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const baseFreq = 100 + Math.random() * 50;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, now + 1.5);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + 3);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 4.5);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.008, now + 0.5);
      g.gain.linearRampToValueAtTime(0.008, now + 3.5);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 5);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      f.Q.value = 3;

      osc.connect(g); g.connect(f); f.connect(this._synthOut);
      osc.start(now); osc.stop(now + 5.5);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 6500);
      this._timeouts.push(t);
    }, 25000, 0.3, 12000);

    // Seagull cry — distant, sleepy
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const pan = (Math.random() - 0.5) * 1.4;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.6);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.005, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1500;
      f.Q.value = 2;

      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      osc.connect(g); g.connect(f);
      if (p) { p.pan.value = pan; f.connect(p); p.connect(this._synthOut); }
      else { f.connect(this._synthOut); }

      osc.start(now); osc.stop(now + 1);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 2000);
      this._timeouts.push(t);
    }, 20000, 0.5, 10000);

    // Creaking boat wood
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.3);
      osc.frequency.linearRampToValueAtTime(55, now + 0.8);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.005, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 200;
      f.Q.value = 5;

      osc.connect(g); g.connect(f); f.connect(this._synthOut);
      osc.start(now); osc.stop(now + 1.2);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 2000);
      this._timeouts.push(t);
    }, 9000, 0.3, 5000);

    // Underwater bubbles — small rising tones
    this._scheduleRepeating(() => {
      const numBubbles = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numBubbles; i++) {
        setTimeout(() => {
          if (!this._playing) return;
          const ctx = this._ctx;
          const now = ctx.currentTime;
          const startFreq = 300 + Math.random() * 200;

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(startFreq, now);
          osc.frequency.exponentialRampToValueAtTime(startFreq * 2, now + 0.15);

          const g = ctx.createGain();
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.004, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

          osc.connect(g); g.connect(this._synthOut);
          osc.start(now); osc.stop(now + 0.3);

          const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); } catch(e) {} }, 800);
          this._timeouts.push(t);
        }, i * (100 + Math.random() * 200));
      }
    }, 12000, 0.5, 7000);

    // MELODIC LAYER A: Ship bell melody
    const melANotes = [622.25, 587.33, 466.16, 311.13, 466.16, 587.33];
    let melAIdx = 0;
    this._scheduleRepeating(() => {
      const note = melANotes[melAIdx % melANotes.length];
      melAIdx++;
      this._playTone(note, {
        type: 'sine', gain: 0.017, attack: 0.005, decay: 3.5,
        filterFreq: 2000, detune: (Math.random() - 0.5) * 6,
      });
    }, 5500, 0.15, 4000);

    // MELODIC LAYER B: Whale-song-like bass with pitch glides
    // Moving between Eb2, Bb1, Ab1 with smooth glides
    const melBBaseFreqs = [77.78, 58.27, 51.96]; // Eb2, Bb1, Ab1
    let melBIdx = 0;
    this._scheduleRepeating(() => {
      const ctx = this._ctx;
      const now = ctx.currentTime;
      const freq = melBBaseFreqs[melBIdx % melBBaseFreqs.length];
      const prevFreq = melBBaseFreqs[(melBIdx - 1 + melBBaseFreqs.length) % melBBaseFreqs.length];
      melBIdx++;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(prevFreq, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.8); // glide

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.024, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 6.8);

      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 250;
      f.Q.value = 2;

      osc.connect(g); g.connect(f); f.connect(this._synthOut);
      osc.start(now); osc.stop(now + 7.2);

      const t = setTimeout(() => { try { osc.disconnect(); g.disconnect(); f.disconnect(); } catch(e) {} }, 8000);
      this._timeouts.push(t);
    }, 7000, 0.2, 5500);

    // MELODIC LAYER C: High "singing" harmony following melody at a third above
    // Harmony voice (60% gain, one major third up from main melody)
    let melCIdx = 0;
    this._scheduleRepeating(() => {
      const mainNote = melANotes[melCIdx % melANotes.length];
      // Major third up = 1.25 ratio
      const harmonyNote = mainNote * 1.25;
      melCIdx++;
      this._playTone(harmonyNote, {
        type: 'sine', gain: 0.01, // 60% of melody A
        attack: 0.01, decay: 3.0,
        filterFreq: 1800,
        pan: -0.15,
      });
    }, 5500, 0.15, 4500);
  }


  // ════════════════════════════════════════════════════════════════════════════
  // PARAMETERIZED BUILDER — generates unique soundscapes from a params object
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Build a unique soundscape from a musicParams object.
   * This allows each story to have its own distinct ambient music.
   *
   * @param {Object} params - Music parameters:
   *   - padType: 'fm' | 'chorus' | 'resonant' | 'plucked' | 'simple' (default: 'chorus')
   *   - chordNotes: number[] — base frequencies for the pad (e.g. [130.81, 164.81, 196.00])
   *   - padGain: number (default: 0.045)
   *   - padFilter: number — lowpass frequency (default: 800)
   *   - padLfo: number — LFO rate (default: 0.06)
   *   - noiseType: 'pink' | 'brown' | 'white' (default: 'pink')
   *   - noiseGain: number (default: 0.01)
   *   - droneFreq: number — drone bass frequency (default: first of chordNotes or 65.41)
   *   - droneGain: number (default: 0.035)
   *   - melodyNotes: number[] — main melody (default: chordNotes shifted up an octave)
   *   - melodyInterval: number — ms between melody notes (default: 3500)
   *   - melodyGain: number (default: 0.018)
   *   - bassNotes: number[] — bass line (default: derived from chordNotes)
   *   - bassInterval: number — ms between bass notes (default: 6000)
   *   - counterNotes: number[] — counter melody notes
   *   - counterInterval: number — ms between counter notes (default: 4500)
   *   - events: Array<{type, interval, ...}> — scheduled ambient events
   */
  _buildFromParams(params = {}) {
    const p = params;

    // 1. PAD — the sustained harmonic base
    const chordNotes = p.chordNotes || [130.81, 164.81, 196.00, 261.63];
    const padGain = p.padGain ?? 0.045;
    const padFilter = p.padFilter ?? 800;
    const padLfo = p.padLfo ?? 0.06;
    const padType = p.padType || 'chorus';

    if (padType === 'fm') {
      this._createFMPad(
        chordNotes[0],
        chordNotes[0] * 2,
        25,
        { carrierType: 'sine', modulatorType: 'sine', gain: padGain, filterFreq: padFilter, lfoRate: padLfo, lfoDepth: 50 }
      );
    } else if (padType === 'resonant') {
      this._createResonantNoisePad(
        chordNotes,
        { noiseType: p.noiseType || 'brown', gain: padGain, Q: 10, lfoRate: padLfo, lfoDepth: 0.03 }
      );
    } else if (padType === 'plucked') {
      this._createPluckedPad(
        chordNotes.map(f => f * 2), // shift up an octave
        2000,
        { gain: padGain, Q: 20 }
      );
    } else if (padType === 'simple') {
      this._createPad(
        chordNotes,
        { type: 'sine', gain: padGain, filterFreq: padFilter, lfoRate: padLfo, lfoDepth: 50 }
      );
    } else {
      // default: chorus
      this._createChorusPad(
        chordNotes, 4, 12,
        { type: 'sine', gain: padGain, filterFreq: padFilter, lfoRate: padLfo, lfoDepth: 50 }
      );
    }

    // 2. AMBIENT NOISE texture
    const noiseType = p.noiseType || 'pink';
    const noiseGain = p.noiseGain ?? 0.01;
    if (noiseGain > 0) {
      this._createAmbientNoise({ type: noiseType, gain: noiseGain, filterFreq: padFilter * 0.6 });
    }

    // 3. DRONE — deep bass
    const droneFreq = p.droneFreq ?? chordNotes[0] / 2;
    const droneGain = p.droneGain ?? 0.035;
    if (droneGain > 0) {
      this._createDrone(droneFreq, { type: 'sine', gain: droneGain, filterFreq: 200 });
    }

    // 4. MELODY LAYER A — primary
    const melodyNotes = p.melodyNotes || chordNotes.map(f => f * 2);
    const melodyInterval = p.melodyInterval ?? 3500;
    const melodyGain = p.melodyGain ?? 0.018;
    let melIdx = 0;
    this._scheduleRepeating(() => {
      const note = melodyNotes[melIdx % melodyNotes.length];
      melIdx++;
      this._playTone(note, {
        type: 'sine', gain: melodyGain, attack: 0.1, decay: 2.5,
        filterFreq: padFilter * 1.5, detune: (Math.random() - 0.5) * 6,
      });
    }, melodyInterval, 0.15, melodyInterval * 1.5);

    // 5. MELODY LAYER B — bass walking
    const bassNotes = p.bassNotes || chordNotes.slice(0, 4).map(f => f / 2);
    const bassInterval = p.bassInterval ?? 6000;
    let bassIdx = 0;
    this._scheduleRepeating(() => {
      const note = bassNotes[bassIdx % bassNotes.length];
      bassIdx++;
      this._playTone(note, {
        type: 'triangle', gain: melodyGain * 0.8, attack: 0.2, decay: 5.5,
        filterFreq: 250, pan: -0.1,
      });
    }, bassInterval, 0.2, bassInterval * 1.2);

    // 6. MELODY LAYER C — counter melody (optional)
    const counterNotes = p.counterNotes || melodyNotes.map(f => f * 1.25); // major third
    const counterInterval = p.counterInterval ?? 4500;
    let cIdx = 0;
    this._scheduleRepeating(() => {
      const note = counterNotes[cIdx % counterNotes.length];
      cIdx++;
      this._playTone(note, {
        type: 'sine', gain: melodyGain * 0.6,
        attack: 0.15, decay: 3.2,
        filterFreq: padFilter * 1.2,
        pan: 0.15,
      });
    }, counterInterval, 0.2, counterInterval * 1.4);

    // 7. EVENTS — scheduled ambient sound effects
    const events = p.events || [];
    for (const evt of events) {
      this._buildEvent(evt);
    }
  }

  /** Build a single ambient event based on type */
  _buildEvent(evt) {
    const interval = evt.interval || 10000;
    const gain = evt.gain ?? 1.0; // gain multiplier

    switch (evt.type) {
      case 'sparkle':
        this._scheduleRepeating(() => {
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              if (!this._playing) return;
              this._playTone(2000 + i * 300 + Math.random() * 200, {
                type: 'sine', gain: 0.006 * gain, attack: 0.005, decay: 0.8,
                filterFreq: 5000, pan: (Math.random() - 0.5) * 1.6,
              });
            }, i * 150);
          }
        }, interval, 0.3, interval * 0.5);
        break;

      case 'windGust':
        this._scheduleRepeating(() => {
          this._playNoiseBurst({
            noiseType: 'pink', duration: 3 + Math.random() * 2,
            gain: 0.008 * gain, filterFreq: 300 + Math.random() * 200,
            pan: (Math.random() - 0.5) * 1.0,
          });
        }, interval, 0.4, interval * 0.6);
        break;

      case 'cricket':
        this._scheduleRepeating(() => {
          const baseFreq = 3800 + Math.random() * 600;
          const numChirps = 4 + Math.floor(Math.random() * 5);
          for (let i = 0; i < numChirps; i++) {
            setTimeout(() => {
              if (!this._playing) return;
              this._playTone(baseFreq + (Math.random() - 0.5) * 300, {
                type: 'sine', gain: 0.005 * gain,
                attack: 0.003, decay: 0.06,
                filterFreq: 6000, pan: (Math.random() - 0.5) * 1.4,
              });
            }, i * (100 + Math.random() * 60));
          }
        }, interval, 0.4, interval * 0.7);
        break;

      case 'frog':
        this._scheduleRepeating(() => {
          const frogFreq = 180 + Math.random() * 60;
          const pan = (Math.random() - 0.5) * 1.4;
          this._playTone(frogFreq, {
            type: 'square', gain: 0.008 * gain, attack: 0.01, decay: 0.15,
            filterFreq: 500, filterQ: 3, pan,
          });
          setTimeout(() => {
            if (!this._playing) return;
            this._playTone(frogFreq * 1.3, {
              type: 'square', gain: 0.006 * gain, attack: 0.01, decay: 0.12,
              filterFreq: 600, filterQ: 3, pan,
            });
          }, 200);
        }, interval, 0.5, interval * 0.7);
        break;

      case 'owl':
        this._scheduleRepeating(() => {
          const pan = (Math.random() - 0.5) * 1.0;
          this._playTone(340, {
            type: 'sine', gain: 0.008 * gain, attack: 0.05, decay: 0.5,
            filterFreq: 500, filterQ: 2, pan,
          });
          setTimeout(() => {
            if (!this._playing) return;
            this._playTone(390, {
              type: 'sine', gain: 0.012 * gain, attack: 0.05, decay: 0.7,
              filterFreq: 600, filterQ: 2, pan,
            });
          }, 600);
        }, interval, 0.4, interval * 0.6);
        break;

      case 'waterDrop':
        this._scheduleRepeating(() => {
          const freq = 1200 + Math.random() * 800;
          this._playTone(freq, {
            type: 'sine', gain: 0.01 * gain, attack: 0.002, decay: 0.3,
            filterFreq: 3000, pan: (Math.random() - 0.5) * 1.5,
          });
        }, interval, 0.5, interval * 0.3);
        break;

      case 'waveCycle':
        this._scheduleRepeating(() => {
          this._playNoiseBurst({
            noiseType: 'brown', duration: 4 + Math.random() * 3,
            gain: 0.012 * gain, filterFreq: 400 + Math.random() * 200,
            pan: (Math.random() - 0.5) * 0.6,
          });
        }, interval, 0.3, interval * 0.5);
        break;

      case 'starTwinkle':
        this._scheduleRepeating(() => {
          this._playTone(3000 + Math.random() * 2000, {
            type: 'sine', gain: 0.004 * gain, attack: 0.01, decay: 1.5,
            filterFreq: 6000, pan: (Math.random() - 0.5) * 1.8,
          });
        }, interval, 0.5, interval * 0.4);
        break;

      case 'birdChirp':
        this._scheduleRepeating(() => {
          const baseNote = 2000 + Math.random() * 1000;
          const pan = (Math.random() - 0.5) * 1.2;
          for (let i = 0; i < 3; i++) {
            setTimeout(() => {
              if (!this._playing) return;
              this._playTone(baseNote + i * 150, {
                type: 'sine', gain: 0.006 * gain, attack: 0.01, decay: 0.15,
                filterFreq: 5000, pan,
              });
            }, i * 120);
          }
        }, interval, 0.4, interval * 0.5);
        break;

      case 'whaleCall':
        this._scheduleRepeating(() => {
          const startFreq = 80 + Math.random() * 40;
          this._playTone(startFreq, {
            type: 'sine', gain: 0.015 * gain, attack: 0.5, decay: 4.0,
            filterFreq: 300, pan: (Math.random() - 0.5) * 0.5,
          });
        }, interval, 0.3, interval * 0.6);
        break;

      case 'heartbeat':
        this._scheduleRepeating(() => {
          this._playTone(55, { type: 'sine', gain: 0.018 * gain, attack: 0.02, decay: 0.4, filterFreq: 150 });
          setTimeout(() => {
            if (!this._playing) return;
            this._playTone(50, { type: 'sine', gain: 0.012 * gain, attack: 0.02, decay: 0.3, filterFreq: 120 });
          }, 250);
        }, interval, 0.1, interval * 0.5);
        break;

      case 'chimes':
        this._scheduleRepeating(() => {
          const chimeNotes = [1046.50, 1174.66, 1318.51, 1396.91, 1567.98, 1760.00];
          const numChimes = 2 + Math.floor(Math.random() * 3);
          for (let i = 0; i < numChimes; i++) {
            setTimeout(() => {
              if (!this._playing) return;
              const note = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
              this._playTone(note, {
                type: 'sine', gain: 0.012 * gain,
                attack: 0.005, decay: 3.0,
                filterFreq: 4000, detune: (Math.random() - 0.5) * 15,
                pan: (Math.random() - 0.5) * 1.4,
              });
            }, i * (200 + Math.random() * 400));
          }
        }, interval, 0.4, interval * 0.4);
        break;

      case 'leaves':
        this._scheduleRepeating(() => {
          this._playNoiseBurst({
            noiseType: 'white', duration: 1 + Math.random(),
            gain: 0.004 * gain, filterFreq: 2000 + Math.random() * 1000,
            pan: (Math.random() - 0.5) * 1.6,
          });
        }, interval, 0.5, interval * 0.4);
        break;

      case 'radarPing':
        this._scheduleRepeating(() => {
          this._playTone(1800 + Math.random() * 400, {
            type: 'sine', gain: 0.006 * gain, attack: 0.005, decay: 1.2,
            filterFreq: 3000, pan: (Math.random() - 0.5) * 0.8,
          });
        }, interval, 0.3, interval * 0.5);
        break;

      default:
        console.warn(`AmbientMusic: unknown event type "${evt.type}"`);
    }
  }


  // ════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Start playing ambient music.
   * @param {string|Object} profileOrParams - Either a profile name string (e.g. 'dreamy-clouds')
   *   or a musicParams object for a custom per-story soundscape.
   */
  async play(profileOrParams) {
    // Cancel any pending fade-out cleanup from a previous stop(true).
    // Without this, the delayed _cleanup() would destroy our new nodes.
    if (this._fadeCleanupTimer) {
      clearTimeout(this._fadeCleanupTimer);
      this._fadeCleanupTimer = null;
      // Run cleanup immediately for the old music before starting new
      this._cleanup();
    }

    if (this._playing) this.stop();

    // Increment generation so any in-flight async play() from a previous call
    // will see its generation is stale and abort after _waitForContext resolves.
    const myGeneration = ++this._playGeneration;

    const builders = {
      'dreamy-clouds':      () => this._buildDreamyClouds(),
      'forest-night':       () => this._buildForestNight(),
      'moonlit-meadow':     () => this._buildMoonlitMeadow(),
      'cosmic-voyage':      () => this._buildCosmicVoyage(),
      'enchanted-garden':   () => this._buildEnchantedGarden(),
      'starlight-lullaby':  () => this._buildStarlightLullaby(),
      'autumn-forest':      () => this._buildAutumnForest(),
      'ocean-drift':        () => this._buildOceanDrift(),
    };

    let builder;
    let profileLabel;

    if (typeof profileOrParams === 'object' && profileOrParams !== null) {
      // Custom musicParams object
      builder = () => this._buildFromParams(profileOrParams);
      profileLabel = 'custom-params';
    } else {
      // Named profile string
      builder = builders[profileOrParams];
      profileLabel = profileOrParams;
      if (!builder) {
        console.warn(`AmbientMusic: unknown profile "${profileOrParams}"`);
        return;
      }
    }

    // Wait for AudioContext to be fully running before creating any nodes.
    // This avoids the race condition where oscillators are created on a
    // suspended context and never produce sound.
    await this._waitForContext();

    // After the async wait, check if a newer play() call has been made.
    // If so, this call is stale — abort to avoid clobbering the new music.
    if (myGeneration !== this._playGeneration) {
      return;
    }

    this._playing = true;
    this._currentProfile = profileLabel;

    // v4: Set up 3-layer submix routing + reverb
    this._setupSubmixes();

    // v4: Start soundscape audio loop if specified
    const soundscapePreset = typeof profileOrParams === 'object' ? profileOrParams?.soundscapePreset : null;
    if (soundscapePreset) {
      // Don't await — let it load in background while synth starts immediately
      this._startSoundscape(soundscapePreset).catch(e =>
        console.warn('AmbientMusic: soundscape load failed', e)
      );
    }

    // v4: Start music loop if specified
    const musicLoop = typeof profileOrParams === 'object' ? profileOrParams?.musicLoop : null;
    if (musicLoop) {
      this._startMusicLoop(musicLoop).catch(e =>
        console.warn('AmbientMusic: music loop load failed', e)
      );
    }

    // Run the synth builder (pads, melody, events — now routed through _synthGain)
    builder();

    // Fade in
    const now = this._ctx.currentTime;
    this._masterGain.gain.cancelScheduledValues(now);
    this._masterGain.gain.setValueAtTime(0, now);
    this._masterGain.gain.linearRampToValueAtTime(this._volume, now + this._fadeTime);
  }

  pause() {
    if (this._ctx && this._playing) this._ctx.suspend();
  }

  resume() {
    if (this._ctx && this._playing) this._ctx.resume();
  }

  stop(fade = true) {
    if (!this._ctx || !this._masterGain) {
      this._playing = false;
      return;
    }

    const now = this._ctx.currentTime;

    if (fade && this._playing) {
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.linearRampToValueAtTime(0, now + this._fadeTime);
      // Save timer ID so play() can cancel it if called before fade completes
      this._fadeCleanupTimer = setTimeout(() => {
        this._fadeCleanupTimer = null;
        this._cleanup();
      }, this._fadeTime * 1000 + 200);
    } else {
      // Cancel any pending fade cleanup from a prior stop(true)
      if (this._fadeCleanupTimer) {
        clearTimeout(this._fadeCleanupTimer);
        this._fadeCleanupTimer = null;
      }
      this._masterGain.gain.setValueAtTime(0, now);
      this._cleanup();
    }

    this._playing = false;
    this._currentProfile = null;
  }

  _cleanup() {
    this._intervals.forEach(id => clearInterval(id));
    this._timeouts.forEach(id => clearTimeout(id));
    this._intervals = [];
    this._timeouts = [];

    this._nodes.forEach(node => {
      try { if (node.stop) node.stop(); } catch(e) {}
      try { node.disconnect(); } catch(e) {}
    });
    this._nodes = [];

    // v4: cleanup soundscape and music loop sources
    this._soundscapeSources.forEach(src => {
      try { src.stop(); } catch(e) {}
      try { src.disconnect(); } catch(e) {}
    });
    this._soundscapeSources = [];

    if (this._musicLoopSource) {
      try { this._musicLoopSource.stop(); } catch(e) {}
      try { this._musicLoopSource.disconnect(); } catch(e) {}
      this._musicLoopSource = null;
    }

    // v4: disconnect submix nodes (but keep _masterGain alive)
    if (this._synthGain) { try { this._synthGain.disconnect(); } catch(e) {} this._synthGain = null; }
    if (this._soundscapeGain) { try { this._soundscapeGain.disconnect(); } catch(e) {} this._soundscapeGain = null; }
    if (this._musicLoopGain) { try { this._musicLoopGain.disconnect(); } catch(e) {} this._musicLoopGain = null; }
    if (this._reverbNode) { try { this._reverbNode.disconnect(); } catch(e) {} this._reverbNode = null; }
    if (this._reverbGain) { try { this._reverbGain.disconnect(); } catch(e) {} this._reverbGain = null; }
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this._masterGain && this._playing) {
      const now = this._ctx.currentTime;
      this._masterGain.gain.cancelScheduledValues(now);
      this._masterGain.gain.setValueAtTime(this._masterGain.gain.value, now);
      this._masterGain.gain.linearRampToValueAtTime(this._volume, now + 0.3);
    }
  }

  getVolume() { return this._volume; }

  get isPlaying() { return this._playing; }

  get currentProfile() { return this._currentProfile; }

  destroy() {
    this.stop(false);
    if (this._ctx) {
      this._ctx.close().catch(() => {});
      this._ctx = null;
      this._masterGain = null;
      this._synthGain = null;
      this._soundscapeGain = null;
      this._musicLoopGain = null;
      this._reverbNode = null;
      this._reverbGain = null;
    }
    // Don't clear audio buffer cache — it persists across play/stop cycles
  }
}

// Singleton
let _instance = null;
export function getAmbientMusic() {
  if (!_instance) _instance = new AmbientMusicEngine();
  return _instance;
}
