// HARD GATE — premium-locked items must carry NO audio in the anonymous SSR view.
//
// Calibration note: ALL audio lives under a single /audio/pre-gen/ subdir (no
// per-type folder), so a subdir regex (/audio/long-stories|funny-shorts) would
// match nothing and silently pass a real leak. Instead the gate keys on the item
// itself: long_story and funny_short are always premium-locked, plus anything the
// backend marked premium_locked. Such an item must have no audio fields. The HTML
// is then cross-checked by basename so any audio it exposes must belong to a free,
// unlocked item from the same anonymous response.
//
// Usage: node scripts/ssr-leak-gate.mjs <base-url>   (e.g. http://localhost:3100)
// Exit 0 = PASS, 1 = LEAK (flip blocked), 2 = usage error.

const base = process.argv[2];
if (!base) { console.error('usage: node scripts/ssr-leak-gate.mjs <base-url>'); process.exit(2); }
const NATIVE_UA = 'DreamValleyApp/1.0';

const isPremiumLocked = (i) =>
  i.premium_locked === true || i.type === 'long_story' || i.subtype === 'funny_short';
const audioUrls = (i) => {
  const out = [];
  if (i.audio_url) out.push(i.audio_url);
  if (i.audio_file) out.push(i.audio_file);
  if (Array.isArray(i.audio_variants)) for (const v of i.audio_variants) if (v && v.url) out.push(v.url);
  return out;
};
const hasAudio = (i) => audioUrls(i).length > 0 || !!i.audio_dir;
const basename = (u) => String(u).split('/').pop().split('?')[0];

let fail = false;

// 1) Anonymous BFF — structured leak check (the precise condition).
const bff = await (await fetch(`${base}/api/home-grid?lang=en`)).json();
const items = bff.content || [];
const bffLeaks = items.filter((i) => isPremiumLocked(i) && hasAudio(i));
const legitBasenames = new Set();
for (const i of items) if (!isPremiumLocked(i)) for (const u of audioUrls(i)) legitBasenames.add(basename(u));

// 2) Anonymous SSR HTML — any audio URL whose basename isn't a free item's = suspect.
const html = await (await fetch(`${base}/?source=app`, { headers: { 'user-agent': NATIVE_UA } })).text();
const htmlAudio = [...new Set(html.match(/\/audio\/[A-Za-z0-9_\-./]+\.(?:mp3|wav|m4a|ogg)/g) || [])];
const htmlLeaks = htmlAudio.filter((u) => !legitBasenames.has(basename(u)));

console.log(`BFF: items=${items.length} premium-locked=${items.filter(isPremiumLocked).length} free-with-audio=${legitBasenames.size}`);
console.log(`HTML: audio refs=${htmlAudio.length}`);
if (bffLeaks.length) { fail = true; console.error('LEAK (BFF) premium/locked items carrying audio:', bffLeaks.slice(0, 8).map((i) => ({ id: i.id, type: i.type, subtype: i.subtype }))); }
if (htmlLeaks.length) { fail = true; console.error('LEAK (HTML) audio not belonging to a free item:', htmlLeaks.slice(0, 12)); }
if (fail) { console.error('LEAK GATE FAIL — prod flip BLOCKED.'); process.exit(1); }
console.log('LEAK GATE PASS — no premium audio in the anonymous SSR HTML or BFF.');
