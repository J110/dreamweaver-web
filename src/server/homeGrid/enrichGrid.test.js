import { enrichGrid } from './enrichGrid';

test('locked API item never carries audio even when seed has it', () => {
  const apiItems = [{ id: 'x1', title: 'T', type: 'long_story', premium_locked: true }];
  const seedItems = [{ id: 'x1', title: 'T', cover: '/c.webp', audio_variants: [{ url: '/audio/long-stories/x1.mp3' }] }];
  const out = enrichGrid({ apiItems, seedItems, isPremium: false });
  expect(out[0].premium_locked).toBe(true);
  expect(out[0].audio_variants).toBeUndefined();
  expect(out[0].audio_url).toBeUndefined();
  expect(out[0].audio_file).toBeUndefined();
  expect(JSON.stringify(out)).not.toContain('/audio/');
});

test('seed-only premium extra is locked + audio-stripped for a free user', () => {
  const seedItems = [{ id: 's2', title: 'L', type: 'long_story', audio_variants: [{ url: '/audio/long-stories/s2.mp3' }] }];
  const out = enrichGrid({ apiItems: [], seedItems, isPremium: false });
  expect(out[0].premium_locked).toBe(true);
  expect(JSON.stringify(out)).not.toContain('/audio/');
});

test('premium user keeps audio on unlocked items', () => {
  const apiItems = [{ id: 'u1', title: 'U', premium_locked: false, audio_variants: [{ url: '/audio/u1.mp3' }] }];
  const out = enrichGrid({ apiItems, seedItems: [], isPremium: true });
  expect(out[0].audio_variants).toEqual([{ url: '/audio/u1.mp3' }]);
});

test('locked API item with NO seed match is still audio-stripped (the !seed branch)', () => {
  const apiItems = [{ id: 'nx', title: 'N', premium_locked: true, audio_url: '/audio/long-stories/nx.mp3', audio_variants: [{ url: '/audio/long-stories/nx.mp3' }] }];
  const out = enrichGrid({ apiItems, seedItems: [], isPremium: false });
  expect(out[0].premium_locked).toBe(true);
  expect(out[0].audio_url).toBeUndefined();
  expect(out[0].audio_variants).toBeUndefined();
  expect(JSON.stringify(out)).not.toContain('/audio/');
});

// Drift guard: pins the 14-day window to backend FREE_BACKLOG_DAYS (backlog.py:28).
// Trips if FREE_BACKLOG_MS changes without re-checking the backend.
test('free-type seed extra is locked only when older than the 14-day backlog window', () => {
  const day = 24 * 60 * 60 * 1000;
  const seedItems = [
    { id: 'old', title: 'O', type: 'story', created_at: new Date(Date.now() - 15 * day).toISOString() },
    { id: 'new', title: 'Nw', type: 'story', created_at: new Date(Date.now() - 13 * day).toISOString() },
  ];
  const byId = Object.fromEntries(enrichGrid({ apiItems: [], seedItems, isPremium: false }).map((i) => [i.id, i]));
  expect(byId.old.premium_locked).toBe(true);        // > 14d → locked + stripped
  expect(byId.new.premium_locked).toBeUndefined();   // < 14d free item → not locked
});
