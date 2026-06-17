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
