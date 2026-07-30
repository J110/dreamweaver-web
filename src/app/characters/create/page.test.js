/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, hydrateRoot } from 'react-dom/client';

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { renderToString } = require('react-dom/server');

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/utils/auth', () => ({ isLoggedIn: jest.fn(), getUser: jest.fn() }));
jest.mock('@/utils/api', () => ({
  characterApi: { list: jest.fn(), get: jest.fn(), quote: jest.fn(), createGeneration: jest.fn(), editGeneration: jest.fn(), generation: jest.fn(), remove: jest.fn() },
}));
jest.mock('@/utils/characterWizard', () => {
  const actual = jest.requireActual('@/utils/characterWizard');
  return { ...actual, loadPendingJob: jest.fn(), savePendingJob: jest.fn(), clearPendingJob: jest.fn() };
});
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => ({
  characterTitle: 'Create Character',
  characterIdentity: 'Identity',
  characterPersonality: 'Personality',
  characterReview: 'Review',
  characterSurpriseName: 'Surprise name',
  characterSurpriseType: 'Surprise type',
  characterSurpriseGender: 'Surprise gender',
  characterContinue: 'Continue',
  characterCreate: 'Create Character',
  characterConfirm: 'Confirm',
  characterPaidTitle: 'Create for 2 credits?',
  characterPaidBody: 'This uses {cost} credits and leaves {balance} credits.',
  characterSlot: 'Slot',
  characterDone: 'Done',
  characterBack: 'Back',
  characterName: 'Name',
  characterType: 'Type',
  characterGender: 'Gender',
  characterTraits: 'Traits',
  characterDetails: 'Details',
  characterGenerating: 'Creating your character…',
  characterFailed: 'Could not create your character',
  characterConnectionFailed: 'Connection interrupted. Your character is still being created.',
  characterRetry: 'Retry',
  characterQuoteFailed: 'Could not refresh your quote',
  characterErrorStaleQuote: 'Your balance or slot changed. Review the refreshed quote.',
  characterDeleteFailed: 'Could not delete this character',
  characterCancel: 'Cancel',
  characterEdit: 'Edit',
  characterDelete: 'Delete',
}[key] || key), lang: 'en' }) }));
jest.mock('./page.module.css', () => ({}));

import CreateCharacterPage from './page';

const { useRouter: mockUseRouter } = require('next/navigation');
const { isLoggedIn: mockIsLoggedIn, getUser: mockGetUser } = require('@/utils/auth');
const { characterApi: mockCharacterApi } = require('@/utils/api');
const { loadPendingJob: mockLoadPendingJob, clearPendingJob: mockClearPendingJob } = require('@/utils/characterWizard');
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockQuote = mockCharacterApi.quote;
const mockCreateGeneration = mockCharacterApi.createGeneration;
const mockGeneration = mockCharacterApi.generation;
const mockGetCharacter = mockCharacterApi.get;
const mockRemoveCharacter = mockCharacterApi.remove;

global.IS_REACT_ACT_ENVIRONMENT = true;

const FREE_QUOTE = {
  slot_number: 1,
  credit_cost: 0,
  credits_before: 3,
  credits_after: 3,
  quote_version: 'q1',
};

const PAID_QUOTE = {
  slot_number: 4,
  credit_cost: 2,
  credits_before: 3,
  credits_after: 1,
  quote_version: 'q2',
};

const click = async (container, label) => {
  const button = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === label);
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderPage = async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => {
    root.render(<CreateCharacterPage />);
    await Promise.resolve();
    await Promise.resolve();
  });
  return { container, root };
};

const reachReview = async (container) => {
  await click(container, 'Surprise name');
  await click(container, 'Surprise type');
  await click(container, 'Surprise gender');
  await click(container, 'Continue');
  await click(container, 'Continue');
};

beforeEach(() => {
  mockReplace.mockReset();
  mockPush.mockReset();
  mockUseRouter.mockReturnValue({ replace: mockReplace, push: mockPush });
  mockIsLoggedIn.mockReturnValue(true);
  mockGetUser.mockReturnValue({ uid: 'user-1' });
  mockQuote.mockReset().mockResolvedValue(FREE_QUOTE);
  mockCreateGeneration.mockReset().mockResolvedValue({ id: 'job-1', status: 'accepted' });
  mockGeneration.mockReset();
  mockGetCharacter.mockReset();
  mockRemoveCharacter.mockReset().mockResolvedValue({ success: true });
  mockLoadPendingJob.mockReset().mockReturnValue(null);
  mockClearPendingJob.mockReset();
});

test('signed-out users are redirected before the wizard renders', async () => {
  mockIsLoggedIn.mockReturnValue(false);
  const { container, root } = await renderPage();

  expect(mockReplace).toHaveBeenCalledWith('/login?intent=%2Fcharacters%2Fcreate');
  expect(container.textContent).toBe('');

  await act(async () => root.unmount());
  container.remove();
});

test('server markup hydrates from an unresolved auth state before reading the user', async () => {
  const serverMarkup = renderToString(<CreateCharacterPage />);
  expect(serverMarkup).toBe('');
  expect(mockGetUser).not.toHaveBeenCalled();
  const container = document.createElement('div');
  container.innerHTML = serverMarkup;
  document.body.appendChild(container);
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  let root;

  await act(async () => {
    root = hydrateRoot(container, <CreateCharacterPage />);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(mockGetUser).toHaveBeenCalledTimes(1);
  expect(container.textContent).toContain('Create Character');
  expect(error.mock.calls.join(' ')).not.toContain('Hydration failed');

  await act(async () => root.unmount());
  error.mockRestore();
  container.remove();
});

test('identity and personality advance to a free review quote', async () => {
  const { container, root } = await renderPage();

  await reachReview(container);

  expect(container.textContent).toContain('Slot 1 of 30');
  expect(Array.from(container.querySelectorAll('button')).find((item) => item.textContent === 'Create Character').disabled).toBe(false);

  await act(async () => root.unmount());
  container.remove();
});

test('paid create requires confirmation and submits once', async () => {
  mockQuote.mockResolvedValue(PAID_QUOTE);
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  expect(container.querySelector('[role="dialog"]').textContent).toContain('Create for 2 credits?');
  await click(container, 'Confirm');

  expect(mockCreateGeneration).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
});

test('reload resumes a pending job without submitting another', async () => {
  mockLoadPendingJob.mockReturnValue({ jobId: 'job-1', mode: 'create', targetCharacterId: null, startedAt: Date.now() });
  mockGeneration.mockResolvedValue({
    id: 'job-1', status: 'completed', character_id: 'character-1',
  });
  mockGetCharacter.mockResolvedValue({
    id: 'character-1', profile: { name: 'Lumi', character_type: 'fox', gender: 'not_specified', traits: ['kind'], profile_summary: 'A moon fox.' },
    portrait_url: '/media/lumi.webp',
  });
  const { container, root } = await renderPage();

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(container.textContent).toContain('Lumi');
  expect(mockGetCharacter).toHaveBeenCalledWith('character-1');
  expect(container.textContent).not.toContain('Use in a story');
  expect(Array.from(container.querySelectorAll('button')).map((item) => item.textContent)).toEqual(
    expect.arrayContaining(['Done', 'Edit', 'Delete'])
  );
  expect(mockCreateGeneration).not.toHaveBeenCalled();

  await act(async () => root.unmount());
  container.remove();
});

test('a terminal backend failure clears pending state and rotates the idempotency key for a new generation', async () => {
  mockCreateGeneration
    .mockResolvedValueOnce({ id: 'job-1', status: 'accepted' })
    .mockResolvedValueOnce({ id: 'job-2', status: 'accepted' });
  mockGeneration
    .mockResolvedValueOnce({ id: 'job-1', status: 'failed' })
    .mockResolvedValueOnce({ id: 'job-2', status: 'accepted' });
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockClearPendingJob).toHaveBeenCalledWith('user-1');

  await click(container, 'Retry');
  await click(container, 'Create Character');
  expect(mockCreateGeneration).toHaveBeenCalledTimes(2);
  expect(mockCreateGeneration.mock.calls[1][0].idempotency_key).not.toBe(mockCreateGeneration.mock.calls[0][0].idempotency_key);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(mockGeneration).toHaveBeenCalledTimes(2);

  await act(async () => root.unmount());
  container.remove();
});

test('quote outage is visible and retry refreshes a failed accepted job', async () => {
  mockQuote.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(FREE_QUOTE);
  const { container, root } = await renderPage();

  await click(container, 'Surprise name');
  await click(container, 'Surprise type');
  await click(container, 'Surprise gender');
  await click(container, 'Continue');
  await click(container, 'Continue');
  expect(container.textContent).toContain('Could not refresh your quote');

  await click(container, 'Continue');
  mockGeneration.mockResolvedValue({ id: 'job-1', status: 'failed' });
  await click(container, 'Create Character');
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(container.textContent).toContain('Could not create your character');
  await click(container, 'Retry');

  expect(mockQuote).toHaveBeenCalledTimes(3);
  expect(Array.from(container.querySelectorAll('button')).find((item) => item.textContent === 'Create Character').disabled).toBe(false);

  await act(async () => root.unmount());
  container.remove();
});

test('completed result routes to edit and confirms deletion before navigating away', async () => {
  mockLoadPendingJob.mockReturnValue({ jobId: 'job-1', mode: 'create', targetCharacterId: null, startedAt: Date.now() });
  mockGeneration.mockResolvedValue({ id: 'job-1', status: 'completed', character_id: 'character-1' });
  mockGetCharacter.mockResolvedValue({ id: 'character-1', profile: { name: 'Lumi', profile_summary: 'A moon fox.' } });
  window.confirm = jest.fn(() => true);
  const { container, root } = await renderPage();

  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  await click(container, 'Edit');
  expect(mockPush).toHaveBeenCalledWith('/characters/character-1/edit');
  await click(container, 'Delete');

  expect(window.confirm).toHaveBeenCalled();
  expect(mockRemoveCharacter).toHaveBeenCalledWith('character-1');
  expect(mockPush).toHaveBeenCalledWith('/my-stories');

  await act(async () => root.unmount());
  container.remove();
});

test('known submission and delete failures show localized recoverable errors', async () => {
  mockCreateGeneration.mockRejectedValue(new Error('stale_quote: {"credits":0}'));
  const first = await renderPage();

  await reachReview(first.container);
  await click(first.container, 'Create Character');
  expect(first.container.textContent).toContain('Your balance or slot changed. Review the refreshed quote.');
  expect(first.container.textContent).not.toContain('{"credits":0}');
  await act(async () => first.root.unmount());
  first.container.remove();

  mockLoadPendingJob.mockReturnValue({ jobId: 'job-1', mode: 'create', targetCharacterId: null, startedAt: Date.now() });
  mockGeneration.mockResolvedValue({ id: 'job-1', status: 'completed', character_id: 'character-1' });
  mockGetCharacter.mockResolvedValue({ id: 'character-1', profile: { name: 'Lumi', profile_summary: 'A moon fox.' } });
  mockRemoveCharacter.mockRejectedValue(new Error('offline'));
  window.confirm = jest.fn(() => true);
  const second = await renderPage();

  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
  await click(second.container, 'Delete');
  expect(second.container.textContent).toContain('Could not delete this character');
  expect(mockPush).not.toHaveBeenCalled();

  await act(async () => second.root.unmount());
  second.container.remove();
});

test('transport exhaustion preserves its job and resumes polling without another generation', async () => {
  jest.useFakeTimers();
  mockGeneration
    .mockRejectedValueOnce(new Error('offline'))
    .mockRejectedValueOnce(new Error('offline'))
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ id: 'job-1', status: 'completed', character_id: 'character-1' });
  mockGetCharacter.mockResolvedValue({ id: 'character-1', profile: { name: 'Lumi', profile_summary: 'A moon fox.' } });
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  await act(async () => { await jest.advanceTimersByTimeAsync(4000); });

  expect(mockGeneration).toHaveBeenCalledTimes(3);
  expect(container.textContent).toContain('Connection interrupted. Your character is still being created.');
  expect(mockClearPendingJob).not.toHaveBeenCalled();
  await click(container, 'Retry');
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(container.textContent).toContain('Lumi');
  expect(mockCreateGeneration).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  container.remove();
  jest.useRealTimers();
});

test('stale quotes refresh the review and reuse the original idempotency key for retry', async () => {
  mockQuote.mockResolvedValueOnce(FREE_QUOTE).mockResolvedValueOnce(PAID_QUOTE);
  mockCreateGeneration
    .mockRejectedValueOnce(new Error('stale_quote'))
    .mockResolvedValueOnce({ id: 'job-1', status: 'accepted' });
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  expect(container.textContent).toContain('Slot 4 of 30');
  expect(mockQuote).toHaveBeenCalledTimes(2);
  await click(container, 'Create Character');
  expect(container.querySelector('[role="dialog"]').textContent).toContain('This uses 2 credits and leaves 1 credits.');
  await click(container, 'Confirm');

  expect(mockCreateGeneration).toHaveBeenCalledTimes(2);
  expect(mockCreateGeneration.mock.calls[1][0].quote_version).toBe('q2');
  expect(mockCreateGeneration.mock.calls[1][0].idempotency_key).toBe(mockCreateGeneration.mock.calls[0][0].idempotency_key);

  await act(async () => root.unmount());
  container.remove();
});

test('slow and late polls neither overlap nor update after unmount', async () => {
  jest.useFakeTimers();
  let resolvePoll;
  mockGeneration.mockReturnValue(new Promise((resolve) => { resolvePoll = resolve; }));
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  await act(async () => { await jest.advanceTimersByTimeAsync(10000); });
  expect(mockGeneration).toHaveBeenCalledTimes(1);

  await act(async () => root.unmount());
  resolvePoll({ id: 'job-1', status: 'completed', character_id: 'character-1' });
  await act(async () => { await Promise.resolve(); });
  expect(mockGetCharacter).not.toHaveBeenCalled();

  container.remove();
  jest.useRealTimers();
});

test('surprise state is announced and the paid dialog closes on Escape', async () => {
  mockQuote.mockResolvedValue(PAID_QUOTE);
  const { container, root } = await renderPage();

  await click(container, 'Surprise name');
  expect(Array.from(container.querySelectorAll('button')).find((item) => item.textContent === 'Surprise name').getAttribute('aria-pressed')).toBe('true');
  await click(container, 'Surprise type');
  await click(container, 'Surprise gender');
  await click(container, 'Continue');
  await click(container, 'Continue');
  const opener = Array.from(container.querySelectorAll('button')).find((item) => item.textContent === 'Create Character');
  opener.focus();
  await click(container, 'Create Character');
  const dialog = container.querySelector('[role="dialog"]');
  expect(document.activeElement.textContent).toBe('Confirm');
  await act(async () => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await Promise.resolve();
  });
  expect(document.activeElement.textContent).toBe('Cancel');
  await act(async () => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.resolve();
  });

  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(opener);
  await act(async () => root.unmount());
  container.remove();
});

test('paid confirmation keeps its focus boundary and ignores Escape while in flight', async () => {
  mockQuote.mockResolvedValue(PAID_QUOTE);
  mockCreateGeneration.mockImplementation(() => new Promise(() => {}));
  const { container, root } = await renderPage();

  await reachReview(container);
  await click(container, 'Create Character');
  await click(container, 'Confirm');
  const dialog = container.querySelector('[role="dialog"]');
  expect(Array.from(dialog.querySelectorAll('button')).every((button) => button.disabled)).toBe(true);
  expect(document.activeElement).toBe(dialog);
  await act(async () => {
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await Promise.resolve();
  });

  expect(container.querySelector('[role="dialog"]')).toBe(dialog);
  expect(document.activeElement).toBe(dialog);
  await act(async () => root.unmount());
  container.remove();
});
