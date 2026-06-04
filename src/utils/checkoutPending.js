// Stripe checkout return handling (#35 Q3).
//
// In native external-Safari checkout the Stripe success page loads in Safari,
// so the app's WebView never runs /upgrade/success's webhook-race backoff poll.
// We bridge that gap with: a pending flag set when checkout opens, and a
// resume hook (window.__dvAppResumed, called by the Flutter lifecycle
// observer on every foreground) that — ONLY when a recent checkout is pending
// and the user isn't already premium — sends them to /upgrade/success to run
// the existing authoritative poll. Backend stays the source of truth; we never
// infer premium client-side.

const KEY = 'dv_checkout_pending';
const TTL_MS = 60 * 60 * 1000; // 1h — a stale pending must not re-trigger a poll

export function markCheckoutPending() {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
}

export function clearCheckoutPending() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

// True only if a checkout was started within the TTL. Self-prunes a stale flag.
export function isCheckoutPendingRecent() {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return false;
    const ts = parseInt(v, 10) || 0;
    if (!ts || Date.now() - ts > TTL_MS) { localStorage.removeItem(KEY); return false; }
    return true;
  } catch { return false; }
}

function systemBridge() {
  if (typeof window === 'undefined') return null;
  const s = window.DreamValleySystem;
  return s && s.isAvailable === true ? s : null;
}

// Open a URL in the EXTERNAL browser when native (compliance: digital-goods
// checkout must not run inside the app's WebView); plain redirect on web.
export function openExternalUrl(url) {
  if (!url || typeof window === 'undefined') return;
  try {
    const sys = systemBridge();
    if (sys) { sys.openExternal(url); return; }
  } catch { /* fall through to web redirect */ }
  window.location.href = url;
}

// Subscription checkout: mark pending (so the return is recognized), then open
// external/redirect. Topup uses openExternalUrl directly (no premium pending).
export function openCheckoutUrl(url) {
  if (!url || typeof window === 'undefined') return;
  markCheckoutPending();
  openExternalUrl(url);
}
