/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import MyStoriesPage from './page';
import { interactionApi, subscriptionApi } from '../../utils/api';
import { isLoggedIn } from '../../utils/auth';

const mockRouter = { push: jest.fn() };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('../../utils/auth', () => ({
  isLoggedIn: jest.fn(),
  getUser: jest.fn(() => ({ id: 'u1', username: 'Dreamer' })),
}));

jest.mock('../../utils/api', () => ({
  interactionApi: {
    getUserSaves: jest.fn(),
  },
  subscriptionApi: {
    getCurrent: jest.fn(),
  },
}));

jest.mock('../../utils/i18n', () => {
  const copy = {
    loading: 'Loading',
    myContentTitle: 'My Content',
    myContentSubtitle: 'Your saved stories and creative tools',
    myCredits: 'Credits',
    myFavorites: 'Favorites',
    myCharacters: 'Characters',
    myVoices: 'Voices',
    myCreateContent: 'Create Content',
    myCreateCharacter: 'Create Character',
    myRecordVoice: 'Record Voice',
    myComingSoonClose: 'Got it',
    myContentComingTitle: 'Content creation is coming soon',
    myCharacterComingTitle: 'Character creation is coming soon',
    myVoiceComingTitle: 'Voice recording is coming later',
    myComingBody: 'We are preparing this feature for a future release.',
    myEmptyFavoritesText: 'Tap the heart on any story to add it here!',
    myExplore: 'Explore Stories',
    myStoriesTitle: 'My Stories',
    myStoriesSubtitle: 'Your favorite stories, all in one place',
    myPreferences: 'Preferences',
  };

  return {
    useI18n: () => ({
      lang: 'en',
      t: (key) => copy[key] || key,
    }),
  };
});

jest.mock('../../components/StarField', () => function StarField() {
  return null;
});

jest.mock('../../components/ContentCard', () => function ContentCard({ content }) {
  return <article>{content.title}</article>;
});

jest.mock('../../components/RadioLiveCard', () => function RadioLiveCard() {
  return <div>Dream Valley Radio</div>;
});


let host;
let root;

async function renderPage() {
  await act(async () => {
    root.render(<MyStoriesPage />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function headings() {
  return Array.from(host.querySelectorAll('section > h2'), (heading) => heading.textContent);
}

beforeEach(() => {
  jest.clearAllMocks();
  isLoggedIn.mockReturnValue(true);
  interactionApi.getUserSaves.mockResolvedValue({ items: [] });
  subscriptionApi.getCurrent.mockResolvedValue({ credits_total: 3 });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('renders credits and the three shelves without Preferences or Radio', async () => {
  interactionApi.getUserSaves.mockResolvedValue({ items: [{ id: 'f1', title: 'Favorite' }] });
  subscriptionApi.getCurrent.mockResolvedValue({ credits_total: 13 });
  await renderPage();
  expect(document.body.textContent).toContain('Credits: 13');
  expect(headings()).toEqual(['Favorites', 'Characters', 'Voices']);
  expect(document.body.textContent).not.toContain('Preferences');
  expect(document.body.textContent).not.toContain('Dream Valley Radio');
});

test('credit failure does not hide shelves', async () => {
  interactionApi.getUserSaves.mockResolvedValue({ items: [] });
  subscriptionApi.getCurrent.mockRejectedValue(new Error('offline'));
  await renderPage();
  expect(document.body.textContent).toContain('Credits: —');
  expect(headings()).toEqual(['Favorites', 'Characters', 'Voices']);
});

test('signed-out visitors see the free allowance', async () => {
  isLoggedIn.mockReturnValue(false);
  await renderPage();
  expect(document.body.textContent).toContain('Credits: 3');
  expect(subscriptionApi.getCurrent).not.toHaveBeenCalled();
});
