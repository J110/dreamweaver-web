/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CharacterDetailPage from './page';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/utils/auth', () => ({ isLoggedIn: jest.fn(), getUser: jest.fn() }));
jest.mock('@/utils/api', () => ({ characterApi: { get: jest.fn(), remove: jest.fn() } }));
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => ({ characterLoading: 'Loading character…', characterNotFound: 'Character not found.', characterLoadFailed: 'Unable to load this character.', characterDeleteCharacter: 'Delete Character', characterDeletePrompt: 'Delete {name}? This cannot be undone.', characterCancel: 'Cancel', characterDelete: 'Delete', characterDeleteFailed: 'Could not delete this character', characterTypeFox: 'Fox', characterTraitKind: 'Kind', characterTraitCurious: 'Curious', characterEdit: 'Edit' }[key] || key) }) }));
jest.mock('./page.module.css', () => ({}));

const { useRouter } = require('next/navigation');
const { isLoggedIn, getUser } = require('@/utils/auth');
const { characterApi } = require('@/utils/api');
const replace = jest.fn();
const CHARACTER = {
  id: 'c1',
  portrait_url: '/media/lumi.webp',
  profile: { name: 'Lumi', character_type: 'fox', gender: 'not_specified', traits: ['kind', 'curious'], profile_summary: 'A moon fox.' },
};

beforeEach(() => {
  useRouter.mockReturnValue({ replace });
  isLoggedIn.mockReturnValue(true);
  getUser.mockReturnValue({ uid: 'u1' });
  characterApi.get.mockReset().mockResolvedValue(CHARACTER);
  characterApi.remove.mockReset().mockResolvedValue({ success: true });
  replace.mockReset();
});

test('detail shows an owner character with edit and delete actions', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  document.body.appendChild(host);
  await act(async () => { root.render(<CharacterDetailPage params={{ id: 'c1' }} />); await Promise.resolve(); await Promise.resolve(); });

  expect(host.querySelector('h1').textContent).toBe('Lumi');
  expect(host.querySelector('a[href="/characters/c1/edit"]')).not.toBeNull();
  expect(Array.from(host.querySelectorAll('button')).some((button) => button.textContent === 'Delete Character')).toBe(true);

  await act(async () => root.unmount());
  host.remove();
});

test('confirmed deletion returns to My Content', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  document.body.appendChild(host);
  await act(async () => { root.render(<CharacterDetailPage params={{ id: 'c1' }} />); await Promise.resolve(); await Promise.resolve(); });
  const deleteButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Delete Character');
  await act(async () => { deleteButton.click(); await Promise.resolve(); });
  const confirm = host.querySelector('[role="dialog"] button:last-child');
  await act(async () => { confirm.click(); await Promise.resolve(); });

  expect(characterApi.remove).toHaveBeenCalledWith('c1');
  expect(replace).toHaveBeenCalledWith('/my-stories');
  await act(async () => root.unmount());
  host.remove();
});
