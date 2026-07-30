/** @jest-environment jsdom */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import EditCharacterPage from './page';
const mockRouter = { replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }));
jest.mock('@/utils/auth', () => ({ isLoggedIn: () => true, getUser: () => ({ uid: 'u1' }) }));
jest.mock('@/utils/api', () => ({ characterApi: { get: jest.fn().mockResolvedValue({ id: 'c1', portrait_url: '/x', profile: { name: 'Lumi', character_type: 'fox', traits: ['kind'], profile_summary: 'Moon fox.' } }) } }));
jest.mock('@/utils/i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
jest.mock('@/components/characters/CharacterWizard', () => ({ initialInputs }) => <div data-inputs={initialInputs.name}>wizard</div>);
jest.mock('../../create/page.module.css', () => ({}));
test('loads old character summary and maps it into the edit wizard', async () => { const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<EditCharacterPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); expect(host.textContent).toContain('Lumi'); expect(host.querySelector('[data-inputs]').getAttribute('data-inputs')).toBe('Lumi'); await act(async()=>root.unmount()); });
