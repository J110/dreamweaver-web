import {
  createOfflineReconciliationRunner,
  purgeOfflineUser,
} from '@/utils/offlineLibrary';

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

test('authoritative downgrade survives local storage failure and schedules cleanup retry', async () => {
  let now = 100;
  const scheduleRetry = jest.fn();
  const api = {
    getUserSaves: jest.fn()
      .mockResolvedValueOnce({ items: [], effective_premium: false, save_cap: 5 })
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

  await expect(runner()).resolves.toMatchObject({ effective_premium: false });
  expect(scheduleRetry).toHaveBeenCalledTimes(1);
  now = 200;
  await expect(runner()).resolves.toMatchObject({ effective_premium: false });
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
