/** @jest-environment jsdom */

import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { I18nProvider, useI18n } from './i18n';

global.IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ onValue }) {
  const value = useI18n();

  useEffect(() => {
    onValue(value);
  }, [onValue, value]);

  return null;
}

function mountProvider() {
  const container = document.createElement('div');
  const root = createRoot(container);
  let current;
  const onValue = (value) => {
    current = value;
  };

  document.body.appendChild(container);
  act(() => {
    root.render(
      <I18nProvider>
        <Probe onValue={onValue} />
      </I18nProvider>,
    );
  });

  return {
    get current() {
      return current;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = '';
});

test('persisted Hindi initializes the provider and document language as hi', () => {
  localStorage.setItem('dreamvalley_lang', 'hi');

  const provider = mountProvider();

  expect(provider.current.lang).toBe('hi');
  expect(document.documentElement.lang).toBe('hi');
  provider.unmount();
});

test('provider language changes set the exact supported document language', () => {
  localStorage.setItem('dreamvalley_lang', 'hi');
  const provider = mountProvider();

  act(() => provider.current.setLang('en'));
  expect(provider.current.lang).toBe('en');
  expect(document.documentElement.lang).toBe('en');

  act(() => provider.current.setLang('hi'));
  expect(provider.current.lang).toBe('hi');
  expect(document.documentElement.lang).toBe('hi');
  provider.unmount();
});
