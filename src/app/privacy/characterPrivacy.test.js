/** @jest-environment jsdom */

import React from 'react';
import PrivacyPolicyPage from './page';

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { renderToStaticMarkup } = require('react-dom/server');

jest.mock('@/components/StarField', () => () => null);
jest.mock('./page.module.css', () => ({}));

test('privacy policy discloses character generation storage, sharing, and deletion', () => {
  const text = renderToStaticMarkup(<PrivacyPolicyPage />);

  expect(text).toContain('Character names, descriptions, generated profiles, and portraits are stored with your account');
  expect(text).toContain('contracted AI generation providers solely to provide the requested feature');
  expect(text).toContain('Reference images are not collected');
  expect(text).toContain('queued media cleanup removes its portrait');
});
