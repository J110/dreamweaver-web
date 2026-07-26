/** @jest-environment jsdom */

import React from 'react';
import fs from 'fs';
import path from 'path';
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

  expect(container.querySelectorAll('[data-saved-content-card]')).toHaveLength(5);
  const upgradeBanner = container.querySelector('[data-library-upgrade-banner]');
  const planCard = container.querySelector('[data-library-plan-card="free"]');

  expect(upgradeBanner.textContent).toContain('5 of 5 saved');
  expect(upgradeBanner.textContent).toContain('More slots + offline downloads');
  expect(upgradeBanner.textContent).toContain('Get Premium →');
  expect(planCard.textContent).toContain('Premium pass');
  expect(planCard.textContent).toContain('Unlock your full library');
  expect(planCard.textContent).toContain('30 favorites + offline downloads');
  const freeImage = planCard.querySelector('img');
  expect(freeImage).not.toBeNull();
  expect(freeImage.getAttribute('src')).toBe('/upgrade-showcase.webp');
  expect(freeImage.getAttribute('alt')).toBe('');

  await act(async () => upgradeBanner.click());
  expect(mockRouter.push).toHaveBeenCalledWith(
    '/upgrade?intent=%2Fmy-stories'
  );

  mockRouter.push.mockClear();
  await act(async () => planCard.click());
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

  expect(container.querySelectorAll('[data-saved-content-card]')).toHaveLength(0);
  const premiumCard = container.querySelector('[data-library-plan-card="premium"]');

  expect(premiumCard.tagName).toBe('DIV');
  expect(premiumCard.textContent).toContain('Premium library');
  expect(premiumCard.textContent).toContain('30 saves included');
  expect(premiumCard.textContent).toContain('Save favorites and listen offline');
  const premiumImage = premiumCard.querySelector('img');
  expect(premiumImage).not.toBeNull();
  expect(premiumImage.getAttribute('src')).toBe('/upgrade-showcase.webp');
  expect(premiumImage.getAttribute('alt')).toBe('');
  expect(container.querySelector('[data-library-upgrade-banner]')).toBeNull();

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

test('uses the compact upgrade-banner layout at a 390px viewport', () => {
  const css = fs.readFileSync(path.resolve(__dirname, 'page.module.css'), 'utf8');
  const compactLayout = css.match(
    /@media \(max-width: (\d+)px\) \{[\s\S]*?\.upgradeBanner \{[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\);/
  );

  expect(Number(compactLayout?.[1])).toBeGreaterThanOrEqual(390);
});

test('keeps the upgrade banner button affordance', () => {
  const css = fs.readFileSync(path.resolve(__dirname, 'page.module.css'), 'utf8');
  const upgradeBanner = css.match(/\.upgradeBanner \{([^}]*)\}/)?.[1];

  expect(upgradeBanner).toMatch(/cursor: pointer;/);
});
