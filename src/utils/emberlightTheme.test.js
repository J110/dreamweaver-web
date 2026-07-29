import {
  EFFECTIVE_PREMIUM_KEY,
  THEME_CHANGE_EVENT,
  cacheEffectivePremium,
  readEffectivePremium,
  resolveTheme,
} from './emberlightTheme';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('upgrade always previews premium', () => {
  expect(resolveTheme({ effectivePremium: false, pathname: '/upgrade' })).toBe('premium');
});

test('confirmed premium selects premium', () => {
  expect(resolveTheme({ effectivePremium: true, pathname: '/settings' })).toBe('premium');
});

test.each([false, null, undefined])('non-confirmed %p selects free', (effectivePremium) => {
  expect(resolveTheme({ effectivePremium, pathname: '/settings' })).toBe('free');
});

test('cache reads only explicit booleans', () => {
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'true' }))).toBe(true);
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'false' }))).toBe(false);
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'broken' }))).toBeNull();
});

test('cache dispatches previous and current values in the same tab', () => {
  const storage = memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'false' });
  const target = new EventTarget();
  const details = [];
  target.addEventListener(THEME_CHANGE_EVENT, (event) => details.push(event.detail));
  cacheEffectivePremium(true, storage, target);
  expect(details).toEqual([{ previous: false, current: true }]);
});
