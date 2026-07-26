/** @jest-environment jsdom */

const React = require('react');
const { act } = require('react-dom/test-utils');
const { createRoot } = require('react-dom/client');

const mockPush = jest.fn();
const mockGetUserSaves = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockWiringStore = {
  setEntitlementLease: jest.fn().mockResolvedValue(undefined),
  getEntitlementLease: jest.fn(),
  deleteEntitlementLease: jest.fn(),
  listPackages: jest.fn().mockResolvedValue([]),
  purgePackages: jest.fn().mockResolvedValue(undefined),
  purgeUser: jest.fn().mockResolvedValue(undefined),
};

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock('@/utils/i18n', () => ({
  I18nProvider: ({ children }) => children,
  hasCompletedOnboarding: () => true,
}));
jest.mock('@/utils/voicePreferences', () => ({
  VoicePreferencesProvider: ({ children }) => children,
}));
jest.mock('@/utils/auth', () => ({
  getUser: () => ({ uid: 'app-shell-user', onboarding_complete: true }),
  isLoggedIn: () => true,
  setToken: jest.fn(),
  setUser: jest.fn(),
  tryAdoptNativeToken: jest.fn().mockResolvedValue(false),
}));
jest.mock('@/utils/api', () => ({
  interactionApi: {
    getUserSaves: (...args) => mockGetUserSaves(...args),
  },
  authApi: {
    getCurrentUser: (...args) => mockGetCurrentUser(...args),
  },
}));
jest.mock('@/utils/offlineStore', () => ({
  openOfflineStore: jest.fn(() => Promise.resolve(mockWiringStore)),
  packageKey: (userId, contentId) => `${userId}:${contentId}`,
}));
jest.mock('@/utils/checkoutPending', () => ({
  isCheckoutPendingRecent: () => false,
  clearCheckoutPending: jest.fn(),
}));
jest.mock('@/hooks/useVersionCheck', () => jest.fn());
jest.mock('./BottomNav', () => () => null);
jest.mock('@/components/EmberlightThemeController', () => () => null);
jest.mock('@/components/EmberlightUpgradeWash', () => () => null);
jest.mock('./InstallPrompt', () => () => null);
jest.mock('@/utils/platformDetect', () => ({ isNativeApp: () => false }));
jest.mock('@/utils/nativeGate', () => ({
  isAppUser: () => false,
  isLandingHome: () => false,
}));
jest.mock('./BedtimePopup', () => () => null);
jest.mock('@/utils/analytics', () => ({
  dvAnalytics: {
    track: jest.fn(),
    parseReferrer: jest.fn(),
    endSession: jest.fn(),
    sessionId: 'session',
    _isNewUser: false,
  },
}));

import {
  activateOfflineUserSession,
  createOfflineReconciliationRunner,
  purgeOfflineUser,
} from '@/utils/offlineLibrary';

const AppShell = require('./AppShell').default;

global.IS_REACT_ACT_ENVIRONMENT = true;

test('coalesces startup and resume reconciliation into one authoritative request', async () => {
  let release;
  const response = new Promise((resolve) => {
    release = () => resolve({
      items: [{ id: 'story-1' }],
      effective_premium: true,
      save_cap: 30,
    });
  });
  const api = { getUserSaves: jest.fn().mockReturnValue(response) };
  const reconcile = jest.fn().mockResolvedValue(undefined);
  const store = {};
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'u1' }),
    isAuthenticated: () => true,
    api,
    openStore: jest.fn().mockResolvedValue(store),
    reconcile,
  });

  const startup = runner();
  const resume = runner();
  expect(startup).toBe(resume);
  expect(api.getUserSaves).toHaveBeenCalledTimes(1);

  release();
  await startup;
  expect(reconcile).toHaveBeenCalledWith({
    userId: 'u1',
    effectivePremium: true,
    savedItems: [{ id: 'story-1' }],
    sessionEpoch: 0,
    store,
  });
});

test('preserves packages and the premium lease when reconciliation loses the network', async () => {
  const reconcile = jest.fn();
  const openStore = jest.fn();
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'u1' }),
    isAuthenticated: () => true,
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    openStore,
    reconcile,
  });

  await expect(runner()).resolves.toBeNull();
  expect(openStore).not.toHaveBeenCalled();
  expect(reconcile).not.toHaveBeenCalled();
});

test('does not apply a stale entitlement response after logout', async () => {
  let release;
  let authenticated = true;
  const response = new Promise((resolve) => {
    release = () => resolve({ items: [{ id: 'story-1' }], effective_premium: true });
  });
  const reconcile = jest.fn();
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'u1' }),
    isAuthenticated: () => authenticated,
    api: { getUserSaves: jest.fn().mockReturnValue(response) },
    openStore: jest.fn(),
    reconcile,
  });

  const pending = runner();
  authenticated = false;
  release();

  await pending;
  expect(reconcile).not.toHaveBeenCalled();
});

test('logout while the store is opening prevents reconciliation writes', async () => {
  const purgeStore = {
    purgeUser: jest.fn().mockResolvedValue(undefined),
  };
  let releaseStore;
  let storeOpening;
  const opening = new Promise((resolve) => {
    releaseStore = () => resolve({});
  });
  const reconcile = jest.fn();
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'store-race-user' }),
    isAuthenticated: () => true,
    api: { getUserSaves: jest.fn().mockResolvedValue({ items: [], effective_premium: true }) },
    openStore: jest.fn(() => {
      storeOpening?.();
      return opening;
    }),
    reconcile,
  });
  const reachedStore = new Promise((resolve) => {
    storeOpening = resolve;
  });

  const pending = runner();
  await reachedStore;
  await purgeOfflineUser('store-race-user', async () => purgeStore);
  releaseStore();
  await pending;

  expect(reconcile).not.toHaveBeenCalled();
});

test('logout during an entitlement write removes the stale lease after it settles', async () => {
  let releaseLease;
  let leaseStarted;
  const started = new Promise((resolve) => {
    leaseStarted = resolve;
  });
  let lease = null;
  const store = {
    setEntitlementLease: jest.fn((userId, effectivePremium, confirmedAt, sessionEpoch) => {
      leaseStarted();
      return new Promise((resolve) => {
        releaseLease = () => {
          lease = { userId, effectivePremium, confirmedAt, sessionEpoch };
          resolve();
        };
      });
    }),
    getEntitlementLease: jest.fn(async () => lease),
    deleteEntitlementLease: jest.fn(async () => {
      lease = null;
    }),
    listPackages: jest.fn().mockResolvedValue([]),
    purgeUser: jest.fn(async () => {
      lease = null;
    }),
  };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'lease-race-user' }),
    isAuthenticated: () => true,
    api: { getUserSaves: jest.fn().mockResolvedValue({ items: [], effective_premium: true }) },
    openStore: jest.fn().mockResolvedValue(store),
  });

  const reconciliation = runner();
  await started;
  const logout = purgeOfflineUser('lease-race-user', async () => store);
  releaseLease();
  await Promise.all([reconciliation, logout]);

  expect(lease).toBeNull();
});

test('authoritative premium survives local storage failure but is not reused after network failure', async () => {
  let now = 100;
  const scheduleRetry = jest.fn();
  const api = {
    getUserSaves: jest.fn()
      .mockResolvedValueOnce({ items: [], effective_premium: true, save_cap: 30 })
      .mockRejectedValueOnce(new Error('offline')),
  };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'storage-failure-user' }),
    isAuthenticated: () => true,
    api,
    openStore: jest.fn().mockRejectedValue(new Error('IndexedDB unavailable')),
    scheduleRetry,
    now: () => now,
    dedupeMs: 10,
  });

  await expect(runner()).resolves.toMatchObject({ effective_premium: true });
  expect(scheduleRetry).toHaveBeenCalledTimes(1);
  now = 200;
  await expect(runner()).resolves.toBeNull();
});

test('deduplicates serial lifecycle triggers only inside the bounded window', async () => {
  let now = 100;
  const api = {
    getUserSaves: jest.fn().mockResolvedValue({ items: [], effective_premium: true }),
  };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'timing-user' }),
    isAuthenticated: () => true,
    api,
    openStore: jest.fn().mockResolvedValue({}),
    reconcile: jest.fn().mockResolvedValue(undefined),
    now: () => now,
    dedupeMs: 1000,
  });

  await runner();
  now = 500;
  await runner();
  expect(api.getUserSaves).toHaveBeenCalledTimes(1);

  now = 1200;
  await runner();
  expect(api.getUserSaves).toHaveBeenCalledTimes(2);
});

test('starts the dedupe window after a long reconciliation settles', async () => {
  let now = 100;
  let releaseReconciliation;
  const reconciliation = new Promise((resolve) => {
    releaseReconciliation = resolve;
  });
  const api = {
    getUserSaves: jest.fn().mockResolvedValue({ items: [], effective_premium: true }),
  };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'long-reconcile-user' }),
    isAuthenticated: () => true,
    api,
    openStore: jest.fn().mockResolvedValue({}),
    reconcile: jest.fn().mockReturnValue(reconciliation),
    now: () => now,
    dedupeMs: 1000,
  });

  const pending = runner();
  now = 5000;
  releaseReconciliation();
  await pending;
  now = 5500;
  await runner();

  expect(api.getUserSaves).toHaveBeenCalledTimes(1);
});

test('returns an authoritative downgrade after its purge advances the user epoch', async () => {
  const store = {
    purgeUser: jest.fn().mockResolvedValue(undefined),
    setEntitlementLease: jest.fn().mockResolvedValue(undefined),
    getEntitlementLease: jest.fn(),
    deleteEntitlementLease: jest.fn(),
  };
  const data = { items: [], effective_premium: false, save_cap: 5 };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'downgrade-epoch-user' }),
    isAuthenticated: () => true,
    api: { getUserSaves: jest.fn().mockResolvedValue(data) },
    openStore: jest.fn().mockResolvedValue(store),
  });

  await expect(runner()).resolves.toBe(data);
});

test('scheduled cleanup retries locally without another saves request until it succeeds', async () => {
  const callbacks = [];
  const store = {
    setEntitlementLease: jest.fn().mockResolvedValue(undefined),
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: false }),
    deleteEntitlementLease: jest.fn(),
    purgePackages: jest.fn()
      .mockRejectedValueOnce(new Error('busy'))
      .mockResolvedValueOnce(undefined),
  };
  const api = {
    getUserSaves: jest.fn().mockResolvedValue({
      items: [],
      effective_premium: false,
      save_cap: 5,
    }),
  };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'cleanup-retry-user' }),
    isAuthenticated: () => true,
    api,
    openStore: jest.fn().mockResolvedValue(store),
    scheduleRetry: (callback) => callbacks.push(callback),
  });

  await expect(runner()).resolves.toMatchObject({ effective_premium: false });
  expect(store.setEntitlementLease).toHaveBeenCalledWith(
    'cleanup-retry-user',
    false,
    expect.any(Number),
    expect.any(Number),
  );
  expect(callbacks).toHaveLength(1);
  await callbacks.shift()();

  expect(store.purgePackages).toHaveBeenCalledTimes(2);
  expect(api.getUserSaves).toHaveBeenCalledTimes(1);
  expect(callbacks).toHaveLength(0);
});

test('authoritative free result survives an entitlement write failure', async () => {
  const callbacks = [];
  const data = { items: [], effective_premium: false, save_cap: 5 };
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'lease-write-failure-user' }),
    isAuthenticated: () => true,
    api: { getUserSaves: jest.fn().mockResolvedValue(data) },
    openStore: jest.fn().mockResolvedValue({
      setEntitlementLease: jest.fn().mockRejectedValue(new Error('write failed')),
    }),
    scheduleRetry: (callback) => callbacks.push(callback),
  });

  await expect(runner()).resolves.toBe(data);
  expect(callbacks).toHaveLength(1);
});

test('old logout does not purge packages created by a same-user re-login', async () => {
  let releaseStore;
  const opening = new Promise((resolve) => {
    releaseStore = resolve;
  });
  const store = {
    purgeUser: jest.fn().mockResolvedValue(undefined),
  };
  const logout = purgeOfflineUser('same-user-relogin', () => opening);
  activateOfflineUserSession('same-user-relogin');
  releaseStore(store);
  await logout;

  expect(store.purgeUser).not.toHaveBeenCalled();
});

test('AppShell wires startup, native resume, online, focus, and auth refresh through one deduped runner', async () => {
  mockGetUserSaves.mockReset().mockResolvedValue({
    items: [],
    effective_premium: true,
    save_cap: 30,
  });
  mockGetCurrentUser.mockReset().mockResolvedValue({ uid: 'app-shell-user' });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(AppShell, null, React.createElement('div', null, 'child')));
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    window.dispatchEvent(new Event('online'));
    window.dispatchEvent(new Event('focus'));
    window.__dvAppResumed();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockGetCurrentUser).toHaveBeenCalled();
  expect(mockGetUserSaves).toHaveBeenCalledTimes(1);

  act(() => root.unmount());
  container.remove();
});
