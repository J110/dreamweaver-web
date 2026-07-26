import { packageKey } from './offlineStore';

export function selectOfflineAudio(content, selectedVoice) {
  const variants = content.audio_variants || [];
  const selected = variants.find((variant) => variant.voice === selectedVoice) || variants[0];
  return {
    voiceId: selected?.voice || selectedVoice || 'default',
    audioUrl: selected?.url || content.audio_url || content.audio_file,
  };
}

export async function queueOfflinePackage({ userId, content, selectedVoice, store, fetchImpl }) {
  const { voiceId, audioUrl } = selectOfflineAudio(content, selectedVoice);
  const coverUrl = content.cover || content.cover_url;
  const baseRecord = {
    key: packageKey(userId, content.id),
    userId,
    contentId: content.id,
    content,
    voiceId,
    audioSourceUrl: audioUrl || null,
    coverSourceUrl: coverUrl || null,
  };

  await store.putPackage({ ...baseRecord, state: 'pending' });

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
    await store.putPackage(readyRecord);
    return readyRecord;
  } catch (error) {
    const failedRecord = { ...baseRecord, state: 'failed', error: error.message };
    await store.putPackage(failedRecord);
    return failedRecord;
  }
}

export function removeOfflinePackage({ userId, contentId, store }) {
  return store.deletePackage(userId, contentId);
}

export async function resolveOfflinePackage({ userId, contentId, store, urlApi = globalThis.URL }) {
  const record = await store.getPackage(userId, contentId);
  if (record?.state !== 'ready' || !record.content || !record.audioBlob || !record.coverBlob) {
    return null;
  }
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
