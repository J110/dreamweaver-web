'use client';

// On-screen perf meter for on-device iOS diagnosis (no Web Inspector needed).
// Mounts only with ?perf=1. FPS is the primary signal: low FPS at idle = a
// continuous compositing cost (StarField / backdrop-filter); FPS tanking on an
// interaction (e.g. EN<->HI toggle) = that interaction's repaint cost. BLOCK
// (long-task ms, last ~4s) is shown when the browser supports it (iOS 16.4+).
import { useEffect, useRef, useState } from 'react';
import { getDebugFlags } from '@/utils/debugFlags';

export default function PerfOverlay() {
  const [on, setOn] = useState(false);
  const [fps, setFps] = useState(0);
  const [minFps, setMinFps] = useState(99);
  const [block, setBlock] = useState(-1);
  const flagsRef = useRef({});

  useEffect(() => {
    const flags = getDebugFlags();
    flagsRef.current = flags;
    if (!flags.perf) return;
    setOn(true);

    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now) => {
      frames++;
      if (now - last >= 1000) {
        const f = Math.round((frames * 1000) / (now - last));
        setFps(f);
        setMinFps((m) => Math.min(m, f));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    let obs = null;
    let total = 0;
    const marks = [];
    try {
      obs = new PerformanceObserver((list) => {
        const t = performance.now();
        for (const e of list.getEntries()) marks.push([t, e.duration]);
        while (marks.length && marks[0][0] < t - 4000) marks.shift();
        total = marks.reduce((a, m) => a + m[1], 0);
        setBlock(Math.round(total));
      });
      obs.observe({ entryTypes: ['longtask'] });
    } catch { /* longtask unsupported (older iOS) — FPS still works */ }

    return () => { cancelAnimationFrame(raf); if (obs) obs.disconnect(); };
  }, []);

  if (!on) return null;
  const f = flagsRef.current;
  const tags = ['nostars', 'noblur', 'nocovers'].filter((k) => f[k]).map((k) => k.toUpperCase()).join(' ');
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, zIndex: 2147483647,
      background: 'rgba(0,0,0,0.82)', color: '#39ff14',
      font: '12px/1.4 ui-monospace,Menlo,monospace', padding: '6px 9px',
      borderBottomRightRadius: 8, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      FPS {fps} · min {minFps} · BLOCK {block < 0 ? 'n/a' : block + 'ms'}{tags ? ' · ' + tags : ''}
    </div>
  );
}
