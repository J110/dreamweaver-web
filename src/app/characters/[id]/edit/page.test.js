/** @jest-environment jsdom */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import EditCharacterPage from './page';

const mockRouter = { replace: jest.fn() };
let mockLoggedIn = true;
let mockWizardMount = 0;

jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/utils/auth', () => ({
  isLoggedIn: jest.fn(() => mockLoggedIn),
  getUser: jest.fn(() => ({ uid: 'u1' })),
}));
jest.mock('@/utils/api', () => ({
  characterApi: {
    get: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
jest.mock('@/components/characters/CharacterWizard', () => {
  const React = require('react');
  const { characterApi } = require('@/utils/api');
  return function CharacterWizardFake(props) {
    const [mountId] = React.useState(() => ++mockWizardMount);
    const [name] = React.useState(() => props.initialInputs.name);
    const [result, setResult] = React.useState(null);
    const [failed, setFailed] = React.useState(false);
    const saved = {
      id: 'c1',
      portrait_url: '/new',
      profile: {
        name: 'Nova',
        character_type: 'fox',
        traits: ['kind'],
        profile_summary: 'New fox.',
      },
    };

    if (failed) {
      return <section data-mount-id={mountId}><p>Generation failed</p></section>;
    }
    if (result) {
      return (
        <section data-mount-id={mountId} data-initial-name={props.initialInputs.name}>
          <h2>{result.profile.name}</h2>
          <button type="button" onClick={props.onDone}>Done</button>
          <button type="button" onClick={props.onEdit}>Edit again</button>
          <button type="button" onClick={async () => {
            await characterApi.remove(result.id);
            props.onDelete();
          }}>Delete</button>
        </section>
      );
    }
    return (
      <section data-mount-id={mountId} data-initial-name={props.initialInputs.name}>
        <input aria-label="Name" value={name} readOnly />
        <button type="button" onClick={() => {
          setResult(saved);
          props.onResult(saved);
        }}>Complete</button>
        <button type="button" onClick={() => setFailed(true)}>Fail generation</button>
      </section>
    );
  };
});
jest.mock('../../create/page.module.css', () => ({}));

const { characterApi } = require('@/utils/api');
const OLD_CHARACTER = {
  id: 'c1',
  portrait_url: '/x',
  profile: {
    name: 'Lumi',
    character_type: 'fox',
    traits: ['kind'],
    profile_summary: 'Moon fox.',
  },
};

let host;
let root;

async function renderPage() {
  await act(async () => {
    root.render(<EditCharacterPage params={{ id: 'c1' }} />);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function button(name) {
  return Array.from(host.querySelectorAll('button')).find((item) => item.textContent === name);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoggedIn = true;
  mockWizardMount = 0;
  characterApi.get.mockResolvedValue(OLD_CHARACTER);
  characterApi.remove.mockResolvedValue({ success: true });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('saved results update wizard inputs and Edit remounts with the saved values', async () => {
  await renderPage();
  const firstWizard = host.querySelector('[data-mount-id]');
  const firstMount = firstWizard.getAttribute('data-mount-id');
  expect(host.querySelector('input[aria-label="Name"]').value).toBe('Lumi');

  await act(async () => button('Complete').click());

  expect(host.querySelector('[data-initial-name]').getAttribute('data-initial-name')).toBe('Nova');
  expect(host.textContent).not.toContain('Moon fox.');

  await act(async () => button('Edit again').click());

  const remountedWizard = host.querySelector('[data-mount-id]');
  expect(remountedWizard.getAttribute('data-mount-id')).not.toBe(firstMount);
  expect(host.querySelector('input[aria-label="Name"]').value).toBe('Nova');
  expect(host.textContent).toContain('New fox.');
});

test('Done, Edit, and Delete callbacks preserve exact navigation and removal behavior', async () => {
  await renderPage();
  await act(async () => button('Complete').click());

  await act(async () => button('Done').click());
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenLastCalledWith('/characters/c1');
  expect(characterApi.remove).not.toHaveBeenCalled();

  mockRouter.replace.mockClear();
  await act(async () => button('Edit again').click());
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(characterApi.remove).not.toHaveBeenCalled();

  await act(async () => button('Complete').click());
  await act(async () => {
    button('Delete').click();
    await Promise.resolve();
  });
  expect(characterApi.remove).toHaveBeenCalledTimes(1);
  expect(characterApi.remove).toHaveBeenCalledWith('c1');
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/my-stories');
});

test('signed-out edit redirects without fetching the character', async () => {
  mockLoggedIn = false;
  await renderPage();

  expect(characterApi.get).not.toHaveBeenCalled();
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/login?intent=%2Fcharacters%2Fc1%2Fedit');
});

test('terminal edit failure retains the old character detail', async () => {
  await renderPage();
  await act(async () => button('Fail generation').click());

  expect(host.textContent).toContain('Generation failed');
  expect(host.querySelector('h1').textContent).toBe('Lumi');
  expect(host.textContent).toContain('Moon fox.');
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(characterApi.remove).not.toHaveBeenCalled();
});
