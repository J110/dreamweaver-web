/** @jest-environment jsdom */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/utils/auth', () => ({ isLoggedIn: jest.fn(), getUser: jest.fn() }));
jest.mock('@/utils/api', () => ({
  characterApi: { quote: jest.fn(), createGeneration: jest.fn(), editGeneration: jest.fn(), generation: jest.fn(), remove: jest.fn() },
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
  characterCancel: 'Cancel',
  characterEdit: 'Edit',
  characterDelete: 'Delete',
}[key] || key), lang: 'en' }) }));
jest.mock('./page.module.css', () => ({}));

import CreateCharacterPage from './page';

const { useRouter: mockUseRouter } = require('next/navigation');
const { isLoggedIn: mockIsLoggedIn, getUser: mockGetUser } = require('@/utils/auth');
const { characterApi: mockCharacterApi } = require('@/utils/api');
const { loadPendingJob: mockLoadPendingJob } = require('@/utils/characterWizard');
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockQuote = mockCharacterApi.quote;
const mockCreateGeneration = mockCharacterApi.createGeneration;
const mockGeneration = mockCharacterApi.generation;

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
  mockLoadPendingJob.mockReset().mockReturnValue(null);
});

test('signed-out users are redirected before the wizard renders', async () => {
  mockIsLoggedIn.mockReturnValue(false);
  const { container, root } = await renderPage();

  expect(mockReplace).toHaveBeenCalledWith('/login?intent=%2Fcharacters%2Fcreate');
  expect(container.textContent).toBe('');

  await act(async () => root.unmount());
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
    id: 'job-1', status: 'completed', character: {
      profile: { name: 'Lumi', character_type: 'fox', gender: 'not_specified', traits: ['kind'], profile_summary: 'A moon fox.' },
      portrait_url: '/media/lumi.webp',
    },
  });
  const { container, root } = await renderPage();

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(container.textContent).toContain('Lumi');
  expect(container.textContent).not.toContain('Use in a story');
  expect(Array.from(container.querySelectorAll('button')).map((item) => item.textContent)).toEqual(
    expect.arrayContaining(['Done', 'Edit', 'Delete'])
  );
  expect(mockCreateGeneration).not.toHaveBeenCalled();

  await act(async () => root.unmount());
  container.remove();
});
