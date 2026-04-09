'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { updateMediaSessionMetadata } from '@/utils/mediaSessionManager';

/**
 * Cover Visual System — progressive darkening for sleep content.
 *
 * As the story plays, the cover gets darker, blurrier, and bluer —
 * like a room where someone is slowly dimming the lights.
 * The breathing pulse slows down as the story progresses.
 *
 * Two modes:
 * - Screen on: Smooth CSS crossfade between 4 variants + breathing deceleration
 * - Screen locked: Discrete Media Session artwork updates at phase transitions
 *
 * Only active for sleep content (story, long_story, lullaby).
 * Before Bed content (funny_short, silly_song, poem) stays bright and static.
 */

const SLEEP_CONTENT_TYPES = new Set(['story', 'long_story', 'lullaby']);

// Phase thresholds (% of total duration) — when lock screen artwork updates
const PHASE_THRESHOLDS = [
  { pct: 0,  variant: 0 },
  { pct: 30, variant: 1 },
  { pct: 65, variant: 2 },
  { pct: 85, variant: 3 },
];

// Crossfade windows — each variant fades in over a 10% window
const FADE_WINDOWS = [
  null,       // v1 always visible (base layer)
  [25, 35],   // v2 crossfade window
  [60, 70],   // v3 crossfade window
  [80, 90],   // v4 crossfade window
];

/**
 * @param {React.RefObject<HTMLAudioElement>} audioRef
 * @param {Object} content - Content object with type, title, cover, cover_variants
 * @param {number} progress - Current playback progress (0-100)
 * @param {boolean} isPlaying - Whether audio is currently playing
 * @returns {{ variantOpacities, breatheSpeed, progressAngle, isEnabled }}
 */
export default function useCoverVisualSystem(audioRef, content, progress, isPlaying) {
  const [variantOpacities, setVariantOpacities] = useState([1, 0, 0, 0]);
  const [breatheSpeed, setBreatheSpeed] = useState(4.0);
  const [progressAngle, setProgressAngle] = useState(0);
  const triggeredPhasesRef = useRef(new Set());

  const contentType = content?.type || '';
  const isEnabled = SLEEP_CONTENT_TYPES.has(contentType);
  const variants = content?.cover_variants || [];
  const hasVariants = isEnabled && variants.length === 4;

  // Reset when content changes
  useEffect(() => {
    setVariantOpacities([1, 0, 0, 0]);
    setBreatheSpeed(4.0);
    setProgressAngle(0);
    triggeredPhasesRef.current.clear();
  }, [content?.id]);

  // Update visuals based on progress
  useEffect(() => {
    if (!isEnabled) return;

    const p = Math.max(0, Math.min(100, progress));

    // --- 1. Crossfade variant opacities ---
    if (hasVariants) {
      const newOpacities = [1, 0, 0, 0]; // v1 always visible
      for (let i = 1; i < 4; i++) {
        const [start, end] = FADE_WINDOWS[i];
        if (p < start) {
          newOpacities[i] = 0;
        } else if (p >= end) {
          newOpacities[i] = 1;
        } else {
          newOpacities[i] = (p - start) / (end - start);
        }
      }
      setVariantOpacities(newOpacities);
    }

    // --- 2. Breathing deceleration ---
    // 4s at start → 10s at end (exponential curve, slows more in second half)
    const t = p / 100;
    const speed = 4.0 + (t * t) * 6.0;
    setBreatheSpeed(speed);

    // --- 3. Progress arc ---
    setProgressAngle((p / 100) * 360);

    // --- 4. Lock screen artwork at phase transitions ---
    if (hasVariants && 'mediaSession' in navigator) {
      for (const phase of PHASE_THRESHOLDS) {
        if (
          p >= phase.pct &&
          phase.pct > 0 &&
          !triggeredPhasesRef.current.has(phase.pct)
        ) {
          triggeredPhasesRef.current.add(phase.pct);
          const variantUrl = variants[phase.variant];
          if (variantUrl) {
            updateMediaSessionMetadata({
              title: content.title || 'Dream Valley',
              artist: 'Dream Valley',
              album: contentType === 'lullaby' ? 'Lullaby' : 'Bedtime Story',
              coverUrl: variantUrl,
            });
          }
        }
      }
    }
  }, [progress, isEnabled, hasVariants, variants, content?.title, contentType]);

  // CSS filter fallback for when no variants are available
  // (replicates the old coverDimStyle behavior but only for sleep content)
  const filterFallback = useCallback(() => {
    if (!isEnabled || hasVariants) return {};
    if (!isPlaying && progress === 0) return {};

    const p = Math.max(0, Math.min(100, progress));
    let brightness, saturate, sepia;

    if (p <= 33) {
      brightness = 1.0; saturate = 1.0; sepia = 0.0;
    } else if (p <= 66) {
      const t = (p - 33) / 33;
      brightness = 1.0 - t * 0.15;
      saturate   = 1.0 - t * 0.2;
      sepia      = t * 0.1;
    } else {
      const t = (p - 66) / 34;
      brightness = 0.85 - t * 0.35;
      saturate   = 0.8  - t * 0.3;
      sepia      = 0.1  + t * 0.1;
    }

    return {
      filter: `brightness(${brightness.toFixed(3)}) saturate(${saturate.toFixed(3)}) sepia(${sepia.toFixed(3)})`,
    };
  }, [progress, isPlaying, isEnabled, hasVariants]);

  return {
    variantOpacities,
    breatheSpeed,
    progressAngle,
    isEnabled,
    hasVariants,
    filterFallbackStyle: filterFallback(),
  };
}
