/** @jest-environment jsdom */

import React, { createRef } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CreationCard from './CreationCard';
import LockedPreviewCard from './LockedPreviewCard';
import ComingSoonDialog from './ComingSoonDialog';

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
    <CreationCard icon="＋" label="Create Character" onActivate={onActivate} />
  ));
  host.querySelector('button').click();
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('locked preview is announced as locked and activates', () => {
  const onActivate = jest.fn();
  act(() => root.render(
    <LockedPreviewCard imageSrc="/upgrade-showcase.webp" label="Moon Explorer" onActivate={onActivate} />
  ));
  const button = host.querySelector('button');
  expect(button.getAttribute('aria-label')).toContain('Locked');
  button.click();
  expect(onActivate).toHaveBeenCalledTimes(1);
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
});
