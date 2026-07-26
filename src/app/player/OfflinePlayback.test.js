/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

const mockGetReadyOfflinePackage = jest.fn();
const mockResolveOfflinePackage = jest.fn();
const mockOpenOfflineStore = jest.fn();
const mockGetContentById = jest.fn();
const mockQueueOfflinePackage = jest.fn();
const mockSubscribeOfflineLibraryChanges = jest.fn();
const mockAudioInstances = [];
const mockGetDefaultVoice = () => 'female_1';
const mockVoicePreferences = { getDefaultVoice: mockGetDefaultVoice, voicePrefs: true };
let mockPlayerId = 'api-only-story';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: mockPlayerId }),
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({ get: (key) => key === 'autoplay' ? '1' : null }),
}));
jest.mock('next/link', () => ({ children, href }) => <a href={href}>{children}</a>);
jest.mock('@/components/StarField', () => () => null);
jest.mock('@/components/HeartButton', () => () => null);
jest.mock('@/utils/api', () => ({
  contentApi: { getContentById: (...args) => mockGetContentById(...args) },
  feedbackApi: { submitReport: jest.fn() },
}));
jest.mock('@/utils/seedData', () => ({ getStories: () => [] }));
jest.mock('@/utils/ambientMusic', () => ({
  getAmbientMusic: () => ({ stop: jest.fn(), setVolume: jest.fn(), play: jest.fn(), isPlaying: false }),
}));
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key) => key, lang: 'en' }),
  hasCompletedOnboarding: () => true,
}));
jest.mock('@/utils/voicePreferences', () => ({
  useVoicePreferences: () => mockVoicePreferences,
}));
jest.mock('@/utils/auth', () => ({ getUser: () => ({ uid: 'u1' }), isLoggedIn: () => true }));
jest.mock('@/utils/offlineStore', () => ({ openOfflineStore: () => mockOpenOfflineStore() }));
jest.mock('@/utils/offlineLibrary', () => ({
  getReadyOfflinePackage: (...args) => mockGetReadyOfflinePackage(...args),
  resolveOfflinePackage: (...args) => mockResolveOfflinePackage(...args),
  queueOfflinePackage: (...args) => mockQueueOfflinePackage(...args),
  subscribeOfflineLibraryChanges: (...args) => mockSubscribeOfflineLibraryChanges(...args),
  captureOfflineUserEpoch: () => 0,
}));
jest.mock('@/utils/voiceConfig', () => ({
  VOICES: {
    female_1: { icon: '1' },
    female_2: { icon: '2' },
  },
  getVoiceId: (voice) => voice,
  getVoiceLabel: (voice) => voice,
}));
jest.mock('@/utils/textUtils', () => ({ stripEmotionMarkers: (text) => text }));
jest.mock('@/utils/contentTypes', () => ({
  getDisplayCategory: () => 'Story',
  getDisplayCategoryUpper: () => 'STORY',
}));
jest.mock('@/utils/listeningHistory', () => ({ recordListen: jest.fn(), markCompleted: jest.fn() }));
jest.mock('@/utils/analytics', () => ({ dvAnalytics: { track: jest.fn(), flush: jest.fn() } }));
jest.mock('@/utils/upgradeIntent', () => ({ setUpgradeIntent: jest.fn() }));
jest.mock('posthog-js', () => ({ capture: jest.fn() }));
jest.mock('@/hooks/useCoverVisualSystem', () => () => ({
  variantOpacities: [], breatheSpeed: 4, progressAngle: 0, isEnabled: false, hasVariants: false, filterFallbackStyle: {},
}));
jest.mock('@/utils/mediaSessionManager', () => ({
  updateMediaSessionMetadata: jest.fn(), registerMediaSessionHandlers: jest.fn(), updatePlaybackState: jest.fn(),
  updatePositionState: jest.fn(), clearMediaSession: jest.fn(),
}));
jest.mock('./[id]/page.module.css', () => ({}));

import PlayerPage from './[id]/page';

const { resolveOfflinePackage: resolveReadyOfflinePackage } = jest.requireActual('@/utils/offlineLibrary');

global.IS_REACT_ACT_ENVIRONMENT = true;

class MockAudio {
  constructor() {
    this.currentTime = 0;
    this.duration = 0;
    this.ended = false;
    this.src = '';
    this.listeners = new Map();
    this.play = jest.fn().mockResolvedValue(undefined);
    this.pause = jest.fn();
    mockAudioInstances.push(this);
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGetReadyOfflinePackage.mockReset();
  mockResolveOfflinePackage.mockReset();
  mockOpenOfflineStore.mockReset();
  mockGetContentById.mockReset();
  mockQueueOfflinePackage.mockReset().mockResolvedValue(null);
  mockSubscribeOfflineLibraryChanges.mockReset().mockReturnValue(() => {});
  mockAudioInstances.length = 0;
  mockPlayerId = 'api-only-story';
  global.Audio = MockAudio;
  window.Audio = MockAudio;
});

afterEach(() => {
  jest.useRealTimers();
});

test('hydrates and plays a cached API-only story only after lookup settles, then resumes autoplay after a voice change', async () => {
  const content = {
    id: 'api-only-story',
    title: 'Saved only in IndexedDB',
    type: 'story',
    text: 'A cached bedtime story',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [
      { voice: 'female_1', url: 'https://media.example/female-1.mp3' },
      { voice: 'female_2', url: 'https://media.example/female-2.mp3' },
    ],
  };
  const nextContent = { ...content, id: 'next-api-only-story', title: 'A different cached story' };
  const firstRevoke = jest.fn();
  const secondRevoke = jest.fn();
  const lookupResolvers = [];
  mockOpenOfflineStore.mockResolvedValue({});
  mockGetReadyOfflinePackage.mockImplementation(({ contentId }) => Promise.resolve({
    content: contentId === 'next-api-only-story' ? nextContent : content,
    voiceId: 'female_1',
  }));
  mockResolveOfflinePackage.mockImplementation(() => new Promise((resolve) => lookupResolvers.push(resolve)));

  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => root.render(<PlayerPage />));
  await flush();

  expect(container.textContent).toContain('Saved only in IndexedDB');
  expect(mockGetContentById).not.toHaveBeenCalled();
  expect(mockAudioInstances).toHaveLength(0);
  expect(mockResolveOfflinePackage).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(250); });

  expect(mockAudioInstances).toHaveLength(0);

  await act(async () => {
    lookupResolvers.shift()({ content, audioUrl: 'blob:first-audio', coverUrl: 'blob:first-cover', revoke: firstRevoke });
    await Promise.resolve();
  });
  await flush();
  await act(async () => { jest.advanceTimersByTime(250); });

  expect(mockAudioInstances).toHaveLength(1);
  expect(mockAudioInstances[0].src).toBe('blob:first-audio');
  expect(mockAudioInstances[0].play).toHaveBeenCalledTimes(1);
  expect(container.querySelector('img').getAttribute('src')).toBe('blob:first-cover');

  const switchButton = [...container.querySelectorAll('button')]
    .find((button) => button.textContent.includes('female_2'));
  await act(async () => {
    switchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();

  expect(firstRevoke).toHaveBeenCalled();
  expect(mockAudioInstances).toHaveLength(1);

  await act(async () => {
    lookupResolvers.shift()({ content, audioUrl: 'blob:second-audio', coverUrl: 'blob:second-cover', revoke: secondRevoke });
    await Promise.resolve();
  });
  await flush();
  await act(async () => { jest.runOnlyPendingTimers(); });

  expect(mockAudioInstances).toHaveLength(2);
  expect(mockAudioInstances[1].src).toBe('blob:second-audio');
  expect(mockAudioInstances[1].play).toHaveBeenCalledTimes(1);

  mockPlayerId = 'next-api-only-story';
  await act(async () => root.render(<PlayerPage />));
  await flush();

  expect(container.textContent).toContain('A different cached story');
  expect(secondRevoke).toHaveBeenCalled();

  await act(async () => root.unmount());
  container.remove();
});

test('revokes both ready package object URLs when the rendered player unmounts', async () => {
  const content = {
    id: 'api-only-story',
    title: 'Saved only in IndexedDB',
    type: 'story',
    text: 'A cached bedtime story',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [{ voice: 'female_1', url: 'https://media.example/female-1.mp3' }],
  };
  const audioBlob = new Blob(['audio']);
  const coverBlob = new Blob(['cover']);
  const revokeObjectURL = jest.fn();
  const urlApi = {
    createObjectURL: jest.fn()
      .mockReturnValueOnce('blob:unmount-audio')
      .mockReturnValueOnce('blob:unmount-cover'),
    revokeObjectURL,
  };
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
    getPackage: jest.fn().mockResolvedValue({
      state: 'ready',
      content,
      voiceId: 'female_1',
      audioBlob,
      coverBlob,
    }),
  };
  mockOpenOfflineStore.mockResolvedValue(store);
  mockGetReadyOfflinePackage.mockResolvedValue({ content, voiceId: 'female_1' });
  mockResolveOfflinePackage.mockImplementation((options) => (
    resolveReadyOfflinePackage({ ...options, urlApi })
  ));

  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => root.render(<PlayerPage />));
  await flush();

  expect(container.querySelector('img').getAttribute('src')).toBe('blob:unmount-cover');
  expect(urlApi.createObjectURL).toHaveBeenNthCalledWith(1, audioBlob);
  expect(urlApi.createObjectURL).toHaveBeenNthCalledWith(2, coverBlob);

  await act(async () => root.unmount());

  expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:unmount-audio');
  expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:unmount-cover');
  container.remove();
});

test('mounted cached playback pauses, revokes, and hides metadata on an authority broadcast', async () => {
  const content = {
    id: 'api-only-story',
    title: 'Revoked cached story',
    type: 'story',
    text: 'Cached text',
    cover: 'https://media.example/cover.jpg',
    audio_variants: [{ voice: 'female_1', url: 'https://media.example/female-1.mp3' }],
  };
  const revoke = jest.fn();
  let authorityListener;
  mockSubscribeOfflineLibraryChanges.mockImplementation((listener) => {
    authorityListener = listener;
    return jest.fn();
  });
  mockOpenOfflineStore.mockResolvedValue({});
  mockGetReadyOfflinePackage.mockResolvedValue({ content, voiceId: 'female_1' });
  mockResolveOfflinePackage.mockResolvedValue({
    content,
    audioUrl: 'blob:revoked-audio',
    coverUrl: 'blob:revoked-cover',
    revoke,
  });

  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => root.render(<PlayerPage />));
  await flush();
  await act(async () => { jest.runOnlyPendingTimers(); });

  expect(container.textContent).toContain('Revoked cached story');
  expect(mockAudioInstances[0].src).toBe('blob:revoked-audio');

  await act(async () => {
    authorityListener({ type: 'authority', userId: 'u1', effectivePremium: false });
    await Promise.resolve();
  });

  expect(mockAudioInstances[0].pause).toHaveBeenCalled();
  expect(mockAudioInstances[0].src).toBe('');
  expect(revoke).toHaveBeenCalled();
  expect(container.textContent).not.toContain('Revoked cached story');

  await act(async () => root.unmount());
  container.remove();
});

test('rendered voice changes replace the package for a confirmed premium save', async () => {
  const content = {
    id: 'api-only-story',
    title: 'Live saved story',
    type: 'story',
    text: 'Live text',
    cover: 'https://media.example/cover.jpg',
    is_saved: true,
    audio_variants: [
      { voice: 'female_1', url: 'https://media.example/female-1.mp3' },
      { voice: 'female_2', url: 'https://media.example/female-2.mp3' },
    ],
  };
  const store = {
    getEntitlementLease: jest.fn().mockResolvedValue({ effectivePremium: true }),
  };
  mockOpenOfflineStore.mockResolvedValue(store);
  mockGetReadyOfflinePackage.mockResolvedValue(null);
  mockResolveOfflinePackage.mockResolvedValue(null);
  mockGetContentById.mockResolvedValue(content);

  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => root.render(<PlayerPage />));
  await flush();
  mockQueueOfflinePackage.mockClear();

  const switchButton = [...container.querySelectorAll('button')]
    .find((button) => button.textContent.includes('female_2'));
  await act(async () => {
    switchButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockQueueOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'u1',
    content,
    selectedVoice: 'female_2',
    store,
  }));

  await act(async () => root.unmount());
  container.remove();
});
