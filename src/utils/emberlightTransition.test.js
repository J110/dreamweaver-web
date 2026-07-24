import { clampWashSeconds, shouldRunUpgradeWash } from './emberlightTransition';

test('runs only on a confirmed free-to-premium edge', () => {
  expect(shouldRunUpgradeWash({
    previous: false,
    current: true,
    seen: false,
    reducedMotion: false,
  })).toBe(true);
});

test.each([
  { previous: null, current: true, seen: false, reducedMotion: false },
  { previous: true, current: true, seen: false, reducedMotion: false },
  { previous: false, current: true, seen: true, reducedMotion: false },
  { previous: false, current: true, seen: false, reducedMotion: true },
])('does not animate for $previous -> $current', (state) => {
  expect(shouldRunUpgradeWash(state)).toBe(false);
});

test.each([
  [undefined, 6],
  [1, 2],
  [6, 6],
  [14, 10],
])('clamps %p seconds to %p', (input, expected) => {
  expect(clampWashSeconds(input)).toBe(expected);
});
