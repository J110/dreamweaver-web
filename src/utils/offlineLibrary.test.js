import {
  queueOfflinePackage,
  removeOfflinePackage,
  getReadyOfflinePackage,
  resolveOfflinePackage,
  selectOfflineAudio,
  reconcileOfflineLibrary,
  getOfflineSavedItems,
  captureOfflineUserEpoch,
  purgeOfflineUser,
  activateOfflineUserSession,
  createOfflineReconciliationRunner,
} from './offlineLibrary';
import { createOfflineStore } from './offlineStore';

function memoryStore() {
  const stores = {
    packages: new Map(),
    entitlements: new Map(),
  };
  return createOfflineStore({
    put: async (store, value) => stores[store].set(value.key ?? value.userId, value),
    get: async (store, key) => stores[store].get(key) ?? null,
    getAll: async (store) => [...stores[store].values()],
    delete: async (store, key) => stores[store].delete(key),
  });
}

function sharedMemoryDb() {
  const stores = {
    packages: new Map(),
    entitlements: new Map(),
  };
  return {
    put: async (store, value) => stores[store].set(value.key ?? value.userId, value),
    get: async (store, key) => stores[store].get(key) ?? null,
    getAll: async (store) => [...stores[store].values()],
    delete: async (store, key) => stores[store].delete(key),
  };
}

function sampleContentWithVoices() {
  return {
    id: 'story-1',
    title: 'Moon Story',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [
      { voice: 'female_1', url: 'https://media.example/female-1.mp3' },
      { voice: 'female_2', url: 'https://media.example/female-2.mp3' },
    ],
  };
}

function fetchBlob(url) {
  return Promise.resolve(new Response(new Blob([url])));
}

test('downloads current voice, cover, and metadata after premium save', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  const record = await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });

  expect(record).toMatchObject({ state: 'ready', voiceId: 'female_2', content });
  expect(record.audioBlob).toBeInstanceOf(Blob);
  expect(record.coverBlob).toBeInstanceOf(Blob);
  expect(await record.audioBlob.text()).toBe('https://media.example/female-2.mp3');
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'ready', voiceId: 'female_2' });
});

test('marks a failed download for retry without deleting the save record', async () => {
  const store = memoryStore();
  const record = await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store,
    fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
  });

  expect(record).toMatchObject({
    state: 'failed', voiceId: 'female_2',
    audioSourceUrl: 'https://media.example/female-2.mp3',
    coverSourceUrl: 'https://media.example/cover.jpg',
  });
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'failed' });
});

test('replaces cached audio when the selected voice changes', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_1', store, fetchImpl: fetchBlob });
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob });

  const record = await store.getPackage('u1', 'story-1');
  expect(record.voiceId).toBe('female_2');
  expect(await record.audioBlob.text()).toBe('https://media.example/female-2.mp3');
});

test('keeps the newer voice package when an older download finishes last', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  const releaseOlderDownloads = [];
  const olderFetch = jest.fn(() => new Promise((resolve) => {
    releaseOlderDownloads.push(() => resolve(new Response(new Blob(['older']))));
  }));
  const older = queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_1', store, fetchImpl: olderFetch,
  });
  await Promise.resolve();
  const newer = await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  releaseOlderDownloads.forEach((release) => release());
  await older;

  expect(newer.voiceId).toBe('female_2');
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'ready', voiceId: 'female_2' });
});

test('normalizes supported audio_file and cover_file paths before downloading', async () => {
  const store = memoryStore();
  const fetchImpl = jest.fn(fetchBlob);
  await queueOfflinePackage({
    userId: 'u1',
    content: { id: 'poem-1', type: 'poem', lang: 'hi', audio_file: 'night.mp3', cover_file: 'moon.jpg' },
    selectedVoice: 'female_1',
    store,
    fetchImpl,
  });

  expect(fetchImpl).toHaveBeenCalledWith('/audio/poems-hi/night.mp3');
  expect(fetchImpl).toHaveBeenCalledWith('/covers/poems-hi/moon.jpg');
});

test('uses the first available voice when no preference is selected', () => {
  expect(selectOfflineAudio(sampleContentWithVoices(), null)).toEqual({
    voiceId: 'female_1', audioUrl: 'https://media.example/female-1.mp3',
  });
});

test('does not resolve incomplete or failed packages for playback', async () => {
  const store = memoryStore();
  await store.putPackage({
    key: 'u1:story-1', userId: 'u1', contentId: 'story-1', state: 'failed',
    content: sampleContentWithVoices(), audioBlob: new Blob(['audio']),
  });

  expect(await resolveOfflinePackage({ userId: 'u1', contentId: 'story-1', store })).toBeNull();
});

test('does not resolve a package for a different selected voice', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_1', store, fetchImpl: fetchBlob,
  });

  expect(await resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store,
  })).toBeNull();
});

test('hydrates cached metadata from a ready package without a network response', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob });

  expect(await getReadyOfflinePackage({ userId: 'u1', contentId: 'story-1', store })).toMatchObject({
    content,
    voiceId: 'female_2',
  });
});

test('creates and revokes object URLs for ready packages', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  const urlApi = {
    createObjectURL: jest.fn()
      .mockReturnValueOnce('blob:audio')
      .mockReturnValueOnce('blob:cover'),
    revokeObjectURL: jest.fn(),
  };

  const resolved = await resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store, urlApi,
  });
  expect(resolved).toMatchObject({
    content: sampleContentWithVoices(), audioUrl: 'blob:audio', coverUrl: 'blob:cover',
  });
  resolved.revoke();
  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:cover');
});

test('removes the package when the premium save is removed', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });

  await removeOfflinePackage({ userId: 'u1', contentId: 'story-1', store });
  expect(await store.getPackage('u1', 'story-1')).toBeNull();
});

test('does not restore a removed package when its earlier download finishes', async () => {
  const store = memoryStore();
  const releases = [];
  let downloadsStarted;
  const started = new Promise((resolve) => { downloadsStarted = resolve; });
  const download = queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store,
    fetchImpl: () => new Promise((resolve) => {
      releases.push(() => resolve(new Response(new Blob(['late']))));
      if (releases.length === 2) downloadsStarted();
    }),
  });
  await started;
  await removeOfflinePackage({ userId: 'u1', contentId: 'story-1', store });
  releases.forEach((release) => release());
  await download;

  expect(await store.getPackage('u1', 'story-1')).toBeNull();
});

test('confirmed downgrade purges packages and records a free entitlement lease', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });

  await reconcileOfflineLibrary({
    userId: 'u1', effectivePremium: false, savedItems: [], store, fetchImpl: fetchBlob,
  });

  expect(await store.listReadyPackages('u1')).toEqual([]);
  expect(await store.getEntitlementLease('u1')).toMatchObject({ effectivePremium: false });
});

test('confirmed downgrade invalidates a package download already in flight', async () => {
  const store = memoryStore();
  const releases = [];
  let downloadsStarted;
  const started = new Promise((resolve) => { downloadsStarted = resolve; });
  const download = queueOfflinePackage({
    userId: 'u1',
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    store,
    fetchImpl: () => new Promise((resolve) => {
      releases.push(() => resolve(new Response(new Blob(['late']))));
      if (releases.length === 2) downloadsStarted();
    }),
  });
  await started;

  const downgrade = reconcileOfflineLibrary({
    userId: 'u1', effectivePremium: false, savedItems: [], store,
  });
  releases.forEach((release) => release());
  await Promise.all([download, downgrade]);

  expect(await store.getPackage('u1', 'story-1')).toBeNull();
});

test('premium reconciliation removes unsaved packages and retries failed saved packages', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  const retryContent = {
    ...sampleContentWithVoices(),
    id: 'retry-me',
    title: 'Retry Me',
  };
  await store.putPackage({
    key: 'u1:retry-me',
    userId: 'u1',
    contentId: 'retry-me',
    content: retryContent,
    voiceId: 'female_2',
    state: 'failed',
  });
  await store.putPackage({
    key: 'u1:stale-failed',
    userId: 'u1',
    contentId: 'stale-failed',
    content: { ...retryContent, id: 'stale-failed' },
    state: 'failed',
  });

  await reconcileOfflineLibrary({
    userId: 'u1',
    effectivePremium: true,
    savedItems: [retryContent],
    store,
    fetchImpl: fetchBlob,
  });

  expect(await store.getPackage('u1', 'story-1')).toBeNull();
  expect(await store.getPackage('u1', 'stale-failed')).toBeNull();
  expect(await store.getPackage('u1', 'retry-me')).toMatchObject({ state: 'ready' });
  expect(await store.getEntitlementLease('u1')).toMatchObject({ effectivePremium: true });
});

test('offline saved items include only complete ready packages', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  await store.putPackage({
    key: 'u1:incomplete',
    userId: 'u1',
    contentId: 'incomplete',
    content: { id: 'incomplete', title: 'Incomplete' },
    state: 'ready',
    audioBlob: new Blob(['audio']),
  });

  await expect(getOfflineSavedItems('u1', store)).resolves.toEqual([
    expect.objectContaining({ id: 'story-1', offlineReady: true }),
  ]);
});

test('purge rejects package work that captured its epoch before opening the store', async () => {
  const store = memoryStore();
  const sessionEpoch = captureOfflineUserEpoch('late-save-user');
  let releaseStore;
  const storeOpening = new Promise((resolve) => {
    releaseStore = () => resolve(store);
  });
  const purge = purgeOfflineUser('late-save-user', () => storeOpening);
  const fetchImpl = jest.fn(fetchBlob);

  const queued = await queueOfflinePackage({
    userId: 'late-save-user',
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    sessionEpoch,
    store,
    fetchImpl,
  });
  releaseStore();
  await purge;

  expect(queued).toBeNull();
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(await store.getPackage('late-save-user', 'story-1')).toBeNull();
});

test('offline item reads stop when the active user changes while packages are loading', async () => {
  let activeUser = { uid: 'read-u1' };
  let releasePackages;
  const packages = new Promise((resolve) => {
    releasePackages = () => resolve([{
      userId: 'read-u1',
      contentId: 'story-1',
      state: 'ready',
      content: { id: 'story-1' },
      audioBlob: new Blob(['audio']),
      coverBlob: new Blob(['cover']),
    }]);
  });
  const loading = getOfflineSavedItems('read-u1', {
    listReadyPackages: () => packages,
  }, {
    getCurrentUser: () => activeUser,
  });
  activeUser = { uid: 'read-u2' };
  releasePackages();

  await expect(loading).resolves.toEqual([]);
});

test('persisted epoch initializes a reload and logout purges prior-session records', async () => {
  const values = new Map([['dv_offline_epoch:reload-user', '41']]);
  const previousStorage = Object.getOwnPropertyDescriptor(global, 'localStorage');
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  });
  const store = memoryStore();
  await store.putPackage({
    key: 'reload-user:story-1',
    userId: 'reload-user',
    contentId: 'story-1',
    sessionEpoch: 41,
    state: 'ready',
  });
  await store.setEntitlementLease('reload-user', true, 100, 41);

  expect(captureOfflineUserEpoch('reload-user')).toBe(41);
  await purgeOfflineUser('reload-user', async () => store);

  const logoutVersion = Number(values.get('dv_offline_epoch:reload-user'));
  expect(logoutVersion).toBeGreaterThan(41);
  expect(await store.getPackage('reload-user', 'story-1')).toBeNull();
  expect(await store.getEntitlementLease('reload-user')).toMatchObject({
    effectivePremium: false,
    authorityVersion: logoutVersion,
  });
  if (previousStorage) Object.defineProperty(global, 'localStorage', previousStorage);
  else delete global.localStorage;
});

test('two stores allocate unique durable authority versions for the same user', async () => {
  const db = sharedMemoryDb();
  const storeA = createOfflineStore(db);
  const storeB = createOfflineStore(db);

  const [freeVersion, premiumVersion] = await Promise.all([
    storeA.advanceAuthority('two-tab-version-user', false),
    storeB.advanceAuthority('two-tab-version-user', true),
  ]);

  expect(new Set([freeVersion, premiumVersion]).size).toBe(2);
  await expect(storeA.getAuthorityVersion('two-tab-version-user'))
    .resolves.toBe(Math.max(freeVersion, premiumVersion));
});

test('tab A stale free cleanup cannot purge tab B premium package', async () => {
  const db = sharedMemoryDb();
  const storeA = createOfflineStore(db);
  const storeB = createOfflineStore(db);
  const purgePackages = storeA.purgePackages;
  let rejectFirstCleanup = true;
  storeA.purgePackages = async (...args) => {
    if (rejectFirstCleanup) {
      rejectFirstCleanup = false;
      throw new Error('busy');
    }
    return purgePackages(...args);
  };
  const callbacks = [];
  const runnerA = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'two-tab-cleanup-user' }),
    isAuthenticated: () => true,
    api: {
      getUserSaves: jest.fn().mockResolvedValue({
        items: [], effective_premium: false, save_cap: 5,
      }),
    },
    openStore: async () => storeA,
    scheduleRetry: (callback) => callbacks.push(callback),
    dedupeMs: 0,
  });
  const runnerB = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: 'two-tab-cleanup-user' }),
    isAuthenticated: () => true,
    api: {
      getUserSaves: jest.fn().mockResolvedValue({
        items: [], effective_premium: true, save_cap: 30,
      }),
    },
    openStore: async () => storeB,
    dedupeMs: 0,
  });

  await runnerA();
  expect(callbacks).toHaveLength(1);
  await runnerB();
  const premiumVersion = await storeB.getAuthorityVersion('two-tab-cleanup-user');
  await queueOfflinePackage({
    userId: 'two-tab-cleanup-user',
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    sessionEpoch: premiumVersion,
    store: storeB,
    fetchImpl: fetchBlob,
  });
  await callbacks.shift()();

  await expect(storeB.getPackage('two-tab-cleanup-user', 'story-1'))
    .resolves.toMatchObject({ state: 'ready', sessionEpoch: premiumVersion });
  await expect(storeB.getEntitlementLease('two-tab-cleanup-user'))
    .resolves.toMatchObject({ effectivePremium: true, authorityVersion: premiumVersion });
});

test('tab A delayed logout purge cannot delete tab B fresh premium package', async () => {
  const db = sharedMemoryDb();
  const storeA = createOfflineStore(db);
  const storeB = createOfflineStore(db);
  const userId = 'two-tab-logout-user';
  let releasePurge;
  const purgeGate = new Promise((resolve) => {
    releasePurge = resolve;
  });
  let purgeStarted;
  const started = new Promise((resolve) => {
    purgeStarted = resolve;
  });
  const purgeUser = storeA.purgeUser;
  storeA.purgeUser = async (...args) => {
    purgeStarted(args[1]);
    await purgeGate;
    return purgeUser(...args);
  };

  const logout = purgeOfflineUser(userId, async () => storeA);
  const logoutVersion = await started;
  activateOfflineUserSession(userId);
  const runnerB = createOfflineReconciliationRunner({
    getCurrentUser: () => ({ uid: userId }),
    isAuthenticated: () => true,
    api: {
      getUserSaves: jest.fn().mockResolvedValue({
        items: [], effective_premium: true, save_cap: 30,
      }),
    },
    openStore: async () => storeB,
    dedupeMs: 0,
  });

  await runnerB();
  const premiumVersion = await storeB.getAuthorityVersion(userId);
  expect(premiumVersion).toBeGreaterThan(logoutVersion);
  await queueOfflinePackage({
    userId,
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    sessionEpoch: premiumVersion,
    store: storeB,
    fetchImpl: fetchBlob,
  });
  releasePurge();
  await logout;

  await expect(storeB.getPackage(userId, 'story-1')).resolves.toMatchObject({
    state: 'ready',
    authorityVersion: premiumVersion,
  });
  await expect(storeB.getEntitlementLease(userId)).resolves.toMatchObject({
    effectivePremium: true,
    authorityVersion: premiumVersion,
  });
});
