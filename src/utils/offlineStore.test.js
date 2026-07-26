import { createOfflineStore } from './offlineStore';

function createMemoryDb() {
  const stores = new Map([
    ['packages', new Map()],
    ['entitlements', new Map()],
  ]);

  return {
    put: async (store, value) => {
      stores.get(store).set(store === 'packages' ? value.key : value.userId, value);
    },
    get: async (store, key) => stores.get(store).get(key) ?? null,
    getAll: async (store) => [...stores.get(store).values()],
    delete: async (store, key) => {
      stores.get(store).delete(key);
    },
  };
}

test('isolates packages by user and returns only ready records', async () => {
  const store = createOfflineStore(createMemoryDb());
  await store.putPackage({ key: 'u1:s1', userId: 'u1', contentId: 's1', state: 'ready' });
  await store.putPackage({ key: 'u2:s1', userId: 'u2', contentId: 's1', state: 'ready' });
  await store.putPackage({ key: 'u1:s2', userId: 'u1', contentId: 's2', state: 'failed' });

  expect((await store.listReadyPackages('u1')).map((x) => x.contentId)).toEqual(['s1']);
});

test('lists every package state for one user', async () => {
  const store = createOfflineStore(createMemoryDb());
  await store.putPackage({ key: 'u1:s1', userId: 'u1', contentId: 's1', state: 'ready' });
  await store.putPackage({ key: 'u1:s2', userId: 'u1', contentId: 's2', state: 'failed' });
  await store.putPackage({ key: 'u2:s1', userId: 'u2', contentId: 's1', state: 'pending' });

  expect((await store.listPackages('u1')).map((record) => record.contentId)).toEqual(['s1', 's2']);
});

test('purges packages and entitlement lease for one user only', async () => {
  const store = createOfflineStore(createMemoryDb());
  await store.putPackage({ key: 'u1:s1', userId: 'u1', contentId: 's1', state: 'ready' });
  await store.putPackage({ key: 'u2:s1', userId: 'u2', contentId: 's1', state: 'ready' });
  await store.setEntitlementLease('u1', true, 100);
  await store.setEntitlementLease('u2', true, 100);
  await store.purgeUser('u1');

  expect(await store.getPackage('u1', 's1')).toBeNull();
  expect(await store.getPackage('u2', 's1')).toMatchObject({ userId: 'u2' });
  expect(await store.getEntitlementLease('u1')).toBeNull();
  expect(await store.getEntitlementLease('u2')).toMatchObject({ effectivePremium: true });
});

test('conditional purge preserves a newer same-key record written after the scan', async () => {
  const records = new Map([
    ['u1:s1', { key: 'u1:s1', userId: 'u1', contentId: 's1', sessionEpoch: 4 }],
  ]);
  let replaced = false;
  const store = createOfflineStore({
    put: async (name, value) => records.set(value.key || value.userId, value),
    get: async (name, key) => name === 'entitlements'
      ? { userId: 'u1', effectivePremium: false, authorityVersion: 5 }
      : records.get(key) ?? null,
    getAll: async (name) => {
      const snapshot = [...records.values()];
      if (name === 'packages' && !replaced) {
        replaced = true;
        records.set('u1:s1', {
          key: 'u1:s1',
          userId: 'u1',
          contentId: 's1',
          sessionEpoch: 6,
        });
      }
      return snapshot;
    },
    delete: async (name, key) => records.delete(key),
    deleteIfEpochAtMost: async (name, key, userId, cutoff) => {
      const current = records.get(key);
      if (current?.userId === userId
        && (current.sessionEpoch == null || current.sessionEpoch <= cutoff)) {
        records.delete(key);
      }
    },
  });

  await store.purgeUser('u1', 5, 5);

  expect(await store.getPackage('u1', 's1')).toMatchObject({ sessionEpoch: 6 });
});
