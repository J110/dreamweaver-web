import { canPlayTrack, nextPlayableIndex } from './playlistState';

const playable = { audio_url: '/audio/item.mp3', is_locked: false };

test('locked fourth track cannot play or receive autoplay progression', () => {
  const items = [playable, playable, playable, { audio_url: null, is_locked: true }];

  expect(canPlayTrack(items, 3)).toBe(false);
  expect(nextPlayableIndex(items, 2)).toBeNull();
});

test('premium fourth track remains next and playable', () => {
  const items = [playable, playable, playable, playable];

  expect(canPlayTrack(items, 3)).toBe(true);
  expect(nextPlayableIndex(items, 2)).toBe(3);
});

test('missing audio cannot enter playback', () => {
  expect(canPlayTrack([{ is_locked: false }], 0)).toBe(false);
});
