import { openOfflineStore, packageKey } from './offlineStore';

const packageGenerations = new Map();
const packageWrites = new Map();
const userSessions = new Map();
const entitlementWrites = new Map();
let sharedOfflineReconciliationRunner = null;

const epochKey = (userId) => `dv_offline_epoch:${userId}`;
const revocationKey = (userId) => `dv_offline_revoked:${userId}`;

function offlineStorage() {
  if (typeof window !== 'undefined') return window.localStorage;
  return Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.value || null;
}

function readStoredNumber(key) {
  try {
    const value = Number(offlineStorage()?.getItem(key));
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeStoredNumber(key, value) {
  try {
    offlineStorage()?.setItem(key, String(value));
  } catch {
  }
}

function currentUserSession(userId) {
  const current = userSessions.get(userId);
  const storedEpoch = readStoredNumber(epochKey(userId));
  if (!current || storedEpoch > current.epoch) {
    const session = { epoch: storedEpoch, active: current?.active !== false };
    userSessions.set(userId, session);
    return session;
  }
  return current;
}

export function captureOfflineUserEpoch(userId) {
  return currentUserSession(userId).epoch;
}

function isCurrentOfflineUserEpoch(userId, sessionEpoch) {
  const session = currentUserSession(userId);
  return session.active && session.epoch === sessionEpoch;
}

function advanceOfflineUserEpoch(userId, active) {
  const epoch = currentUserSession(userId).epoch + 1;
  userSessions.set(userId, { epoch, active });
  writeStoredNumber(epochKey(userId), epoch);
  const prefix = `${userId}:`;
  for (const [key, generation] of packageGenerations) {
    if (key.startsWith(prefix)) packageGenerations.set(key, generation + 1);
  }
  return epoch;
}

function markOfflineUserRevoked(userId, sessionEpoch) {
  writeStoredNumber(revocationKey(userId), sessionEpoch);
}

function clearOfflineUserRevocation(userId) {
  try {
    offlineStorage()?.removeItem(revocationKey(userId));
  } catch {
  }
}

function isOfflineUserRevoked(userId) {
  try {
    return offlineStorage()?.getItem(revocationKey(userId)) != null;
  } catch {
    return false;
  }
}

function prepareOfflineAuthority(userId, effectivePremium, sessionEpoch) {
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
  if (effectivePremium === true) {
    clearOfflineUserRevocation(userId);
    return sessionEpoch;
  }
  const authoritativeEpoch = advanceOfflineUserEpoch(userId, true);
  markOfflineUserRevoked(userId, authoritativeEpoch);
  return authoritativeEpoch;
}

export function activateOfflineUserSession(userId) {
  if (!userId) return null;
  const session = currentUserSession(userId);
  if (session.active) return session.epoch;
  return advanceOfflineUserEpoch(userId, true);
}

function getAssetDirectory(content, assetType) {
  if (content.type === 'poem') return `${assetType}/poems${content.lang === 'hi' ? '-hi' : ''}`;
  if (content.subtype === 'silly_song') return `${assetType}/silly-songs${content.lang === 'hi' ? '-hi' : ''}`;
  if (content.subtype === 'funny_short') return `${assetType}/funny-shorts${content.lang === 'hi' ? '-hi' : ''}`;
  return null;
}

function getAudioFileUrl(content) {
  const directory = getAssetDirectory(content, 'audio');
  return directory && content.audio_file ? `/${directory}/${content.audio_file}` : null;
}

export function getOfflineCoverUrl(content) {
  if (content.cover || content.cover_url) return content.cover || content.cover_url;
  const directory = getAssetDirectory(content, 'covers');
  return directory && content.cover_file ? `/${directory}/${content.cover_file}` : null;
}

function writeCurrentPackage({ key, generation, userId, sessionEpoch, store, record }) {
  const previousWrite = packageWrites.get(key) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => null).then(async () => {
    if (packageGenerations.get(key) !== generation
      || !isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
    await store.putPackage(record);
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) {
      await store.deletePackage(userId, record.contentId);
      return null;
    }
    return record;
  });
  packageWrites.set(key, nextWrite);
  return nextWrite;
}

function writeCurrentEntitlementLease({ userId, sessionEpoch, effectivePremium, store }) {
  const previousWrite = entitlementWrites.get(userId) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => null).then(async () => {
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return false;
    await store.setEntitlementLease(userId, effectivePremium, Date.now(), sessionEpoch);
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) {
      const lease = await store.getEntitlementLease(userId);
      if (lease?.sessionEpoch === sessionEpoch) {
        await store.deleteEntitlementLease(userId);
      }
      return false;
    }
    return true;
  });
  entitlementWrites.set(userId, nextWrite);
  return nextWrite;
}

export function selectOfflineAudio(content, selectedVoice) {
  const variants = content.audio_variants || [];
  const selected = variants.find((variant) => variant.voice === selectedVoice) || variants[0];
  return {
    voiceId: selected?.voice || selectedVoice || 'default',
    audioUrl: selected?.url || content.audio_url || getAudioFileUrl(content),
  };
}

export async function queueOfflinePackage({
  userId,
  content,
  selectedVoice,
  sessionEpoch = captureOfflineUserEpoch(userId),
  store,
  fetchImpl,
}) {
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
  const { voiceId, audioUrl } = selectOfflineAudio(content, selectedVoice);
  const coverUrl = getOfflineCoverUrl(content);
  const key = packageKey(userId, content.id);
  const generation = (packageGenerations.get(key) || 0) + 1;
  packageGenerations.set(key, generation);
  const baseRecord = {
    key,
    userId,
    contentId: content.id,
    content,
    sessionEpoch,
    voiceId,
    audioSourceUrl: audioUrl || null,
    coverSourceUrl: coverUrl || null,
  };

  const pendingRecord = await writeCurrentPackage({
    key,
    generation,
    userId,
    sessionEpoch,
    store,
    record: { ...baseRecord, state: 'pending' },
  });
  if (!pendingRecord || !isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;

  try {
    if (!audioUrl || !coverUrl) throw new Error('Offline package sources are unavailable');
    const [audioResponse, coverResponse] = await Promise.all([
      fetchImpl(audioUrl),
      fetchImpl(coverUrl),
    ]);
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
    if (!audioResponse.ok || !coverResponse.ok) throw new Error('Offline package download failed');
    const [audioBlob, coverBlob] = await Promise.all([
      audioResponse.blob(),
      coverResponse.blob(),
    ]);
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
    if (!audioBlob || !coverBlob) throw new Error('Offline package download was incomplete');

    const readyRecord = { ...baseRecord, state: 'ready', audioBlob, coverBlob };
    return await writeCurrentPackage({
      key, generation, userId, sessionEpoch, store, record: readyRecord,
    });
  } catch (error) {
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
    const failedRecord = { ...baseRecord, state: 'failed', error: error.message };
    return await writeCurrentPackage({
      key, generation, userId, sessionEpoch, store, record: failedRecord,
    });
  }
}

export function removeOfflinePackage({ userId, contentId, store }) {
  const key = packageKey(userId, contentId);
  packageGenerations.set(key, (packageGenerations.get(key) || 0) + 1);
  const previousWrite = packageWrites.get(key) || Promise.resolve();
  const deletion = previousWrite.catch(() => null).then(() => store.deletePackage(userId, contentId));
  packageWrites.set(key, deletion);
  return deletion;
}

export async function getReadyOfflinePackage({
  userId,
  contentId,
  store,
  sessionEpoch = captureOfflineUserEpoch(userId),
}) {
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
  const record = await store.getPackage(userId, contentId);
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
  if (record?.state !== 'ready' || !record.content || !record.audioBlob || !record.coverBlob) {
    return null;
  }
  return record;
}

export async function resolveOfflinePackage({ userId, contentId, selectedVoice, store, urlApi = globalThis.URL }) {
  const record = await getReadyOfflinePackage({ userId, contentId, store });
  if (!record || record.voiceId !== selectedVoice) return null;
  if (!urlApi?.createObjectURL || !urlApi?.revokeObjectURL) return null;

  const audioUrl = urlApi.createObjectURL(record.audioBlob);
  const coverUrl = urlApi.createObjectURL(record.coverBlob);
  let revoked = false;
  return {
    content: record.content,
    audioUrl,
    coverUrl,
    revoke: () => {
      if (revoked) return;
      revoked = true;
      urlApi.revokeObjectURL(audioUrl);
      urlApi.revokeObjectURL(coverUrl);
    },
  };
}

export async function getOfflineSavedItems(userId, store, {
  getCurrentUser,
  sessionEpoch = captureOfflineUserEpoch(userId),
} = {}) {
  const activeUserId = () => {
    const user = getCurrentUser?.();
    return user?.uid || user?.family_id || user?.username;
  };
  const isCurrentRead = () => isCurrentOfflineUserEpoch(userId, sessionEpoch)
    && (!getCurrentUser || activeUserId() === userId);
  if (!isCurrentRead()) return [];
  const offlineStore = store || await openOfflineStore();
  if (!isCurrentRead()) return [];
  const packages = await offlineStore.listReadyPackages(userId);
  if (!isCurrentRead()) return [];
  return packages
    .filter((record) => record.content && record.audioBlob && record.coverBlob)
    .map((record) => ({
      ...record.content,
      id: record.content.id || record.contentId,
      offlineReady: true,
    }));
}

export async function reconcileOfflineLibrary({
  userId,
  effectivePremium,
  savedItems,
  store,
  sessionEpoch = captureOfflineUserEpoch(userId),
  cleanupOnly = false,
  authorityPrepared = false,
  fetchImpl = globalThis.fetch,
}) {
  if (!userId || !store || !isCurrentOfflineUserEpoch(userId, sessionEpoch)) return;

  if (effectivePremium !== true) {
    if (!cleanupOnly) {
      if (!authorityPrepared) {
        sessionEpoch = prepareOfflineAuthority(userId, false, sessionEpoch);
      }
      if (sessionEpoch == null) return null;
      let written;
      try {
        written = await writeCurrentEntitlementLease({
          userId, sessionEpoch, effectivePremium: false, store,
        });
      } catch (error) {
        error.offlineSessionEpoch = sessionEpoch;
        error.offlineCleanupOnly = false;
        throw error;
      }
      if (!written) return null;
    }
    try {
      await store.purgePackages(userId, sessionEpoch);
    } catch (error) {
      error.offlineSessionEpoch = sessionEpoch;
      error.offlineCleanupOnly = true;
      throw error;
    }
    return isCurrentOfflineUserEpoch(userId, sessionEpoch) ? sessionEpoch : null;
  }

  if (!cleanupOnly && !authorityPrepared) {
    sessionEpoch = prepareOfflineAuthority(userId, true, sessionEpoch);
  }
  if (sessionEpoch == null) return null;
  if (!await writeCurrentEntitlementLease({
    userId, sessionEpoch, effectivePremium: true, store,
  })) return;
  const items = Array.isArray(savedItems) ? savedItems : [];
  const savedIds = new Set(items.map((item) => item?.id).filter(Boolean));
  const packages = store.listPackages
    ? await store.listPackages(userId)
    : await store.listReadyPackages(userId);
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return;

  await Promise.all(packages
    .filter((record) => !savedIds.has(record.contentId))
    .map((record) => removeOfflinePackage({
      userId,
      contentId: record.contentId,
      store,
    })));

  await Promise.all(items.map(async (content) => {
    if (!content?.id) return;
    const record = await store.getPackage(userId, content.id);
    if (record?.state === 'ready' && record.content && record.audioBlob && record.coverBlob) return;
    await queueOfflinePackage({
      userId,
      content,
      selectedVoice: record?.voiceId || content.selected_voice || content.voice_id,
      sessionEpoch,
      store,
      fetchImpl,
    });
  }));
  return isCurrentOfflineUserEpoch(userId, sessionEpoch) ? sessionEpoch : null;
}

export async function loadSavedLibrary({
  userId,
  api,
  reconciliationRunner,
  getCurrentUser,
  store,
}) {
  const activeUserId = () => {
    const user = getCurrentUser?.();
    return user?.uid || user?.family_id || user?.username;
  };
  const isStaleIdentity = () => getCurrentUser && activeUserId() !== userId;
  const sessionEpoch = captureOfflineUserEpoch(userId);
  const isStaleSession = () => !isCurrentOfflineUserEpoch(userId, sessionEpoch);
  let data;
  try {
    data = reconciliationRunner
      ? await reconciliationRunner()
      : await api.getUserSaves();
    if (!data) throw new Error('Saved library is offline');
  } catch {
    if (isStaleIdentity() || isStaleSession()) {
      return { items: [], effectivePremium: false, saveCap: null, offline: true, stale: true };
    }
    if (isOfflineUserRevoked(userId)) {
      return {
        items: [],
        effectivePremium: false,
        saveCap: null,
        offline: true,
      };
    }
    const lease = await store.getEntitlementLease(userId);
    if (isStaleIdentity() || isStaleSession()) {
      return { items: [], effectivePremium: false, saveCap: null, offline: true, stale: true };
    }
    if (lease?.effectivePremium !== true) {
      return {
        items: [],
        effectivePremium: false,
        saveCap: null,
        offline: true,
      };
    }
    const offlineItems = await getOfflineSavedItems(
      userId,
      store,
      { getCurrentUser, sessionEpoch },
    );
    if (isStaleIdentity() || isStaleSession()) {
      return { items: [], effectivePremium: false, saveCap: null, offline: true, stale: true };
    }
    return {
      items: offlineItems,
      effectivePremium: true,
      saveCap: null,
      offline: true,
    };
  }

  if (isStaleIdentity()) {
    return { items: [], effectivePremium: false, saveCap: null, offline: false, stale: true };
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  const effectivePremium = data?.effective_premium === true;
  if (!reconciliationRunner) {
    try {
      await reconcileOfflineLibrary({
        userId,
        effectivePremium,
        savedItems: items,
        store,
      });
    } catch {
    }
  }
  return {
    items,
    effectivePremium,
    saveCap: typeof data?.save_cap === 'number' ? data.save_cap : null,
    offline: false,
  };
}

export function createOfflineReconciliationRunner({
  getCurrentUser,
  isAuthenticated,
  api,
  openStore,
  reconcile = reconcileOfflineLibrary,
  scheduleRetry = (callback) => setTimeout(callback, 2000),
  now = Date.now,
  dedupeMs = 1000,
}) {
  let inFlight = null;
  let lastResult = null;
  let lastUserId = null;
  let lastSessionEpoch = null;
  let lastCompletedAt = -Infinity;
  let cleanupRetryScheduled = false;
  let cleanupTask = null;
  let authorityVersion = 0;
  let triggerCount = 0;

  const isCleanupCurrent = (task) => {
    if (!task || !isAuthenticated()) return false;
    const user = getCurrentUser();
    const activeUserId = user?.uid || user?.family_id || user?.username;
    return activeUserId === task.userId
      && task.authorityVersion === authorityVersion
      && isCurrentOfflineUserEpoch(task.userId, task.sessionEpoch);
  };

  const scheduleLocalCleanup = (task) => {
    cleanupTask = task;
    if (cleanupRetryScheduled) return;
    cleanupRetryScheduled = true;
    scheduleRetry(async () => {
      cleanupRetryScheduled = false;
      const pending = cleanupTask;
      if (!isCleanupCurrent(pending)) {
        cleanupTask = null;
        return;
      }
      try {
        const store = await openStore();
        if (!isCleanupCurrent(pending)) {
          cleanupTask = null;
          return;
        }
        const reconciledEpoch = await reconcile({
          userId: pending.userId,
          effectivePremium: pending.data?.effective_premium === true,
          savedItems: Array.isArray(pending.data?.items) ? pending.data.items : [],
          sessionEpoch: pending.sessionEpoch,
          cleanupOnly: pending.cleanupOnly,
          authorityPrepared: pending.authorityPrepared,
          store,
        });
        if (typeof reconciledEpoch === 'number') pending.sessionEpoch = reconciledEpoch;
        if (isCleanupCurrent(pending)) cleanupTask = null;
      } catch (error) {
        if (typeof error?.offlineSessionEpoch === 'number') {
          pending.sessionEpoch = error.offlineSessionEpoch;
        }
        if (error?.offlineCleanupOnly === true) pending.cleanupOnly = true;
        if (isCleanupCurrent(pending)) scheduleLocalCleanup(pending);
        else cleanupTask = null;
      }
    });
  };

  const run = ({ force = false } = {}) => {
    triggerCount += 1;
    if (inFlight) return inFlight;
    if (!isAuthenticated()) return Promise.resolve(null);
    const user = getCurrentUser();
    const userId = user?.uid || user?.family_id || user?.username;
    if (!userId) return Promise.resolve(null);
    const sessionEpoch = captureOfflineUserEpoch(userId);
    if (!force && lastResult && lastUserId === userId
      && lastSessionEpoch === sessionEpoch && now() - lastCompletedAt < dedupeMs) {
      return Promise.resolve(lastResult);
    }

    inFlight = (async () => {
      let data;
      try {
        data = await api.getUserSaves();
      } catch {
        lastResult = null;
        lastUserId = null;
        lastSessionEpoch = null;
        return null;
      }
      const confirmedUser = getCurrentUser();
      const confirmedUserId = confirmedUser?.uid || confirmedUser?.family_id || confirmedUser?.username;
      if (!isAuthenticated() || confirmedUserId !== userId
        || !isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
      const preparedEpoch = prepareOfflineAuthority(
        userId,
        data?.effective_premium === true,
        sessionEpoch,
      );
      if (preparedEpoch == null) return null;
      const requestAuthorityVersion = authorityVersion + 1;
      authorityVersion = requestAuthorityVersion;
      cleanupTask = null;

      let appliedEpoch = preparedEpoch;
      try {
        const store = await openStore();
        if (!isCurrentOfflineUserEpoch(userId, preparedEpoch)) return null;
        const reconciledEpoch = await reconcile({
          userId,
          effectivePremium: data?.effective_premium === true,
          savedItems: Array.isArray(data?.items) ? data.items : [],
          sessionEpoch: preparedEpoch,
          authorityPrepared: true,
          store,
        });
        appliedEpoch = typeof reconciledEpoch === 'number'
          ? reconciledEpoch
          : preparedEpoch;
        if (!isCurrentOfflineUserEpoch(userId, appliedEpoch)) return null;
      } catch (error) {
        if (typeof error?.offlineSessionEpoch === 'number') {
          appliedEpoch = error.offlineSessionEpoch;
        }
        if (!isCurrentOfflineUserEpoch(userId, appliedEpoch)) return null;
        scheduleLocalCleanup({
          userId,
          data,
          sessionEpoch: appliedEpoch,
          cleanupOnly: error?.offlineCleanupOnly === true,
          authorityPrepared: true,
          authorityVersion: requestAuthorityVersion,
        });
      }
      lastResult = data;
      lastUserId = userId;
      lastSessionEpoch = appliedEpoch;
      lastCompletedAt = now();
      return data;
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  run.getTriggerCount = () => triggerCount;
  return run;
}

export function getOfflineReconciliationRunner(options) {
  if (!sharedOfflineReconciliationRunner) {
    sharedOfflineReconciliationRunner = createOfflineReconciliationRunner(options);
  }
  return sharedOfflineReconciliationRunner;
}

export async function purgeOfflineUser(userId, openStore = openOfflineStore) {
  if (!userId) return;
  const purgeEpoch = advanceOfflineUserEpoch(userId, false);
  const store = await openStore();
  if (currentUserSession(userId).epoch !== purgeEpoch
    || currentUserSession(userId).active !== false) return;
  const previousEntitlementWrite = entitlementWrites.get(userId) || Promise.resolve();
  const purgeWrite = previousEntitlementWrite.catch(() => null).then(async () => {
    if (currentUserSession(userId).epoch !== purgeEpoch
      || currentUserSession(userId).active !== false) return;
    await store.purgeUser(userId, purgeEpoch);
  });
  entitlementWrites.set(userId, purgeWrite);
  await purgeWrite;
  const writes = [...packageWrites.entries()]
    .filter(([key]) => key.startsWith(`${userId}:`))
    .map(([, write]) => write.catch(() => null));
  const entitlementWrite = entitlementWrites.get(userId);
  if (entitlementWrite) writes.push(entitlementWrite.catch(() => null));
  await Promise.all(writes);
  if (currentUserSession(userId).epoch === purgeEpoch
    && currentUserSession(userId).active === false) {
    await store.purgeUser(userId, purgeEpoch);
  }
}
