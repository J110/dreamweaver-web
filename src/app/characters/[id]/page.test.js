/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CharacterDetailPage from './page';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('@/utils/auth', () => ({ isLoggedIn: jest.fn(), getUser: jest.fn() }));
jest.mock('@/utils/api', () => ({ characterApi: { get: jest.fn(), remove: jest.fn() } }));
let mockLang = 'en';
jest.mock('@/utils/i18n', () => {
  const english = {
    characterLoading: 'Loading character…',
    characterNotFound: 'Character not found.',
    characterLoadFailed: 'Unable to load this character.',
    characterDeleteCharacter: 'Delete Character',
    characterDeletePrompt: 'Delete {name}? This cannot be undone.',
    characterCancel: 'Cancel',
    characterDelete: 'Delete',
    characterDeleteFailed: 'Could not delete this character',
    characterTypeFox: 'Fox',
    characterTraitKind: 'Kind',
    characterTraitCurious: 'Curious',
    characterEdit: 'Edit',
  };
  const hinglish = {
    ...english,
    characterDeleteCharacter: 'Kirdaar delete karein',
    characterDeletePrompt: '{name} ko delete karein? Yeh undo nahi hoga.',
    characterCancel: 'Raddh Karein',
    characterDelete: 'Delete Karein',
    characterTypeFox: 'Lomdi',
    characterTraitKind: 'Dayalu',
    characterTraitCurious: 'Jigyasu',
    characterEdit: 'Edit Karein',
  };
  return { useI18n: () => ({ t: (key) => (mockLang === 'hi' ? hinglish : english)[key] || key }) };
});
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
  mockLang = 'en';
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

test('signed-out detail redirects without fetching the character', async () => { isLoggedIn.mockReturnValue(false); const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<CharacterDetailPage params={{id:'c1'}}/>); await Promise.resolve();}); expect(characterApi.get).not.toHaveBeenCalled(); expect(replace).toHaveBeenCalled(); await act(async()=>root.unmount()); });
test('404 and delete failure keep a safe localized detail state', async () => { characterApi.get.mockRejectedValueOnce({status:404}); const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<CharacterDetailPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); expect(host.textContent).toContain('Character not found.'); await act(async()=>root.unmount()); });
test('generic load failure is safe and a rejected delete preserves the character', async () => { characterApi.get.mockRejectedValueOnce(new Error('offline')); const first=document.createElement('div'); const firstRoot=createRoot(first); await act(async()=>{firstRoot.render(<CharacterDetailPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); expect(first.textContent).toContain('Unable to load this character.'); await act(async()=>firstRoot.unmount()); characterApi.get.mockResolvedValue(CHARACTER); characterApi.remove.mockRejectedValueOnce(new Error('offline')); const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<CharacterDetailPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); await act(async()=>Array.from(host.querySelectorAll('button')).find((button)=>button.textContent==='Delete Character').click()); await act(async()=>host.querySelector('[role="dialog"] button:last-child').click()); expect(host.textContent).toContain('Lumi'); expect(host.textContent).toContain('Could not delete this character'); await act(async()=>root.unmount()); });
test('idle delete dialog focuses cancel, traps real Tab events, and returns focus after Escape', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  document.body.appendChild(host);
  await act(async () => {
    root.render(<CharacterDetailPage params={{ id: 'c1' }} />);
    await Promise.resolve();
    await Promise.resolve();
  });
  const trigger = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Delete Character');
  trigger.focus();
  await act(async () => trigger.click());
  const dialog = host.querySelector('[role="dialog"]');
  const cancel = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Cancel');
  const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete');
  expect(document.activeElement).toBe(cancel);

  const reverseTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
  await act(async () => dialog.dispatchEvent(reverseTab));
  expect(reverseTab.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(confirm);

  const forwardTab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => dialog.dispatchEvent(forwardTab));
  expect(forwardTab.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(cancel);

  await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  await act(async () => root.unmount());
  host.remove();
});

test('pending deletion focuses the dialog boundary, ignores Escape, traps Tab, and keeps the modal open', async () => {
  let resolveRemove;
  characterApi.remove.mockReturnValue(new Promise((resolve) => {
    resolveRemove = resolve;
  }));
  const host = document.createElement('div');
  const root = createRoot(host);
  document.body.appendChild(host);
  await act(async () => {
    root.render(<CharacterDetailPage params={{ id: 'c1' }} />);
    await Promise.resolve();
    await Promise.resolve();
  });
  await act(async () => Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Delete Character').click());
  const confirm = Array.from(host.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent === 'Delete');
  await act(async () => {
    confirm.click();
    await Promise.resolve();
  });

  const dialog = host.querySelector('[role="dialog"]');
  expect(document.activeElement).toBe(dialog);
  expect(Array.from(dialog.querySelectorAll('button')).every((button) => button.disabled)).toBe(true);

  await act(async () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
  expect(host.querySelector('[role="dialog"]')).toBe(dialog);

  const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  await act(async () => dialog.dispatchEvent(tab));
  expect(tab.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(dialog);
  expect(host.querySelector('[role="dialog"]')).toBe(dialog);
  expect(replace).not.toHaveBeenCalled();

  await act(async () => {
    resolveRemove({ success: true });
    await Promise.resolve();
  });
  expect(replace).toHaveBeenCalledWith('/my-stories');
  await act(async () => root.unmount());
  host.remove();
});

test('Hinglish detail localizes type, traits, and management actions', async () => {
  mockLang = 'hi';
  const host = document.createElement('div');
  const root = createRoot(host);
  document.body.appendChild(host);
  await act(async () => {
    root.render(<CharacterDetailPage params={{ id: 'c1' }} />);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(host.textContent).toContain('Lomdi · Dayalu · Jigyasu');
  expect(host.querySelector('a[href="/characters/c1/edit"]').textContent).toBe('Edit Karein');
  const deleteButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Kirdaar delete karein');
  expect(deleteButton).not.toBeNull();

  await act(async () => deleteButton.click());
  const dialog = host.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Lumi ko delete karein? Yeh undo nahi hoga.');
  expect(dialog.textContent).toContain('Raddh Karein');
  expect(dialog.textContent).toContain('Delete Karein');
  await act(async () => root.unmount());
  host.remove();
});
