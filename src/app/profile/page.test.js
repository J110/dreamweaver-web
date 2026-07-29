/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import ProfilePage from './page';

const mockRouter = { push: jest.fn() };
const mockI18n = {
  lang: 'en',
  setLang: jest.fn(),
  t: (key) => key,
};
const mockVoicePreferences = {
  voicePrefs: { preferredVoice: 'female_1' },
  setVoicePrefs: jest.fn(),
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('next/link', () => function Link({ children, ...props }) {
  return <a {...props}>{children}</a>;
});

jest.mock('../../components/StarField', () => function StarField() {
  return null;
});

jest.mock('../../components/RadioLiveCard', () => function RadioMarker() {
  return <div data-testid="radio-card">Dream Valley Radio</div>;
});

jest.mock('../../utils/auth', () => ({
  isLoggedIn: () => true,
  getUser: () => ({ username: 'Dreamer' }),
  logout: jest.fn(),
}));

jest.mock('../../utils/i18n', () => ({
  useI18n: () => mockI18n,
}));

jest.mock('../../utils/voicePreferences', () => ({
  useVoicePreferences: () => mockVoicePreferences,
}));

jest.mock('../../utils/voiceConfig', () => ({
  getSelectableVoices: () => [],
  getSampleUrl: jest.fn(),
  getVoiceLabel: jest.fn(),
}));

let host;
let root;

async function renderProfile() {
  await act(async () => {
    root.render(<ProfilePage />);
    await Promise.resolve();
  });
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('places Dream Valley Radio between identity and settings', async () => {
  await renderProfile();
  const radio = document.querySelector('[data-testid="radio-card"]');
  expect(radio).not.toBeNull();
  const radioBanner = radio.parentElement;
  expect(radioBanner.previousElementSibling.className).toContain('avatarSection');
  expect(radioBanner.nextElementSibling.className).toContain('settings');
});
