'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './BreathingPacer.module.css';

/**
 * BreathingPacer — A voice-synced pulsating orb that expands with narration
 * and contracts during pauses. Three modes of operation:
 *
 * 1. Live AnalyserNode (Chrome/Edge/Firefox) — real-time audio analysis via
 *    captureStream(). Best quality, ~60 FPS response.
 *
 * 2. Pre-computed envelope (Safari/iOS) — amplitude data computed once from
 *    the decoded audio buffer. Looked up via audio.currentTime each frame.
 *    Same visual result without a live AudioContext (preserves background audio).
 *
 * 3. CSS fallback — gentle 6s breathing animation if neither is available.
 *
 * IMPORTANT: The Web Audio graph (source → analyser → destination) is managed
 * by the parent player page, NOT here. This prevents the audio chain from
 * breaking when the pacer mounts/unmounts on pause/resume.
 */
export default function BreathingPacer({ analyserNode, amplitudeEnvelope, audioRef }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const smoothedRef = useRef(0);
  const dataArrayRef = useRef(null);

  const hasAnalyser = !!analyserNode;
  const hasEnvelope = !!amplitudeEnvelope;
  const hasAnySource = hasAnalyser || hasEnvelope;

  const animate = useCallback(() => {
    if (!containerRef.current) return;

    if (analyserNode && dataArrayRef.current) {
      // Mode 1: Live AnalyserNode — real-time waveform analysis
      analyserNode.getByteTimeDomainData(dataArrayRef.current);

      let sumSquares = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const normalized = (dataArrayRef.current[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);

      const prevSmoothed = smoothedRef.current;
      const alpha = rms > prevSmoothed ? 0.2 : 0.08;
      const smoothed = prevSmoothed * (1 - alpha) + rms * alpha;
      smoothedRef.current = smoothed;

      const amplified = Math.min(smoothed * 3, 1);
      const scale = 1.0 + amplified * 0.6;
      containerRef.current.style.setProperty('--pacer-scale', scale.toFixed(3));

    } else if (amplitudeEnvelope && audioRef?.current) {
      // Mode 2: Pre-computed envelope — look up amplitude by currentTime
      const audio = audioRef.current;
      const { data, sampleRate } = amplitudeEnvelope;
      const index = Math.floor(audio.currentTime * sampleRate);
      const rms = index < data.length ? data[index] : 0;

      const prevSmoothed = smoothedRef.current;
      const alpha = rms > prevSmoothed ? 0.2 : 0.08;
      const smoothed = prevSmoothed * (1 - alpha) + rms * alpha;
      smoothedRef.current = smoothed;

      const amplified = Math.min(smoothed * 3, 1);
      const scale = 1.0 + amplified * 0.6;
      containerRef.current.style.setProperty('--pacer-scale', scale.toFixed(3));
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [analyserNode, amplitudeEnvelope, audioRef]);

  useEffect(() => {
    if (analyserNode) {
      dataArrayRef.current = new Uint8Array(analyserNode.fftSize);
    }

    smoothedRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [analyserNode, amplitudeEnvelope, animate]);

  return (
    <div
      className={`${styles.pacerContainer} ${!hasAnySource ? styles.pacerFallback : ''}`}
      ref={containerRef}
    >
      <div className={styles.pacerGlow} />
      <div className={styles.pacerRingOuter} />
      <div className={styles.pacerRingInner} />
      <div className={styles.pacerCore} />
    </div>
  );
}
