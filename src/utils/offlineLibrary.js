import { packageKey } from './offlineStore';

const packageGenerations = new Map();
const packageWrites = new Map();

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
