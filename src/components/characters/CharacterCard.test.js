/** @jest-environment jsdom */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CharacterCard from './CharacterCard';
jest.mock('next/link', () => ({ children, href, ...props }) => <a href={href} {...props}>{children}</a>);
jest.mock('next/image', () => ({ src, alt, ...props }) => <img src={src} alt={alt} {...props} />);
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => ({ characterTypeFox: 'Fox', characterTraitKind: 'Kind' }[key] || key) }) }));
test('uses the fixed shelf card and localized accessible character label', () => { const host = document.createElement('div'); const root = createRoot(host); act(() => root.render(<CharacterCard character={{ id: 'c1', portrait_url: '/x', profile: { name: 'Lumi', character_type: 'fox', traits: ['kind'] } }} />)); expect(host.querySelector('a').getAttribute('aria-label')).toBe('Lumi'); expect(host.querySelector('img')).not.toBeNull(); act(() => root.unmount()); });
