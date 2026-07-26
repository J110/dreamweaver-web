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
