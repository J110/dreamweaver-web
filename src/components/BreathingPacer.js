'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './BreathingPacer.module.css';

/**
 * BreathingPacer — A voice-synced pulsating orb that expands with narration
 * and contracts during pauses. Uses Web Audio API AnalyserNode for real-time
 * amplitude detection. Falls back to a gentle CSS breathing animation if
 * Web Audio connection fails (e.g., CORS issues).
 */
export default function BreathingPacer({ audioRef, isPlaying }) {
  const containerRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);
  const smoothedRef = useRef(0);
  const dataArrayRef = useRef(null);
  const fallbackRef = useRef(false);
  // Track which audio element we've connected, so we don't double-connect
  const connectedAudioRef = useRef(null);

  const setupAnalyser = useCallback(() => {
    const audio = audioRef?.current;
    if (!audio) {
      fallbackRef.current = true;
      return;
    }

    // Already connected this exact audio element — reuse
    if (connectedAudioRef.current === audio && analyserRef.current) {
      return;
    }

    try {
      // Create or reuse AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;

      // Resume if suspended (autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // createMediaElementSource can only be called ONCE per audio element
      if (!sourceNodeRef.current || connectedAudioRef.current !== audio) {
        // If we had a previous source, disconnect it
        if (sourceNodeRef.current) {
          try { sourceNodeRef.current.disconnect(); } catch {}
        }
        sourceNodeRef.current = ctx.createMediaElementSource(audio);
        connectedAudioRef.current = audio;
      }

      // Create analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect: source → analyser → destination (speakers)
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current.connect(analyser);
      analyser.connect(ctx.destination);

      // Prepare data buffer
      dataArrayRef.current = new Uint8Array(analyser.fftSize);
      fallbackRef.current = false;
    } catch (err) {
      // CORS or other Web Audio error — use CSS fallback
      console.warn('BreathingPacer: Web Audio failed, using CSS fallback', err.message);
      fallbackRef.current = true;
    }
  }, [audioRef]);

  const animate = useCallback(() => {
    if (!containerRef.current) return;

    if (analyserRef.current && dataArrayRef.current && !fallbackRef.current) {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      // Get time-domain waveform data
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS amplitude (0-1 range)
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128; // -1 to 1
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Exponential smoothing for gentle movement
      const prevSmoothed = smoothedRef.current;
      // Faster attack (voice starts), slower release (voice stops)
      const alpha = rms > prevSmoothed ? 0.2 : 0.08;
      const smoothed = prevSmoothed * (1 - alpha) + rms * alpha;
      smoothedRef.current = smoothed;

      // Map to scale: 1.0 (silent) → 1.6 (loud)
      // Amplify the signal since speech RMS is typically 0.05-0.3
      const amplified = Math.min(smoothed * 3, 1);
      const scale = 1.0 + amplified * 0.6;

      containerRef.current.style.setProperty('--pacer-scale', scale.toFixed(3));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      setupAnalyser();

      // Small delay to ensure audio element is ready
      const timer = setTimeout(() => {
        smoothedRef.current = 0;
        rafRef.current = requestAnimationFrame(animate);
      }, 50);

      return () => {
        clearTimeout(timer);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    } else {
      // Stopped — cancel animation
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      smoothedRef.current = 0;
    }
  }, [isPlaying, setupAnalyser, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      // Don't close AudioContext — the audio element may still be playing
      // Just disconnect analyser if it exists
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
      }
    };
  }, []);

  const isFallback = fallbackRef.current;

  return (
    <div
      className={`${styles.pacerContainer} ${isFallback ? styles.pacerFallback : ''}`}
      ref={containerRef}
    >
      <div className={styles.pacerGlow} />
      <div className={styles.pacerRingOuter} />
      <div className={styles.pacerRingInner} />
      <div className={styles.pacerCore} />
    </div>
  );
}
