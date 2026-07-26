import { createOfflineReconciliationRunner } from '@/utils/offlineLibrary';

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
