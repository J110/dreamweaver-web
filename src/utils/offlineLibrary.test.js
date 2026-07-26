import {
  queueOfflinePackage,
  removeOfflinePackage,
  getReadyOfflinePackage,
  resolveOfflinePackage,
  selectOfflineAudio,
} from './offlineLibrary';
import { createOfflineStore } from './offlineStore';

function memoryStore() {
  const packages = new Map();
  return createOfflineStore({
    put: async (store, value) => packages.set(value.key, value),
    get: async (store, key) => packages.get(key) ?? null,
    getAll: async () => [...packages.values()],
    delete: async (store, key) => packages.delete(key),
  });
}

function sampleContentWithVoices() {
  return {
    id: 'story-1',
    title: 'Moon Story',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [
      { voice: 'female_1', url: 'https://media.example/female-1.mp3' },
      { voice: 'female_2', url: 'https://media.example/female-2.mp3' },
    ],
  };
}

function fetchBlob(url) {
  return Promise.resolve(new Response(new Blob([url])));
}

test('downloads current voice, cover, and metadata after premium save', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  const record = await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });

  expect(record).toMatchObject({ state: 'ready', voiceId: 'female_2', content });
  expect(record.audioBlob).toBeInstanceOf(Blob);
  expect(record.coverBlob).toBeInstanceOf(Blob);
  expect(await record.audioBlob.text()).toBe('https://media.example/female-2.mp3');
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'ready', voiceId: 'female_2' });
});

test('marks a failed download for retry without deleting the save record', async () => {
  const store = memoryStore();
  const record = await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store,
    fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
  });

  expect(record).toMatchObject({
    state: 'failed', voiceId: 'female_2',
    audioSourceUrl: 'https://media.example/female-2.mp3',
    coverSourceUrl: 'https://media.example/cover.jpg',
  });
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'failed' });
});

test('replaces cached audio when the selected voice changes', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_1', store, fetchImpl: fetchBlob });
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob });

  const record = await store.getPackage('u1', 'story-1');
  expect(record.voiceId).toBe('female_2');
  expect(await record.audioBlob.text()).toBe('https://media.example/female-2.mp3');
});

test('keeps the newer voice package when an older download finishes last', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  const releaseOlderDownloads = [];
  const olderFetch = jest.fn(() => new Promise((resolve) => {
    releaseOlderDownloads.push(() => resolve(new Response(new Blob(['older']))));
  }));
  const older = queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_1', store, fetchImpl: olderFetch,
  });
  await Promise.resolve();
  const newer = await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  releaseOlderDownloads.forEach((release) => release());
  await older;

  expect(newer.voiceId).toBe('female_2');
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'ready', voiceId: 'female_2' });
});

test('normalizes supported audio_file and cover_file paths before downloading', async () => {
  const store = memoryStore();
  const fetchImpl = jest.fn(fetchBlob);
  await queueOfflinePackage({
    userId: 'u1',
    content: { id: 'poem-1', type: 'poem', lang: 'hi', audio_file: 'night.mp3', cover_file: 'moon.jpg' },
    selectedVoice: 'female_1',
    store,
    fetchImpl,
  });

  expect(fetchImpl).toHaveBeenCalledWith('/audio/poems-hi/night.mp3');
  expect(fetchImpl).toHaveBeenCalledWith('/covers/poems-hi/moon.jpg');
});

test('uses the first available voice when no preference is selected', () => {
  expect(selectOfflineAudio(sampleContentWithVoices(), null)).toEqual({
    voiceId: 'female_1', audioUrl: 'https://media.example/female-1.mp3',
  });
});

test('does not resolve incomplete or failed packages for playback', async () => {
  const store = memoryStore();
  await store.putPackage({
    key: 'u1:story-1', userId: 'u1', contentId: 'story-1', state: 'failed',
    content: sampleContentWithVoices(), audioBlob: new Blob(['audio']),
  });

  expect(await resolveOfflinePackage({ userId: 'u1', contentId: 'story-1', store })).toBeNull();
});

test('does not resolve a package for a different selected voice', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_1', store, fetchImpl: fetchBlob,
  });

  expect(await resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store,
  })).toBeNull();
});

test('hydrates cached metadata from a ready package without a network response', async () => {
  const store = memoryStore();
  const content = sampleContentWithVoices();
  await queueOfflinePackage({ userId: 'u1', content, selectedVoice: 'female_2', store, fetchImpl: fetchBlob });

  expect(await getReadyOfflinePackage({ userId: 'u1', contentId: 'story-1', store })).toMatchObject({
    content,
    voiceId: 'female_2',
  });
});

test('creates and revokes object URLs for ready packages', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });
  const urlApi = {
    createObjectURL: jest.fn()
      .mockReturnValueOnce('blob:audio')
      .mockReturnValueOnce('blob:cover'),
    revokeObjectURL: jest.fn(),
  };

  const resolved = await resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store, urlApi,
  });
  expect(resolved).toMatchObject({
    content: sampleContentWithVoices(), audioUrl: 'blob:audio', coverUrl: 'blob:cover',
  });
  resolved.revoke();
  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:cover');
});

test('removes the package when the premium save is removed', async () => {
  const store = memoryStore();
  await queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store, fetchImpl: fetchBlob,
  });

  await removeOfflinePackage({ userId: 'u1', contentId: 'story-1', store });
  expect(await store.getPackage('u1', 'story-1')).toBeNull();
});

test('does not restore a removed package when its earlier download finishes', async () => {
  const store = memoryStore();
  const releases = [];
  let downloadsStarted;
  const started = new Promise((resolve) => { downloadsStarted = resolve; });
  const download = queueOfflinePackage({
    userId: 'u1', content: sampleContentWithVoices(), selectedVoice: 'female_2', store,
    fetchImpl: () => new Promise((resolve) => {
      releases.push(() => resolve(new Response(new Blob(['late']))));
      if (releases.length === 2) downloadsStarted();
    }),
  });
  await started;
  await removeOfflinePackage({ userId: 'u1', contentId: 'story-1', store });
  releases.forEach((release) => release());
  await download;

  expect(await store.getPackage('u1', 'story-1')).toBeNull();
});
