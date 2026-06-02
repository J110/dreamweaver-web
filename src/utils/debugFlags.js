// Dark, URL-toggled diagnostic flags for on-device iOS perf isolation.
// Invisible to normal users (no query param → all false). Flags stick for the
// session (sessionStorage) so they survive in-app client navigation.
//   ?perf=1     → show on-screen FPS/blocking overlay
//   ?nostars=1  → disable StarField (test app-wide CSS-animation cost)
//   ?noblur=1   → disable all backdrop-filter blur (test WebKit repaint cost)
//   ?nocovers=1 → hide grid cover images (test cover render/animation cost)
// Append ?flag=0 to clear a sticky flag.
const FLAG_KEYS = ['perf', 'nostars', 'noblur', 'nocovers'];

export function getDebugFlags() {
  if (typeof window === 'undefined') return {};
  const out = {};
  try {
    const sp = new URLSearchParams(window.location.search);
    for (const k of FLAG_KEYS) {
      const v = sp.get(k);
      if (v != null) {
        try { sessionStorage.setItem('dbg_' + k, v === '0' ? '0' : '1'); } catch { /* ignore */ }
      }
      let stored = '0';
      try { stored = sessionStorage.getItem('dbg_' + k) || '0'; } catch { /* ignore */ }
      out[k] = stored === '1';
    }
  } catch { /* ignore */ }
  return out;
}
