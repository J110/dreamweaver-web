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
jest.mock('@/components/ContentCard', () => ({ content }) => (
  <div data-saved-content-card>{content.title}</div>
));
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

async function renderPage(response) {
  mockOpenOfflineStore.mockRejectedValue(new Error('IndexedDB unavailable'));
  mockGetUserSaves.mockReset().mockResolvedValue(response);
  mockRouter.push.mockReset();
  window.history.replaceState({}, '', '/my-stories');
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => {
    root.render(<MyStoriesPage />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return { container, root };
}

test('free users get clickable upgrade messaging and a trailing locked card without losing a save slot', async () => {
  const { container, root } = await renderPage({
    items: [
      { id: 'one', title: 'One' },
      { id: 'two', title: 'Two' },
      { id: 'three', title: 'Three' },
      { id: 'four', title: 'Four' },
      { id: 'five', title: 'Five' },
    ],
    effective_premium: false,
    save_cap: 5,
  });

  expect(container.textContent).toContain(
    '5/5 saved. Upgrade to Premium for more slots and offline downloads'
  );
  expect(container.querySelectorAll('[data-saved-content-card]')).toHaveLength(5);
  const upgradeActions = [...container.querySelectorAll('button')]
    .filter((button) => button.textContent.includes('Upgrade to Premium'));
  expect(upgradeActions).toHaveLength(2);

  await act(async () => upgradeActions[0].click());
  expect(mockRouter.push).toHaveBeenCalledWith(
    '/upgrade?intent=%2Fmy-stories'
  );

  mockRouter.push.mockClear();
  await act(async () => upgradeActions[1].click());
  expect(mockRouter.push).toHaveBeenCalledWith(
    '/upgrade?intent=%2Fmy-stories'
  );

  await act(async () => root.unmount());
  container.remove();
});

test('premium users with no saves get a permanent non-interactive offline-listening encouragement card', async () => {
  const { container, root } = await renderPage({
    items: [],
    effective_premium: true,
    save_cap: 30,
  });

  expect(container.textContent).toContain(
    'You have 30 slots. Save more favorites that you can listen to offline.'
  );
  expect(container.textContent).not.toContain('Upgrade to Premium');
  expect(container.querySelectorAll('[data-saved-content-card]')).toHaveLength(0);
  const planCard = container.querySelector('[data-library-plan-card="premium"]');
  expect(planCard).not.toBeNull();
  expect(planCard.tagName).toBe('DIV');

  await act(async () => root.unmount());
  container.remove();
});

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
