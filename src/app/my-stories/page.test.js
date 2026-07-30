/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import MyStoriesPage from './page';
import { characterApi, interactionApi, subscriptionApi } from '../../utils/api';
import { isLoggedIn } from '../../utils/auth';

const mockRouter = { push: jest.fn() };
let mockLang = 'en';

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
  characterApi: {
    list: jest.fn(),
  },
}));

jest.mock('../../utils/i18n', () => {
  const englishCopy = {
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
    myComingSoon: 'Coming soon',
    myLocked: 'Locked',
    myMoonExplorer: 'Moon Explorer',
    myDreamGuardian: 'Dream Guardian',
    myGentleStoryteller: 'Gentle Storyteller',
    myMoonlightVoice: 'Moonlight Voice',
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
  const hindiCopy = {
    ...englishCopy,
    myContentTitle: 'Mera Content',
    myContentSubtitle: 'Aapki save ki hui kahaniyan aur creative tools',
    myCredits: 'Credits',
    myFavorites: 'Pasandida',
    myCharacters: 'Kirdaar',
    myVoices: 'Aawaazein',
    myCreateContent: 'Content Banayein',
    myCreateCharacter: 'Kirdaar Banayein',
    myRecordVoice: 'Aawaaz Record Karein',
    myComingSoon: 'Jaldi aa raha hai',
    myLocked: 'Band hai',
    myMoonExplorer: 'Chaand ka Khoji',
    myDreamGuardian: 'Sapnon ka Rakhwala',
    myGentleStoryteller: 'Pyaara Kahanikaar',
    myMoonlightVoice: 'Chaandni ki Aawaaz',
  };

  return {
    useI18n: () => ({
      lang: mockLang,
      t: (key) => (mockLang === 'hi' ? hindiCopy : englishCopy)[key] || key,
    }),
  };
});

jest.mock('../../components/StarField', () => function StarField() {
  return null;
});

jest.mock('../../components/ContentCard', () => function ContentCard({ content, compact }) {
  return <article data-compact={compact ? 'true' : 'false'}>{content.title}</article>;
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
  mockLang = 'en';
  isLoggedIn.mockReturnValue(true);
  interactionApi.getUserSaves.mockResolvedValue({ items: [] });
  subscriptionApi.getCurrent.mockResolvedValue({ credits_total: 3 });
  characterApi.list.mockResolvedValue([]);
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
  expect(host.querySelector('article[data-compact="true"]')).not.toBeNull();
  expect(document.body.textContent).not.toContain('Preferences');
  expect(document.body.textContent).not.toContain('Dream Valley Radio');
});

test('saved characters appear between creation and locked previews', async () => {
  characterApi.list.mockResolvedValue([{ id: 'c1', portrait_url: '/media/lumi.webp', profile: { name: 'Lumi', character_type: 'fox', traits: ['kind'] } }]);
  await renderPage();

  const shelf = Array.from(host.querySelectorAll('section')).find((section) => section.querySelector('h2')?.textContent === 'Characters');
  expect(Array.from(shelf.querySelectorAll('a, button')).map((item) => item.textContent)).toEqual([
    expect.stringContaining('Create Character'),
    expect.stringContaining('Lumi'),
    expect.stringContaining('Moon Explorer'),
    expect.stringContaining('Dream Guardian'),
  ]);
});

test('locked character and voice previews use existing story covers', async () => {
  await renderPage();

  const sources = Array.from(
    host.querySelectorAll('button[aria-label^="Locked:"] img'),
    (image) => image.getAttribute('src')
  );

  expect(sources).toEqual(expect.arrayContaining([
    '/covers/gen-40f8fecefbfe.svg',
    '/covers/gen-1ba62b9e17cc.svg',
    '/covers/warning-6-8-59f6.svg',
    '/covers/gen-8c9859bb56c2.svg',
  ]));
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

test('Hindi mode translates preview labels and card status copy', async () => {
  mockLang = 'hi';
  await renderPage();
  expect(document.body.textContent).toContain('Jaldi aa raha hai');
  expect(document.body.textContent).toContain('Chaand ka Khoji');
  expect(document.body.textContent).toContain('Sapnon ka Rakhwala');
  expect(document.body.textContent).toContain('Pyaara Kahanikaar');
  expect(document.body.textContent).toContain('Chaandni ki Aawaaz');
  expect(document.body.textContent).toContain('Band hai');
  expect(document.body.textContent).not.toContain('Moon Explorer');
  expect(host.querySelector('[aria-label="Band hai: Chaand ka Khoji"]')).not.toBeNull();
});
