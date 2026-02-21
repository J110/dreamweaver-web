'use client';

import { useEffect, useRef, useCallback } from 'react';
import styles from './BreathingPacer.module.css';

/**
 * BreathingPacer — A voice-synced pulsating orb that expands with narration
 * and contracts during pauses. Reads real-time amplitude from a Web Audio
 * AnalyserNode passed as a prop. Falls back to a gentle CSS breathing
 * animation if no analyser is available.
 *
 * IMPORTANT: The Web Audio graph (source → analyser → destination) is managed
 * by the parent player page, NOT here. This prevents the audio chain from
 * breaking when the pacer mounts/unmounts on pause/resume.
 */
export default function BreathingPacer({ analyserNode }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const smoothedRef = useRef(0);
  const dataArrayRef = useRef(null);

  const hasAnalyser = !!analyserNode;

  const animate = useCallback(() => {
    if (!containerRef.current) return;

    if (analyserNode && dataArrayRef.current) {
      // Get time-domain waveform data
      analyserNode.getByteTimeDomainData(dataArrayRef.current);

      // Compute RMS amplitude (0-1 range)
      let sumSquares = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const normalized = (dataArrayRef.current[i] - 128) / 128; // -1 to 1
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArrayRef.current.length);

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
  }, [analyserNode]);

  useEffect(() => {
    // Prepare data buffer for the analyser
    if (analyserNode) {
      dataArrayRef.current = new Uint8Array(analyserNode.fftSize);
    }

    // Start animation loop
    smoothedRef.current = 0;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [analyserNode, animate]);

  return (
    <div
      className={`${styles.pacerContainer} ${!hasAnalyser ? styles.pacerFallback : ''}`}
      ref={containerRef}
    >
      <div className={styles.pacerGlow} />
      <div className={styles.pacerRingOuter} />
      <div className={styles.pacerRingInner} />
      <div className={styles.pacerCore} />
    </div>
  );
}
