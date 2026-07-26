import { openOfflineStore, packageKey } from './offlineStore';

const packageGenerations = new Map();
const packageWrites = new Map();
let sharedOfflineReconciliationRunner = null;

function invalidateOfflineUserPackages(userId) {
  const prefix = `${userId}:`;
  for (const [key, generation] of packageGenerations) {
    if (key.startsWith(prefix)) packageGenerations.set(key, generation + 1);
  }
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

function writeCurrentPackage({ key, generation, store, record }) {
  const previousWrite = packageWrites.get(key) || Promise.resolve();
  const nextWrite = previousWrite.catch(() => null).then(async () => {
    if (packageGenerations.get(key) !== generation) return null;
    await store.putPackage(record);
    return record;
  });
  packageWrites.set(key, nextWrite);
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

export async function queueOfflinePackage({ userId, content, selectedVoice, store, fetchImpl }) {
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
    voiceId,
    audioSourceUrl: audioUrl || null,
    coverSourceUrl: coverUrl || null,
  };

  const pendingRecord = await writeCurrentPackage({
    key,
    generation,
    store,
    record: { ...baseRecord, state: 'pending' },
  });
  if (!pendingRecord) return store.getPackage(userId, content.id);

  try {
    if (!audioUrl || !coverUrl) throw new Error('Offline package sources are unavailable');
    const [audioResponse, coverResponse] = await Promise.all([
      fetchImpl(audioUrl),
      fetchImpl(coverUrl),
    ]);
    if (!audioResponse.ok || !coverResponse.ok) throw new Error('Offline package download failed');
    const [audioBlob, coverBlob] = await Promise.all([
      audioResponse.blob(),
      coverResponse.blob(),
    ]);
    if (!audioBlob || !coverBlob) throw new Error('Offline package download was incomplete');

    const readyRecord = { ...baseRecord, state: 'ready', audioBlob, coverBlob };
    return (await writeCurrentPackage({ key, generation, store, record: readyRecord }))
      || store.getPackage(userId, content.id);
  } catch (error) {
    const failedRecord = { ...baseRecord, state: 'failed', error: error.message };
    return (await writeCurrentPackage({ key, generation, store, record: failedRecord }))
      || store.getPackage(userId, content.id);
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

export async function getReadyOfflinePackage({ userId, contentId, store }) {
  const record = await store.getPackage(userId, contentId);
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

export async function getOfflineSavedItems(userId, store) {
  const offlineStore = store || await openOfflineStore();
  const packages = await offlineStore.listReadyPackages(userId);
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
  fetchImpl = globalThis.fetch,
}) {
  if (!userId || !store) return;

  if (effectivePremium !== true) {
    invalidateOfflineUserPackages(userId);
    await store.purgeUser(userId);
    await store.setEntitlementLease(userId, false);
    return;
  }

  await store.setEntitlementLease(userId, true);
  const items = Array.isArray(savedItems) ? savedItems : [];
  const savedIds = new Set(items.map((item) => item?.id).filter(Boolean));
  const packages = store.listPackages
    ? await store.listPackages(userId)
    : await store.listReadyPackages(userId);

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
      store,
      fetchImpl,
    });
  }));
}

export async function loadSavedLibrary({ userId, api, reconciliationRunner, store }) {
  let data;
  try {
    data = reconciliationRunner
      ? await reconciliationRunner()
      : await api.getUserSaves();
    if (!data) throw new Error('Saved library is offline');
  } catch {
    const lease = await store.getEntitlementLease(userId);
    if (lease?.effectivePremium !== true) {
      return {
        items: [],
        effectivePremium: false,
        saveCap: null,
        offline: true,
      };
    }
    return {
      items: await getOfflineSavedItems(userId, store),
      effectivePremium: true,
      saveCap: null,
      offline: true,
    };
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
}) {
  let inFlight = null;

  return () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      if (!isAuthenticated()) return null;
      const user = getCurrentUser();
      const userId = user?.uid || user?.family_id || user?.username;
      if (!userId) return null;

      let data;
      try {
        data = await api.getUserSaves();
      } catch {
        return null;
      }
      const confirmedUser = getCurrentUser();
      const confirmedUserId = confirmedUser?.uid || confirmedUser?.family_id || confirmedUser?.username;
      if (!isAuthenticated() || confirmedUserId !== userId) return null;

      const store = await openStore();
      await reconcile({
        userId,
        effectivePremium: data?.effective_premium === true,
        savedItems: Array.isArray(data?.items) ? data.items : [],
        store,
      });
      return data;
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export function getOfflineReconciliationRunner(options) {
  if (!sharedOfflineReconciliationRunner) {
    sharedOfflineReconciliationRunner = createOfflineReconciliationRunner(options);
  }
  return sharedOfflineReconciliationRunner;
}

export async function purgeOfflineUser(userId, openStore = openOfflineStore) {
  if (!userId) return;
  invalidateOfflineUserPackages(userId);
  const store = await openStore();
  await store.purgeUser(userId);
}
