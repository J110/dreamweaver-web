import {
  createOfflineReconciliationRunner,
  loadSavedLibrary,
  reconcileOfflineLibrary,
} from '@/utils/offlineLibrary';

test('uses a last-confirmed premium lease and complete ready packages when the API is offline', async () => {
  const packageRecord = {
    userId: 'u1',
    contentId: 'story-1',
    state: 'ready',
    content: { id: 'story-1', title: 'Moon Story' },
    audioBlob: new Blob(['audio']),
    coverBlob: new Blob(['cover']),
  };
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    listReadyPackages: jest.fn().mockResolvedValue([packageRecord]),
  };

  await expect(loadSavedLibrary({
    userId: 'u1',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    store,
  })).resolves.toMatchObject({
    items: [expect.objectContaining({ id: 'story-1', offlineReady: true })],
    effectivePremium: true,
    offline: true,
  });
});

test('an online downgrade is authoritative and purges cached packages', async () => {
  const store = {
    purgePackages: jest.fn().mockResolvedValue(undefined),
    setEntitlementLease: jest.fn().mockResolvedValue(undefined),
  };

  const snapshot = await loadSavedLibrary({
    userId: 'u1',
    api: {
      getUserSaves: jest.fn().mockResolvedValue({
        items: [],
        effective_premium: false,
        save_cap: 5,
      }),
    },
    store,
  });

  expect(snapshot).toEqual({
    items: [],
    effectivePremium: false,
    saveCap: 5,
    offline: false,
  });
  expect(store.purgePackages).toHaveBeenCalledWith('u1', expect.any(Number));
});

test('an offline failure never grants access without a confirmed premium lease', async () => {
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: false }),
    listReadyPackages: jest.fn(),
  };

  const snapshot = await loadSavedLibrary({
    userId: 'u1',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    store,
  });

  expect(snapshot.items).toEqual([]);
  expect(store.listReadyPackages).not.toHaveBeenCalled();
});

test('uses a shared reconciliation result without issuing a second saves request', async () => {
  const reconciliationRunner = jest.fn().mockResolvedValue({
    items: [{ id: 'story-1', title: 'Moon Story' }],
    effective_premium: true,
    save_cap: 30,
  });
  const store = {};

  const snapshot = await loadSavedLibrary({
    userId: 'u1',
    reconciliationRunner,
    store,
  });

  expect(reconciliationRunner).toHaveBeenCalledTimes(1);
  expect(snapshot).toEqual({
    items: [{ id: 'story-1', title: 'Moon Story' }],
    effectivePremium: true,
    saveCap: 30,
    offline: false,
  });
});

test('drops a saved-library result when the active account changes', async () => {
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    listReadyPackages: jest.fn().mockResolvedValue([]),
  };

  const snapshot = await loadSavedLibrary({
    userId: 'u1',
    reconciliationRunner: jest.fn().mockResolvedValue({
      items: [{ id: 'u1-story' }],
      effective_premium: true,
      save_cap: 30,
    }),
    getCurrentUser: () => ({ uid: 'u2' }),
    store,
  });

  expect(snapshot).toMatchObject({ items: [], stale: true });
  expect(store.getEntitlementLease).not.toHaveBeenCalled();
});

test('drops offline packages when identity changes while the lease is being read', async () => {
  let activeUser = { uid: 'offline-u1' };
  let releaseLease;
  const lease = new Promise((resolve) => {
    releaseLease = () => resolve({ effectivePremium: true });
  });
  const store = {
    getEntitlementLease: jest.fn().mockReturnValue(lease),
    listReadyPackages: jest.fn().mockResolvedValue([{
      userId: 'offline-u1',
      contentId: 'story-1',
      state: 'ready',
      content: { id: 'story-1' },
      audioBlob: new Blob(['audio']),
      coverBlob: new Blob(['cover']),
    }]),
  };
  const loading = loadSavedLibrary({
    userId: 'offline-u1',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    getCurrentUser: () => activeUser,
    store,
  });
  activeUser = { uid: 'offline-u2' };
  releaseLease();

  await expect(loading).resolves.toMatchObject({ items: [], stale: true });
  expect(store.listReadyPackages).not.toHaveBeenCalled();
});

test('drops offline packages when identity changes while packages are being read', async () => {
  let activeUser = { uid: 'package-u1' };
  let releasePackages;
  let packagesStarted;
  const started = new Promise((resolve) => {
    packagesStarted = resolve;
  });
  const packages = new Promise((resolve) => {
    releasePackages = () => resolve([{
      userId: 'package-u1',
      contentId: 'story-1',
      state: 'ready',
      content: { id: 'story-1' },
      audioBlob: new Blob(['audio']),
      coverBlob: new Blob(['cover']),
    }]);
  });
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    listReadyPackages: jest.fn(() => {
      packagesStarted();
      return packages;
    }),
  };
  const loading = loadSavedLibrary({
    userId: 'package-u1',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    getCurrentUser: () => activeUser,
    store,
  });
  await started;
  activeUser = { uid: 'package-u2' };
  releasePackages();

  await expect(loading).resolves.toMatchObject({ items: [], stale: true });
});

test('failed free lease write still suppresses an older premium offline fallback', async () => {
  const values = new Map();
  const previousStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  const store = {
    setEntitlementLease: jest.fn().mockRejectedValue(new Error('write failed')),
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    listReadyPackages: jest.fn().mockResolvedValue([{
      userId: 'revoked-user',
      contentId: 'story-1',
      state: 'ready',
      content: { id: 'story-1' },
      audioBlob: new Blob(['audio']),
      coverBlob: new Blob(['cover']),
    }]),
  };

  await expect(reconcileOfflineLibrary({
    userId: 'revoked-user',
    effectivePremium: false,
    savedItems: [],
    store,
  })).rejects.toThrow('write failed');
  const snapshot = await loadSavedLibrary({
    userId: 'revoked-user',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    store,
  });

  expect(snapshot).toMatchObject({ items: [], effectivePremium: false, offline: true });
  expect(store.getEntitlementLease).not.toHaveBeenCalled();
  expect(store.listReadyPackages).not.toHaveBeenCalled();
  if (previousStorage) Object.defineProperty(global, 'localStorage', previousStorage);
  else delete global.localStorage;
});

test('authoritative free suppresses premium fallback even when the store cannot open', async () => {
  const values = new Map();
  const previousStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  const runner = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'open-failure-revoked-user' }),
    isAuthenticated: () => true,
    api: {
      getUserSaves: jest.fn().mockResolvedValue({
        items: [],
        effective_premium: false,
        save_cap: 5,
      }),
    },
    openStore: jest.fn().mockRejectedValue(new Error('IndexedDB unavailable')),
    scheduleRetry: jest.fn(),
  });

  await runner();
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    listReadyPackages: jest.fn().mockResolvedValue([{
      userId: 'open-failure-revoked-user',
      contentId: 'story-1',
      state: 'ready',
      content: { id: 'story-1' },
      audioBlob: new Blob(['audio']),
      coverBlob: new Blob(['cover']),
    }]),
  };
  const snapshot = await loadSavedLibrary({
    userId: 'open-failure-revoked-user',
    api: { getUserSaves: jest.fn().mockRejectedValue(new Error('offline')) },
    store,
  });

  expect(snapshot).toMatchObject({ items: [], effectivePremium: false, offline: true });
  expect(store.getEntitlementLease).not.toHaveBeenCalled();
  if (previousStorage) Object.defineProperty(global, 'localStorage', previousStorage);
  else delete global.localStorage;
});
