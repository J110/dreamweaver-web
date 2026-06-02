'use client';

// Decisive JIT test for the native WKWebView, readable WITHOUT Web Inspector.
// Runs two micro-benchmarks once on load and shows the result on-screen:
//   JS  = a pure CPU loop → isolates JavaScript execution speed (JIT vs
//         interpreter). If the app's JS ms >> Safari's, JS is the cost.
//   DOM = create + force-layout of nodes → isolates render/layout cost. If the
//         app's DOM ms >> Safari's (but JS is ~equal), it's render/composite.
// Shows automatically in the native app (isNativeApp) so the owner sees it
// without query params; in a browser it shows only with ?jsperf=1 (so Safari
// can be compared on the same device). Temporary diagnostic — remove after.
import { useEffect, useState } from 'react';
import { isNativeApp } from '@/utils/platformDetect';

export default function PerfBench() {
  const [r, setR] = useState(null);

  useEffect(() => {
    let show = false;
    try {
      show = isNativeApp() || new URLSearchParams(window.location.search).get('jsperf') === '1';
    } catch { /* ignore */ }
    if (!show) return;

    // JS micro-bench — pure compute, no DOM. JIT ~tens of ms; interpreter 5-15x.
    const t0 = performance.now();
    let x = 0;
    for (let i = 0; i < 5_000_000; i++) x += Math.sqrt(i + 1) * 1.0000001;
    const js = performance.now() - t0;

    // DOM micro-bench — create 2000 nodes + force one layout.
    const t1 = performance.now();
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px';
    document.body.appendChild(host);
    for (let i = 0; i < 2000; i++) {
      const d = document.createElement('div');
      d.textContent = 'x';
      d.style.cssText = 'padding:1px;font-size:10px';
      host.appendChild(d);
    }
    void host.offsetHeight; // force synchronous layout
    const dom = performance.now() - t1;
    document.body.removeChild(host);

    // Guard against the loop being optimized away.
    setR({ js: Math.round(js), dom: Math.round(dom), native: isNativeApp(), sink: x > 0 });
  }, []);

  if (!r) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, zIndex: 2147483647,
      background: 'rgba(0,0,0,0.85)', color: '#39ff14',
      font: '13px/1.5 ui-monospace,Menlo,monospace', padding: '7px 10px',
      borderBottomRightRadius: 8, pointerEvents: 'none', whiteSpace: 'nowrap',
    }}>
      JS {r.js}ms · DOM {r.dom}ms · {r.native ? 'APP' : 'WEB'}
    </div>
  );
}
