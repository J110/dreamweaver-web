import { createOfflineStore } from '@/utils/offlineStore';
import {
  getReadyOfflinePackage,
  queueOfflinePackage,
  resolveOfflinePackage,
} from '@/utils/offlineLibrary';

function memoryStore() {
  const packages = new Map();
  return createOfflineStore({
    put: async (store, value) => packages.set(value.key, value),
    get: async (store, key) => packages.get(key) ?? null,
    getAll: async () => [...packages.values()],
    delete: async (store, key) => packages.delete(key),
  });
}

test('hydrates cached player metadata and selects its audio and cover blobs before network playback', async () => {
  const store = memoryStore();
  const content = {
    id: 'api-only-story',
    title: 'Saved only in IndexedDB',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [{ voice: 'female_2', url: 'https://media.example/female-2.mp3' }],
  };
  await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store,
    fetchImpl: async (url) => new Response(new Blob([url])),
  });
  const urlApi = {
    createObjectURL: jest.fn()
      .mockReturnValueOnce('blob:audio')
      .mockReturnValueOnce('blob:cover'),
    revokeObjectURL: jest.fn(),
  };

  const hydrated = await getReadyOfflinePackage({ userId: 'u1', contentId: 'api-only-story', store });
  const playback = await resolveOfflinePackage({
    userId: 'u1', contentId: 'api-only-story', selectedVoice: 'female_2', store, urlApi,
  });

  expect(hydrated.content).toEqual(content);
  expect(playback).toMatchObject({ audioUrl: 'blob:audio', coverUrl: 'blob:cover' });
});

test('does not make cached playback available until the IndexedDB lookup settles', async () => {
  const store = memoryStore();
  let releaseGet;
  const delayedStore = {
    ...store,
    getPackage: () => new Promise((resolve) => { releaseGet = resolve; }),
  };
  const lookup = resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store: delayedStore,
  });
  let settled = false;
  lookup.then(() => { settled = true; });

  await Promise.resolve();
  expect(settled).toBe(false);
  releaseGet(null);
  await expect(lookup).resolves.toBeNull();
});

test('releases audio and cover object URLs when the player replaces offline playback', async () => {
  const store = memoryStore();
  const content = {
    id: 'story-1', cover: 'https://media.example/cover.jpg',
    audio_variants: [{ voice: 'female_2', url: 'https://media.example/female-2.mp3' }],
  };
  await queueOfflinePackage({
    userId: 'u1', content, selectedVoice: 'female_2', store,
    fetchImpl: async (url) => new Response(new Blob([url])),
  });
  const urlApi = {
    createObjectURL: jest.fn().mockReturnValueOnce('blob:audio').mockReturnValueOnce('blob:cover'),
    revokeObjectURL: jest.fn(),
  };

  const playback = await resolveOfflinePackage({
    userId: 'u1', contentId: 'story-1', selectedVoice: 'female_2', store, urlApi,
  });
  playback.revoke();

  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  expect(urlApi.revokeObjectURL).toHaveBeenCalledWith('blob:cover');
});
