export const packageKey = (userId, contentId) => `${userId}:${contentId}`;

export function createOfflineStore(dbAdapter) {
  return {
    putPackage: (record) => dbAdapter.put('packages', record),
    getPackage: (userId, contentId) => dbAdapter.get('packages', packageKey(userId, contentId)),
    listReadyPackages: async (userId) =>
      (await dbAdapter.getAll('packages')).filter((record) =>
        record.userId === userId && record.state === 'ready'),
    listPackages: async (userId) =>
      (await dbAdapter.getAll('packages')).filter((record) => record.userId === userId),
    deletePackage: (userId, contentId) => dbAdapter.delete('packages', packageKey(userId, contentId)),
    purgeUser: async (userId) => {
      const records = await dbAdapter.getAll('packages');
      await Promise.all(records
        .filter((record) => record.userId === userId)
        .map((record) => dbAdapter.delete('packages', record.key)));
      await dbAdapter.delete('entitlements', userId);
    },
    setEntitlementLease: (userId, effectivePremium, confirmedAt = Date.now(), sessionEpoch = null) =>
      dbAdapter.put('entitlements', { userId, effectivePremium, confirmedAt, sessionEpoch }),
    getEntitlementLease: (userId) => dbAdapter.get('entitlements', userId),
    deleteEntitlementLease: (userId) => dbAdapter.delete('entitlements', userId),
  };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

function createIndexedDbAdapter(database) {
  return {
    put: (storeName, value) => requestResult(
      database.transaction(storeName, 'readwrite').objectStore(storeName).put(value),
    ),
    get: (storeName, key) => requestResult(
      database.transaction(storeName).objectStore(storeName).get(key),
    ),
    getAll: (storeName) => requestResult(
      database.transaction(storeName).objectStore(storeName).getAll(),
    ),
    delete: (storeName, key) => requestResult(
      database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key),
    ),
  };
}

export function openOfflineStore(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl) {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open('dv-offline-library', 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('packages')) {
        database.createObjectStore('packages', { keyPath: 'key' });
      }
      if (!database.objectStoreNames.contains('entitlements')) {
        database.createObjectStore('entitlements', { keyPath: 'userId' });
      }
    };
    request.onsuccess = () => resolve(createOfflineStore(createIndexedDbAdapter(request.result)));
    request.onerror = () => reject(request.error);
  });
}
