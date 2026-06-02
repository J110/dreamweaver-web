'use client';

// Present/event-pipeline probe for the native WKWebView (compute already ruled
// out — JS/DOM bench was equal to Safari). Tap the bar; on pointerdown it flips
// color and measures pointerdown→painted via double-rAF. This isolates the
// PRESENT path (DOM change → visible pixels through Flutter's compositor).
//   - APP tap→paint >> WEB  → present/compositing latency (pixels OUT is slow).
//   - APP tap→paint ≈ WEB (small) but the flip still feels delayed vs your
//     finger → touch DELIVERY latency (touches IN are delayed before
//     pointerdown even fires — JS can't time that, so judge it by feel).
// dispatch = event.timeStamp→handler (WebKit-internal, should be tiny).
// Shows in the native app (isNativeApp) and via ?jsperf=1 in a browser, so the
// same device can be compared App vs Safari. Temporary diagnostic.
import { useEffect, useRef, useState } from 'react';
import { isNativeApp } from '@/utils/platformDetect';

export default function PerfBench() {
  const [show, setShow] = useState(false);
  const [tap, setTap] = useState(null);
  const [n, setN] = useState(0);
  const onRef = useRef(false);
  const maxRef = useRef(0);

  useEffect(() => {
    try {
      if (isNativeApp() || new URLSearchParams(window.location.search).get('jsperf') === '1') setShow(true);
    } catch { /* ignore */ }
  }, []);

  const onDown = (e) => {
    const evt = e.timeStamp;
    const t0 = performance.now();
    onRef.current = !onRef.current;
    e.currentTarget.style.background = onRef.current ? 'rgba(190,0,0,0.9)' : 'rgba(0,0,0,0.85)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const paint = Math.round(performance.now() - t0);
      maxRef.current = Math.max(maxRef.current, paint);
      setTap({ paint, dispatch: Math.round(t0 - evt), max: maxRef.current });
      setN((c) => c + 1);
    }));
  };

  if (!show) return null;
  return (
    <div
      onPointerDown={onDown}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 2147483647,
        background: 'rgba(0,0,0,0.85)', color: '#39ff14',
        font: '13px/1.6 ui-monospace,Menlo,monospace', padding: '10px 12px',
        textAlign: 'center', pointerEvents: 'auto', whiteSpace: 'nowrap',
        userSelect: 'none', touchAction: 'manipulation',
      }}
    >
      {tap
        ? `tap→paint ${tap.paint}ms (max ${tap.max}) · dispatch ${tap.dispatch}ms · n${n} · ${isNativeApp() ? 'APP' : 'WEB'}`
        : `TAP THIS BAR a few times · ${isNativeApp() ? 'APP' : 'WEB'}`}
    </div>
  );
}
