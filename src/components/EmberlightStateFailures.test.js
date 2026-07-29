const mockEffects = [];
const mockSetActive = jest.fn();

jest.mock('@babel/runtime/helpers/interopRequireDefault', () => (
  (value) => (value?.__esModule ? value : { default: value })
), { virtual: true });
jest.mock('@babel/runtime/helpers/defineProperty', () => (
  (target, key, value) => {
    target[key] = value;
    return target;
  }
), { virtual: true });
jest.mock('react', () => ({
  useEffect: (effect) => mockEffects.push(effect),
  useState: () => [false, mockSetActive],
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/settings',
}));
jest.mock('@/utils/emberlightTheme', () => require('../utils/emberlightTheme'), {
  virtual: true,
});
jest.mock('@/utils/emberlightTransition', () => require('../utils/emberlightTransition'), {
  virtual: true,
});
jest.mock('@/utils/auth', () => ({ getStoredFamilyId: () => null }), { virtual: true });
jest.mock('./EmberlightUpgradeWash.module.css', () => ({}), { virtual: true });

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error('storage unavailable');
    },
    setItem: () => {
      throw new Error('storage unavailable');
    },
  };
}

beforeEach(() => {
  mockEffects.length = 0;
  mockSetActive.mockClear();
});

test('theme controller applies authoritative same-tab detail when storage writes fail', () => {
  const target = new EventTarget();
  const storage = throwingStorage();
  target.localStorage = storage;
  target.DreamValleyTheme = { postMessage: jest.fn() };
  global.window = target;
  global.localStorage = storage;
  global.navigator = {};
  global.document = {
    documentElement: {
      setAttribute: jest.fn(),
      toggleAttribute: jest.fn(),
    },
  };
  const Controller = require('./EmberlightThemeController').default;
  const { cacheEffectivePremium } = require('../utils/emberlightTheme');
  Controller();
  mockEffects.splice(0).forEach((effect) => effect());

  cacheEffectivePremium(true, storage, target);

  expect(document.documentElement.setAttribute).toHaveBeenLastCalledWith(
    'data-theme',
    'premium',
  );
});

test('upgrade wash suppresses repeated same-session events when seen writes fail', () => {
  const target = new EventTarget();
  const storage = throwingStorage();
  target.localStorage = storage;
  target.matchMedia = () => ({ matches: false });
  target.setTimeout = jest.fn();
  global.window = target;
  global.localStorage = storage;
  const Wash = require('./EmberlightUpgradeWash').default;
  const { THEME_CHANGE_EVENT } = require('../utils/emberlightTheme');
  Wash();
  mockEffects.splice(0).forEach((effect) => effect());
  const transition = () => target.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
    detail: { previous: false, current: true },
  }));

  transition();
  transition();

  expect(mockSetActive.mock.calls.filter(([value]) => value === true)).toHaveLength(1);
});
