export const packageKey = (userId, contentId) => `${userId}:${contentId}`;

const adapterAuthorityQueues = new WeakMap();

function authorityVersionOf(record) {
  const version = Number(record?.authorityVersion ?? record?.sessionEpoch);
  return Number.isFinite(version) && version >= 0 ? version : 0;
}

function withAuthorityLock(dbAdapter, userId, work) {
  let queues = adapterAuthorityQueues.get(dbAdapter);
  if (!queues) {
    queues = new Map();
    adapterAuthorityQueues.set(dbAdapter, queues);
  }
  const previous = queues.get(userId) || Promise.resolve();
  const next = previous.catch(() => null).then(work);
  queues.set(userId, next);
  return next.finally(() => {
    if (queues.get(userId) === next) queues.delete(userId);
  });
}

export function createOfflineStore(dbAdapter) {
  const deleteIfEpochAtMost = async (storeName, key, userId, maxSessionEpoch) => {
    if (maxSessionEpoch == null) return dbAdapter.delete(storeName, key);
    if (dbAdapter.deleteIfEpochAtMost) {
      return dbAdapter.deleteIfEpochAtMost(storeName, key, userId, maxSessionEpoch);
    }
    const current = await dbAdapter.get(storeName, key);
    if (current?.userId === userId
      && (current.sessionEpoch == null || current.sessionEpoch <= maxSessionEpoch)) {
      await dbAdapter.delete(storeName, key);
    }
  };
  const currentAuthority = async (userId) => dbAdapter.get('entitlements', userId);
  const authorityMatches = (
    lease,
    authorityVersion,
    requirePremium = false,
    allowMissing = false,
  ) =>
    (!lease && allowMissing)
      || (authorityVersionOf(lease) === authorityVersion
      && (!requirePremium || !lease || lease.effectivePremium === true));
  const purgeRecordsIfAuthority = async (userId, cutoff, authorityVersion) => {
    if (dbAdapter.purgePackagesIfAuthority) {
      return dbAdapter.purgePackagesIfAuthority(userId, cutoff, authorityVersion);
    }
    return withAuthorityLock(dbAdapter, userId, async () => {
      if (!authorityMatches(await currentAuthority(userId), authorityVersion)) return false;
      const records = await dbAdapter.getAll('packages');
      for (const record of records.filter((candidate) => candidate.userId === userId)) {
        if (!authorityMatches(await currentAuthority(userId), authorityVersion)) return false;
        const current = await dbAdapter.get('packages', record.key);
        if (current?.userId === userId && authorityVersionOf(current) <= cutoff) {
          await dbAdapter.delete('packages', record.key);
        }
      }
      return true;
    });
  };
  return {
    putPackage: (record) => dbAdapter.put('packages', record),
    putPackageIfAuthority: (record, authorityVersion) => {
      const versionedRecord = {
        ...record,
        sessionEpoch: authorityVersion,
        authorityVersion,
      };
      if (dbAdapter.putPackageIfAuthority) {
        return dbAdapter.putPackageIfAuthority(versionedRecord, authorityVersion);
      }
      return withAuthorityLock(dbAdapter, record.userId, async () => {
        if (!authorityMatches(
          await currentAuthority(record.userId), authorityVersion, true, true,
        )) return false;
        await dbAdapter.put('packages', versionedRecord);
        return true;
      });
    },
    getPackage: (userId, contentId) => dbAdapter.get('packages', packageKey(userId, contentId)),
    listReadyPackages: async (userId) =>
      (await dbAdapter.getAll('packages')).filter((record) =>
        record.userId === userId && record.state === 'ready'),
    listPackages: async (userId) =>
      (await dbAdapter.getAll('packages')).filter((record) => record.userId === userId),
    deletePackage: (userId, contentId) => dbAdapter.delete('packages', packageKey(userId, contentId)),
    deletePackageIfAuthority: (userId, contentId, authorityVersion) => {
      if (dbAdapter.deletePackageIfAuthority) {
        return dbAdapter.deletePackageIfAuthority(
          userId, contentId, authorityVersion, authorityVersion,
        );
      }
      return withAuthorityLock(dbAdapter, userId, async () => {
        if (!authorityMatches(
          await currentAuthority(userId), authorityVersion, false, true,
        )) return false;
        const key = packageKey(userId, contentId);
        const record = await dbAdapter.get('packages', key);
        if (record?.userId === userId
          && authorityVersionOf(record) <= authorityVersion) {
          await dbAdapter.delete('packages', key);
        }
        return true;
      });
    },
    purgePackages: async (
      userId,
      maxSessionEpoch = null,
      authorityVersion = maxSessionEpoch,
    ) => {
      if (maxSessionEpoch != null && authorityVersion != null) {
        return purgeRecordsIfAuthority(userId, maxSessionEpoch, authorityVersion);
      }
      const records = await dbAdapter.getAll('packages');
      await Promise.all(records
        .filter((record) => record.userId === userId)
        .map((record) => deleteIfEpochAtMost(
          'packages', record.key, userId, maxSessionEpoch,
        )));
    },
    purgeUser: async (
      userId,
      maxSessionEpoch = null,
      authorityVersion = maxSessionEpoch,
    ) => {
      if (maxSessionEpoch != null && authorityVersion != null) {
        return purgeRecordsIfAuthority(userId, maxSessionEpoch, authorityVersion);
      }
      const records = await dbAdapter.getAll('packages');
      await Promise.all(records
        .filter((record) => record.userId === userId)
        .map((record) => deleteIfEpochAtMost(
          'packages', record.key, userId, maxSessionEpoch,
        )));
      await deleteIfEpochAtMost('entitlements', userId, userId, maxSessionEpoch);
    },
    advanceAuthority: async (
      userId,
      effectivePremium,
      confirmedAt = Date.now(),
      minimumVersion = 0,
    ) => {
      if (dbAdapter.advanceAuthority) {
        return dbAdapter.advanceAuthority(
          userId, effectivePremium, confirmedAt, minimumVersion,
        );
      }
      return withAuthorityLock(dbAdapter, userId, async () => {
        const current = await currentAuthority(userId);
        const authorityVersion = Math.max(
          authorityVersionOf(current),
          Number.isFinite(Number(minimumVersion)) ? Number(minimumVersion) : 0,
        ) + 1;
        await dbAdapter.put('entitlements', {
          ...current,
          userId,
          effectivePremium,
          confirmedAt,
          sessionEpoch: authorityVersion,
          authorityVersion,
        });
        return authorityVersion;
      });
    },
    getAuthorityVersion: async (userId) => authorityVersionOf(await currentAuthority(userId)),
    isAuthorityCurrent: async (userId, authorityVersion) =>
      authorityMatches(await currentAuthority(userId), authorityVersion),
    setEntitlementLease: (userId, effectivePremium, confirmedAt = Date.now(), sessionEpoch = null) =>
      withAuthorityLock(dbAdapter, userId, async () => {
        const current = await currentAuthority(userId);
        const authorityVersion = sessionEpoch == null
          ? authorityVersionOf(current)
          : Math.max(authorityVersionOf(current), sessionEpoch);
        await dbAdapter.put('entitlements', {
          ...current,
          userId,
          effectivePremium,
          confirmedAt,
          sessionEpoch: authorityVersion,
          authorityVersion,
        });
      }),
    setEntitlementLeaseIfAuthority: (
      userId,
      effectivePremium,
      confirmedAt,
      authorityVersion,
    ) => {
      if (dbAdapter.setEntitlementLeaseIfAuthority) {
        return dbAdapter.setEntitlementLeaseIfAuthority(
          userId, effectivePremium, confirmedAt, authorityVersion,
        );
      }
      return withAuthorityLock(dbAdapter, userId, async () => {
        const current = await currentAuthority(userId);
        if (!authorityMatches(current, authorityVersion)) return false;
        await dbAdapter.put('entitlements', {
          ...current,
          userId,
          effectivePremium,
          confirmedAt,
          sessionEpoch: authorityVersion,
          authorityVersion,
        });
        return true;
      });
    },
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
  const transactionResult = (storeNames, start) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, 'readwrite');
    let result = null;
    start(transaction, (value) => {
      result = value;
    });
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
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
    advanceAuthority: (userId, effectivePremium, confirmedAt, minimumVersion) =>
      transactionResult('entitlements', (transaction, setResult) => {
        const store = transaction.objectStore('entitlements');
        const request = store.get(userId);
        request.onsuccess = () => {
          const current = request.result;
          const authorityVersion = Math.max(
            authorityVersionOf(current),
            Number.isFinite(Number(minimumVersion)) ? Number(minimumVersion) : 0,
          ) + 1;
          store.put({
            ...current,
            userId,
            effectivePremium,
            confirmedAt,
            sessionEpoch: authorityVersion,
            authorityVersion,
          });
          setResult(authorityVersion);
        };
      }),
    putPackageIfAuthority: (record, authorityVersion) =>
      transactionResult(['entitlements', 'packages'], (transaction, setResult) => {
        const entitlementStore = transaction.objectStore('entitlements');
        const request = entitlementStore.get(record.userId);
        request.onsuccess = () => {
          const lease = request.result;
          if (authorityVersionOf(lease) !== authorityVersion
            || (lease && lease.effectivePremium !== true)) {
            setResult(false);
            return;
          }
          transaction.objectStore('packages').put(record);
          setResult(true);
        };
      }),
    deletePackageIfAuthority: (userId, contentId, cutoff, authorityVersion) =>
      transactionResult(['entitlements', 'packages'], (transaction, setResult) => {
        const request = transaction.objectStore('entitlements').get(userId);
        request.onsuccess = () => {
          if (authorityVersionOf(request.result) !== authorityVersion) {
            setResult(false);
            return;
          }
          const packageStore = transaction.objectStore('packages');
          const key = packageKey(userId, contentId);
          const packageRequest = packageStore.get(key);
          packageRequest.onsuccess = () => {
            const record = packageRequest.result;
            if (record?.userId === userId && authorityVersionOf(record) <= cutoff) {
              packageStore.delete(key);
            }
            setResult(true);
          };
        };
      }),
    purgePackagesIfAuthority: (userId, cutoff, authorityVersion) =>
      transactionResult(['entitlements', 'packages'], (transaction, setResult) => {
        const request = transaction.objectStore('entitlements').get(userId);
        request.onsuccess = () => {
          if (authorityVersionOf(request.result) !== authorityVersion) {
            setResult(false);
            return;
          }
          const packageStore = transaction.objectStore('packages');
          const packagesRequest = packageStore.getAll();
          packagesRequest.onsuccess = () => {
            packagesRequest.result
              .filter((record) => record.userId === userId
                && authorityVersionOf(record) <= cutoff)
              .forEach((record) => packageStore.delete(record.key));
            setResult(true);
          };
        };
      }),
    setEntitlementLeaseIfAuthority: (
      userId,
      effectivePremium,
      confirmedAt,
      authorityVersion,
    ) => transactionResult('entitlements', (transaction, setResult) => {
      const store = transaction.objectStore('entitlements');
      const request = store.get(userId);
      request.onsuccess = () => {
        const current = request.result;
        if (authorityVersionOf(current) !== authorityVersion) {
          setResult(false);
          return;
        }
        store.put({
          ...current,
          userId,
          effectivePremium,
          confirmedAt,
          sessionEpoch: authorityVersion,
          authorityVersion,
        });
        setResult(true);
      };
    }),
    deleteIfEpochAtMost: (storeName, key, userId, maxSessionEpoch) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        const objectStore = transaction.objectStore(storeName);
        const getRequest = objectStore.get(key);
        getRequest.onsuccess = () => {
          const current = getRequest.result;
          if (current?.userId === userId
            && (current.sessionEpoch == null || current.sessionEpoch <= maxSessionEpoch)) {
            objectStore.delete(key);
          }
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      }),
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
