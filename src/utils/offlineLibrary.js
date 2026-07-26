import { openOfflineStore, packageKey } from './offlineStore';

const packageGenerations = new Map();
const packageWrites = new Map();
const userSessions = new Map();
const entitlementWrites = new Map();
let sharedOfflineReconciliationRunner = null;
const OFFLINE_CHANGE_EVENT = 'dv-offline-library-change';
const OFFLINE_BROADCAST_KEY = 'dv_offline_broadcast';

const epochKey = (userId) => `dv_offline_epoch:${userId}`;
const revocationKey = (userId) => `dv_offline_revoked:${userId}`;

function offlineStorage() {
  if (typeof window !== 'undefined') return window.localStorage;
  return Object.getOwnPropertyDescriptor(globalThis, 'localStorage')?.value || null;
}

function broadcastOfflineLibraryChange(change) {
  const detail = { ...change, emittedAt: Date.now() };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new window.CustomEvent(OFFLINE_CHANGE_EVENT, { detail }));
  }
  try {
    offlineStorage()?.setItem(OFFLINE_BROADCAST_KEY, JSON.stringify(detail));
  } catch {
  }
}

export function subscribeOfflineLibraryChanges(listener) {
  if (typeof window === 'undefined') return () => {};
  const onLocalChange = (event) => listener(event.detail);
  const onStorage = (event) => {
    if (event.key !== OFFLINE_BROADCAST_KEY || !event.newValue) return;
    try {
      listener(JSON.parse(event.newValue));
    } catch {
    }
  };
  window.addEventListener(OFFLINE_CHANGE_EVENT, onLocalChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(OFFLINE_CHANGE_EVENT, onLocalChange);
    window.removeEventListener('storage', onStorage);
  };
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

function writeStoredEpoch(userId, value) {
  const key = epochKey(userId);
  if (readStoredNumber(key) >= value) return;
  writeStoredNumber(key, value);
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
  writeStoredEpoch(userId, epoch);
  const prefix = `${userId}:`;
  for (const [key, generation] of packageGenerations) {
    if (key.startsWith(prefix)) packageGenerations.set(key, generation + 1);
  }
  return epoch;
}

function applyOfflineUserAuthority(userId, authorityVersion, active) {
  const session = currentUserSession(userId);
  if (session.epoch > authorityVersion) return false;
  userSessions.set(userId, { epoch: authorityVersion, active });
  writeStoredEpoch(userId, authorityVersion);
  if (session.epoch !== authorityVersion) {
    const prefix = `${userId}:`;
    for (const [key, generation] of packageGenerations) {
      if (key.startsWith(prefix)) packageGenerations.set(key, generation + 1);
    }
  }
  return true;
}

function markOfflineUserRevoked(userId, sessionEpoch) {
  writeStoredNumber(revocationKey(userId), sessionEpoch);
  broadcastOfflineLibraryChange({
    type: 'authority',
    userId,
    effectivePremium: false,
    authorityVersion: sessionEpoch,
  });
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
  const provisionalEpoch = advanceOfflineUserEpoch(userId, true);
  if (effectivePremium !== true) markOfflineUserRevoked(userId, provisionalEpoch);
  return provisionalEpoch;
}

async function claimOfflineAuthority({
  userId,
  effectivePremium,
  sessionEpoch,
  store,
  active = true,
}) {
  const authorityVersion = store.advanceAuthority
    ? await store.advanceAuthority(userId, effectivePremium, Date.now(), sessionEpoch)
    : sessionEpoch;
  if (!applyOfflineUserAuthority(userId, authorityVersion, active)) return null;
  if (effectivePremium === true) {
    clearOfflineUserRevocation(userId);
  }
  broadcastOfflineLibraryChange({
    type: 'authority',
    userId,
    effectivePremium: effectivePremium === true,
    authorityVersion,
  });
  return authorityVersion;
}

async function isSharedAuthorityCurrent(store, userId, authorityVersion) {
  if (!store.isAuthorityCurrent) return true;
  return store.isAuthorityCurrent(userId, authorityVersion);
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
    const written = store.putPackageIfAuthority
      ? await store.putPackageIfAuthority(record, sessionEpoch)
      : await store.putPackage(record);
    if (written === false) return null;
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) {
      if (store.deletePackageIfAuthority) {
        await store.deletePackageIfAuthority(userId, record.contentId, sessionEpoch);
      }
      return null;
    }
    return record;
  });
  packageWrites.set(key, nextWrite);
  return nextWrite.finally(() => {
    if (packageWrites.get(key) === nextWrite) packageWrites.delete(key);
  });
}

function writeCurrentEntitlementLease({ userId, sessionEpoch, effectivePremium, store }) {
  const previousWrite = entitlementWrites.get(userId) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => null).then(async () => {
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return false;
    const written = store.setEntitlementLeaseIfAuthority
      ? await store.setEntitlementLeaseIfAuthority(
        userId, effectivePremium, Date.now(), sessionEpoch,
      )
      : await store.setEntitlementLease(userId, effectivePremium, Date.now(), sessionEpoch);
    if (written === false) return false;
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) {
      return false;
    }
    return true;
  });
  entitlementWrites.set(userId, nextWrite);
  return nextWrite.finally(() => {
    if (entitlementWrites.get(userId) === nextWrite) entitlementWrites.delete(userId);
  });
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
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch) || isOfflineUserRevoked(userId)) return null;
  const lease = store.getEntitlementLease
    ? await store.getEntitlementLease(userId)
    : null;
  if (lease?.effectivePremium === false) return null;
  if (!lease) {
    const provisionalEpoch = prepareOfflineAuthority(userId, true, sessionEpoch);
    if (provisionalEpoch == null) return null;
    sessionEpoch = await claimOfflineAuthority({
      userId,
      effectivePremium: true,
      sessionEpoch: provisionalEpoch,
      store,
    });
    if (sessionEpoch == null) return null;
  }
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch) || isOfflineUserRevoked(userId)) return null;
  if (store.isAuthorityCurrent
    && !await store.isAuthorityCurrent(userId, sessionEpoch)) return null;
  if (store.getTombstone && await store.getTombstone(userId, content.id)) {
    const cleared = store.clearTombstoneIfAuthority
      ? await store.clearTombstoneIfAuthority(userId, content.id, sessionEpoch)
      : false;
    if (cleared === false) return null;
  }
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
    authorityVersion: sessionEpoch,
    hidden: false,
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
    const ready = await writeCurrentPackage({
      key, generation, userId, sessionEpoch, store, record: readyRecord,
    });
    if (ready) {
      broadcastOfflineLibraryChange({
        type: 'package',
        userId,
        contentId: content.id,
        voiceId,
      });
    }
    return ready;
  } catch (error) {
    if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)) return null;
    const failedRecord = { ...baseRecord, state: 'failed', error: error.message };
    return await writeCurrentPackage({
      key, generation, userId, sessionEpoch, store, record: failedRecord,
    });
  }
}

export function removeOfflinePackage({
  userId,
  contentId,
  store,
  sessionEpoch = captureOfflineUserEpoch(userId),
  authorityPrepared = false,
}) {
  const key = packageKey(userId, contentId);
  packageGenerations.set(key, (packageGenerations.get(key) || 0) + 1);
  const previousWrite = packageWrites.get(key) || Promise.resolve();
  const deletion = previousWrite.catch(() => null).then(async () => {
    let removalEpoch = sessionEpoch;
    const lease = store.getEntitlementLease
      ? await store.getEntitlementLease(userId)
      : null;
    if (!authorityPrepared && lease?.effectivePremium === true && store.advanceAuthority) {
      removalEpoch = await store.advanceAuthority(userId, true, Date.now(), sessionEpoch);
      if (!applyOfflineUserAuthority(userId, removalEpoch, true)) return false;
      broadcastOfflineLibraryChange({
        type: 'authority',
        userId,
        effectivePremium: true,
        authorityVersion: removalEpoch,
      });
    }
    const record = await store.getPackage(userId, contentId);
    const tombstone = {
      key,
      userId,
      contentId,
      sessionEpoch: removalEpoch,
      authorityVersion: removalEpoch,
      state: 'tombstone',
      hidden: true,
      tombstonedAt: Date.now(),
    };
    const tombstoneWritten = store.putTombstoneIfAuthority
      ? await store.putTombstoneIfAuthority(tombstone, removalEpoch)
      : await store.putTombstone?.(tombstone);
    if (tombstoneWritten === false) return false;
    if (record) {
      const hiddenRecord = {
        ...record,
        state: 'tombstone',
        hidden: true,
        tombstonedAt: tombstone.tombstonedAt,
        sessionEpoch: removalEpoch,
        authorityVersion: removalEpoch,
        audioBlob: null,
        coverBlob: null,
      };
      const hidden = store.putPackageIfAuthority
        ? await store.putPackageIfAuthority(hiddenRecord, removalEpoch)
        : await store.putPackage(hiddenRecord);
      if (hidden === false) return false;
    }
    broadcastOfflineLibraryChange({ type: 'removed', userId, contentId });
    return store.deletePackageIfAuthority
      ? store.deletePackageIfAuthority(userId, contentId, removalEpoch)
      : store.deletePackage(userId, contentId);
  });
  packageWrites.set(key, deletion);
  return deletion.finally(() => {
    if (packageWrites.get(key) === deletion) packageWrites.delete(key);
  });
}

export async function getReadyOfflinePackage({
  userId,
  contentId,
  store,
  sessionEpoch = captureOfflineUserEpoch(userId),
}) {
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch) || isOfflineUserRevoked(userId)) return null;
  const lease = store.getEntitlementLease
    ? await store.getEntitlementLease(userId)
    : null;
  if (lease?.effectivePremium !== true) return null;
  if (store.isAuthorityCurrent
    && !await store.isAuthorityCurrent(userId, sessionEpoch)) return null;
  if (store.getTombstone && await store.getTombstone(userId, contentId)) return null;
  const record = await store.getPackage(userId, contentId);
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch) || isOfflineUserRevoked(userId)) return null;
  if (record?.hidden || record?.state !== 'ready'
    || !record.content || !record.audioBlob || !record.coverBlob) {
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
    && !isOfflineUserRevoked(userId)
    && (!getCurrentUser || activeUserId() === userId);
  if (!isCurrentRead()) return [];
  const offlineStore = store || await openOfflineStore();
  if (!isCurrentRead()) return [];
  const lease = offlineStore.getEntitlementLease
    ? await offlineStore.getEntitlementLease(userId)
    : null;
  if (!isCurrentRead() || lease?.effectivePremium !== true) return [];
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
  getDefaultVoice,
  fetchImpl = globalThis.fetch,
}) {
  if (!userId || !store || !isCurrentOfflineUserEpoch(userId, sessionEpoch)) return;

  if (!authorityPrepared) {
    const provisionalEpoch = prepareOfflineAuthority(userId, effectivePremium, sessionEpoch);
    if (provisionalEpoch == null) return null;
    try {
      sessionEpoch = await claimOfflineAuthority({
        userId,
        effectivePremium,
        sessionEpoch: provisionalEpoch,
        store,
      });
    } catch (error) {
      error.offlineSessionEpoch = provisionalEpoch;
      error.offlineCleanupOnly = false;
      error.offlineAuthorityPrepared = false;
      throw error;
    }
    if (sessionEpoch == null) return null;
  }
  if (!isCurrentOfflineUserEpoch(userId, sessionEpoch)
    || !await isSharedAuthorityCurrent(store, userId, sessionEpoch)) return null;

  if (effectivePremium !== true) {
    if (!cleanupOnly) {
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
      await store.purgePackages(userId, sessionEpoch, sessionEpoch);
    } catch (error) {
      error.offlineSessionEpoch = sessionEpoch;
      error.offlineCleanupOnly = true;
      error.offlineAuthorityPrepared = true;
      throw error;
    }
    return isCurrentOfflineUserEpoch(userId, sessionEpoch)
      && await isSharedAuthorityCurrent(store, userId, sessionEpoch)
      ? sessionEpoch
      : null;
  }

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
      sessionEpoch,
      authorityPrepared: true,
    })));

  await Promise.all(items.map(async (content) => {
    if (!content?.id) return;
    const record = await store.getPackage(userId, content.id);
    const selectedVoice = content.selected_voice
      || getDefaultVoice?.(content)
      || content.voice_id
      || null;
    const desiredVoice = selectOfflineAudio(content, selectedVoice).voiceId;
    if (record?.state === 'ready' && !record.hidden
      && record.voiceId === desiredVoice
      && record.content && record.audioBlob && record.coverBlob) return;
    await queueOfflinePackage({
      userId,
      content,
      selectedVoice,
      sessionEpoch,
      store,
      fetchImpl,
    });
  }));
  return isCurrentOfflineUserEpoch(userId, sessionEpoch)
    && await isSharedAuthorityCurrent(store, userId, sessionEpoch)
    ? sessionEpoch
    : null;
}

export async function loadSavedLibrary({
  userId,
  api,
  reconciliationRunner,
  getCurrentUser,
  store,
  openStore = openOfflineStore,
}) {
  const activeUserId = () => {
    const user = getCurrentUser?.();
    return user?.uid || user?.family_id || user?.username;
  };
  const isStaleIdentity = () => getCurrentUser && activeUserId() !== userId;
  const sessionEpoch = captureOfflineUserEpoch(userId);
  const isStaleSession = () => !isCurrentOfflineUserEpoch(userId, sessionEpoch);
  let resolvedStore = store || null;
  const ensureStore = async () => {
    if (!resolvedStore) resolvedStore = await openStore();
    return resolvedStore;
  };
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
    let offlineStore;
    try {
      offlineStore = await ensureStore();
    } catch {
      return {
        items: [],
        effectivePremium: false,
        saveCap: null,
        offline: true,
      };
    }
    const lease = await offlineStore.getEntitlementLease(userId);
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
      offlineStore,
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
      const offlineStore = await ensureStore();
      await reconcileOfflineLibrary({
        userId,
        effectivePremium,
        savedItems: items,
        store: offlineStore,
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
  getDefaultVoice,
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
  let triggerCount = 0;

  const isCleanupIdentityCurrent = (task) => {
    if (!task || !isAuthenticated()) return false;
    const user = getCurrentUser();
    const activeUserId = user?.uid || user?.family_id || user?.username;
    return activeUserId === task.userId
      && isCurrentOfflineUserEpoch(task.userId, task.sessionEpoch);
  };
  const isCleanupCurrent = async (task, store) => {
    if (!isCleanupIdentityCurrent(task)) return false;
    if (!task.authorityPrepared) {
      if (!store.getAuthorityVersion) return true;
      return await store.getAuthorityVersion(task.userId) < task.sessionEpoch;
    }
    return isSharedAuthorityCurrent(store, task.userId, task.sessionEpoch);
  };

  const scheduleLocalCleanup = (task) => {
    cleanupTask = task;
    if (cleanupRetryScheduled) return;
    cleanupRetryScheduled = true;
    scheduleRetry(async () => {
      cleanupRetryScheduled = false;
      const pending = cleanupTask;
      if (!isCleanupIdentityCurrent(pending)) {
        cleanupTask = null;
        return;
      }
      let store;
      try {
        store = await openStore();
        if (!await isCleanupCurrent(pending, store)) {
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
          getDefaultVoice,
          store,
        });
        if (typeof reconciledEpoch === 'number') pending.sessionEpoch = reconciledEpoch;
        if (await isCleanupCurrent(pending, store)) cleanupTask = null;
      } catch (error) {
        if (typeof error?.offlineSessionEpoch === 'number') {
          pending.sessionEpoch = error.offlineSessionEpoch;
        }
        if (error?.offlineCleanupOnly === true) pending.cleanupOnly = true;
        if (error?.offlineAuthorityPrepared === false) pending.authorityPrepared = false;
        if (!isCleanupIdentityCurrent(pending)) {
          cleanupTask = null;
        } else if (!store || await isCleanupCurrent(pending, store)) {
          scheduleLocalCleanup(pending);
        } else {
          cleanupTask = null;
        }
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
      const provisionalEpoch = prepareOfflineAuthority(
        userId,
        data?.effective_premium === true,
        sessionEpoch,
      );
      if (provisionalEpoch == null) return null;
      cleanupTask = null;

      let appliedEpoch = provisionalEpoch;
      let authorityPrepared = false;
      try {
        const store = await openStore();
        if (!isCurrentOfflineUserEpoch(userId, provisionalEpoch)) return null;
        appliedEpoch = await claimOfflineAuthority({
          userId,
          effectivePremium: data?.effective_premium === true,
          sessionEpoch: provisionalEpoch,
          store,
        });
        if (appliedEpoch == null) return null;
        authorityPrepared = true;
        const reconciledEpoch = await reconcile({
          userId,
          effectivePremium: data?.effective_premium === true,
          savedItems: Array.isArray(data?.items) ? data.items : [],
          sessionEpoch: appliedEpoch,
          authorityPrepared: true,
          getDefaultVoice,
          store,
        });
        appliedEpoch = typeof reconciledEpoch === 'number'
          ? reconciledEpoch
          : appliedEpoch;
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
          authorityPrepared: error?.offlineAuthorityPrepared === false
            ? false
            : authorityPrepared,
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
  const provisionalEpoch = advanceOfflineUserEpoch(userId, false);
  markOfflineUserRevoked(userId, provisionalEpoch);
  const store = await openStore();
  if (currentUserSession(userId).epoch !== provisionalEpoch
    || currentUserSession(userId).active !== false) return;
  const purgeEpoch = await claimOfflineAuthority({
    userId,
    effectivePremium: false,
    sessionEpoch: provisionalEpoch,
    store,
    active: false,
  });
  if (purgeEpoch == null) return;
  await store.purgeUser(userId, purgeEpoch, purgeEpoch);
}
