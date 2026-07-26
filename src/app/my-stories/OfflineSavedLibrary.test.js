import { loadSavedLibrary } from '@/utils/offlineLibrary';

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
    purgeUser: jest.fn().mockResolvedValue(undefined),
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
  expect(store.purgeUser).toHaveBeenCalledWith('u1');
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
