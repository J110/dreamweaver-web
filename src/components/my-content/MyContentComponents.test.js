/** @jest-environment jsdom */

import React, { createRef } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import ContentShelf from './ContentShelf';
import CreationCard from './CreationCard';
import LockedPreviewCard from './LockedPreviewCard';
import ComingSoonDialog from './ComingSoonDialog';
import ContentCard from '../ContentCard';

jest.mock('next/link', () => function Link({ children, href }) {
  return <a href={href}>{children}</a>;
});

jest.mock('../../utils/ambientMusic', () => ({
  getAmbientMusic: jest.fn(),
}));

jest.mock('../../utils/listeningHistory', () => ({
  isListened: () => false,
}));

jest.mock('../../utils/analytics', () => ({
  dvAnalytics: { track: jest.fn() },
}));

jest.mock('../../utils/i18n', () => ({
  useI18n: () => ({ lang: 'en' }),
}));

let host;
let root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('creation card activates from click', () => {
  const onActivate = jest.fn();
  act(() => root.render(
    <CreationCard icon="＋" label="Create Character" statusLabel="Coming soon" onActivate={onActivate} />
  ));
  host.querySelector('button').click();
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('shelf associates a whitespace title with one heading ID', () => {
  act(() => root.render(<ContentShelf title="My Characters" />));
  const heading = host.querySelector('h2');
  const labelledBy = host.querySelector('section').getAttribute('aria-labelledby');

  expect(labelledBy).toBe(heading.id);
  expect(labelledBy).not.toMatch(/\s/);
});

test('shelf gives a real ContentCard the fixed shelf item contract', () => {
  act(() => root.render(
    <ContentShelf title="Favorites">
      <ContentCard content={{
        id: 'favorite-1',
        title: 'Moon Story',
        type: 'story',
        category: 'bedtime',
        age_group: '2-5',
        duration: 5,
      }} />
    </ContentShelf>
  ));
  const card = host.querySelector('.card-interactive');
  const shelfItem = card.parentElement;

  expect(shelfItem.className).toContain('item');
  expect(shelfItem.parentElement.className).toContain('track');
});

test('locked preview is announced as locked and activates', () => {
  const onActivate = jest.fn();
  act(() => root.render(
    <LockedPreviewCard
      imageSrc="/upgrade-showcase.webp"
      label="Moon Explorer"
      lockedLabel="Locked"
      onActivate={onActivate}
    />
  ));
  const button = host.querySelector('button');
  expect(button.getAttribute('aria-label')).toContain('Locked');
  button.click();
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('creation card renders caller-supplied Hindi status copy', () => {
  act(() => root.render(
    <CreationCard icon="＋" label="Kirdaar Banayein" statusLabel="Jaldi aa raha hai" />
  ));
  expect(host.textContent).toContain('Jaldi aa raha hai');
  expect(host.textContent).not.toContain('Coming soon');
});

test('locked preview renders caller-supplied Hindi status copy', () => {
  act(() => root.render(
    <LockedPreviewCard
      imageSrc="/upgrade-showcase.webp"
      label="Chaand ka Khoji"
      lockedLabel="Band hai"
    />
  ));
  expect(host.textContent).toContain('Band hai');
  expect(host.textContent).not.toContain('Locked');
  expect(host.querySelector('[aria-label="Band hai: Chaand ka Khoji"]')).not.toBeNull();
});

test('dialog closes on Escape and restores trigger focus', () => {
  const triggerRef = createRef();
  const onClose = jest.fn();
  act(() => root.render(
    <>
      <button ref={triggerRef}>Open</button>
      <ComingSoonDialog
        kind="character"
        copy={{ title: 'Characters are coming soon', body: 'We are preparing this feature.', close: 'Got it' }}
        onClose={onClose}
        triggerRef={triggerRef}
      />
    </>
  ));
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(triggerRef.current).toBe(document.activeElement);
});
