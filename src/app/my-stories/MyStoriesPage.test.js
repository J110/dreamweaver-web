/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

const mockGetUserSaves = jest.fn();
const mockOpenOfflineStore = jest.fn();
const mockRouter = { push: jest.fn() };
const mockReconciliationRunner = () => mockGetUserSaves();

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));
jest.mock('@/components/StarField', () => () => null);
jest.mock('@/components/RadioLiveCard', () => () => null);
jest.mock('@/components/ContentCard', () => ({ content }) => <div>{content.title}</div>);
jest.mock('@/utils/auth', () => ({
  isLoggedIn: () => true,
  getUser: () => ({ uid: 'u1' }),
}));
jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key) => key, lang: 'en' }),
}));
jest.mock('@/utils/api', () => ({
  interactionApi: {
    getUserSaves: (...args) => mockGetUserSaves(...args),
  },
}));
jest.mock('@/utils/offlineStore', () => ({
  openOfflineStore: (...args) => mockOpenOfflineStore(...args),
}));
jest.mock('@/utils/offlineLibrary', () => {
  const actual = jest.requireActual('@/utils/offlineLibrary');
  return {
    ...actual,
    getOfflineReconciliationRunner: () => mockReconciliationRunner,
    reconcileOfflineLibrary: jest.fn(),
  };
});
jest.mock('@/utils/voicePreferences', () => ({
  getStoredDefaultVoice: () => 'female_1',
}));
jest.mock('@/utils/upgradeIntent', () => ({ setUpgradeIntent: jest.fn() }));
jest.mock('./page.module.css', () => ({}));

import MyStoriesPage from './page';

global.IS_REACT_ACT_ENVIRONMENT = true;

test('renders live saves when IndexedDB is unavailable', async () => {
  mockOpenOfflineStore.mockRejectedValue(new Error('IndexedDB unavailable'));
  mockGetUserSaves.mockResolvedValue({
    items: [{ id: 'live-story', title: 'Live Story' }],
    effective_premium: true,
    save_cap: 30,
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(<MyStoriesPage />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockGetUserSaves).toHaveBeenCalled();
  expect(container.textContent).toContain('Live Story');

  await act(async () => root.unmount());
  container.remove();
});

test('refreshes cached My Stories when another screen confirms a save', async () => {
  mockOpenOfflineStore.mockResolvedValue({});
  mockGetUserSaves
    .mockReset()
    .mockResolvedValueOnce({
      items: [],
      effective_premium: false,
      save_cap: 5,
    })
    .mockResolvedValueOnce({
      items: [{ id: 'mobile-save', title: 'Mobile Save' }],
      effective_premium: false,
      save_cap: 5,
    });
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);

  await act(async () => {
    root.render(<MyStoriesPage />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => {
    window.dispatchEvent(new CustomEvent('dv-offline-library-change', {
      detail: { type: 'saved-library', userId: 'u1', saved: true },
    }));
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockGetUserSaves).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain('Mobile Save');

  await act(async () => root.unmount());
  container.remove();
});
