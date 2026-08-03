/** @jest-environment jsdom */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CharacterCard from './CharacterCard';
import fs from 'fs';
import path from 'path';
jest.mock('next/link', () => ({ children, href, ...props }) => <a href={href} {...props}>{children}</a>);
jest.mock('next/image', () => ({ src, alt }) => <img src={src} alt={alt} />);
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => ({ characterTypeFox: 'Fox', characterTraitKind: 'Kind' }[key] || key) }) }));
test('uses separate artwork and formatted localized character metadata', () => { const host = document.createElement('div'); const root = createRoot(host); act(() => root.render(<CharacterCard character={{ id: 'c1', portrait_url: '/x', profile: { name: 'Lumi', character_type: 'fox', traits: ['kind'] } }} />)); expect(host.querySelector('a').getAttribute('aria-label')).toBe('Lumi'); expect(host.textContent).toContain('Fox'); expect(host.textContent).toContain('Kind'); expect(host.querySelector('img')).not.toBeNull(); expect(host.querySelector('strong').textContent).toBe('Lumi'); expect(host.querySelector('small').textContent).toBe('Kind'); act(() => root.unmount()); });
test('shared shelf geometry provides a containing block for fill portraits', () => { const css = fs.readFileSync(path.resolve(__dirname, '../my-content/PreviewCard.module.css'), 'utf8'); const card = css.match(/\.card \{([^}]*)\}/)?.[1]; expect(card).toMatch(/display: block;/); expect(card).toMatch(/width: 148px;/); expect(card).toMatch(/height: 196px;/); expect(card).toMatch(/position: relative;/); });
