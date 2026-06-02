// Per-device record of "user opened the bedtime playlist today", used to hide
// the daytime NapBanner once bedtime is engaged. Local by design: "the user
// opened bedtime" is inherently per-user/per-device state (playlist_history on
// the server is global — the wrong structure for this question). Resets at the
// local day boundary via the === today comparison.

const KEY = 'dv_bedtime_opened';

// Local (device) date as YYYY-MM-DD — same day semantics as the per-day
// playlist persist.
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Called on /playlist open (mount).
export function markBedtimeOpenedToday() {
  try { localStorage.setItem(KEY, localToday()); } catch { /* storage unavailable */ }
}

// Synchronous + fail-safe (no storage / error → false → nap shows).
export function wasBedtimeOpenedToday() {
  try { return localStorage.getItem(KEY) === localToday(); } catch { return false; }
}
