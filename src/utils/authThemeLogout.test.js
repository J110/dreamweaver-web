import { logout } from './auth';
import { EFFECTIVE_PREMIUM_KEY, THEME_CHANGE_EVENT } from './emberlightTheme';

const mockPurgeOfflineUser = jest.fn();

jest.mock('./api', () => ({
  authApi: { serverLogout: jest.fn() },
}));
jest.mock('./offlineLibrary', () => ({
  purgeOfflineUser: (...args) => mockPurgeOfflineUser(...args),
}));

test('logout clears effective premium and notifies same-tab theme controllers', () => {
  const values = new Map([
    [EFFECTIVE_PREMIUM_KEY, 'true'],
    ['dreamweaver_token', 'token'],
    ['dreamweaver_user', JSON.stringify({ username: 'moon' })],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const dispatchEvent = jest.fn();
  global.CustomEvent = class {
    constructor(type, init) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  global.window = { localStorage: storage, dispatchEvent };
  global.localStorage = storage;
  global.sessionStorage = { removeItem: jest.fn() };

  logout();

  expect(storage.getItem(EFFECTIVE_PREMIUM_KEY)).toBeNull();
  expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
    type: THEME_CHANGE_EVENT,
    detail: { previous: true, current: false },
  }));
});

test('logout captures the current user scope before starting the asynchronous purge', async () => {
  const values = new Map([
    ['dreamweaver_token', 'token'],
    ['dreamweaver_user', JSON.stringify({ uid: 'u1', username: 'moon' })],
  ]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  global.window = { localStorage: storage, dispatchEvent: jest.fn() };
  global.localStorage = storage;
  global.sessionStorage = { removeItem: jest.fn() };
  mockPurgeOfflineUser.mockImplementation(async (userId) => {
    expect(userId).toBe('u1');
    expect(storage.getItem('dreamweaver_user')).not.toBeNull();
  });

  const completion = logout();

  expect(storage.getItem('dreamweaver_user')).toBeNull();
  await completion;
  expect(mockPurgeOfflineUser).toHaveBeenCalledWith('u1');
});
