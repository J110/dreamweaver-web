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
let latestWizard;
jest.mock('@/components/characters/CharacterWizard', () => (props) => { latestWizard = props; return <div data-inputs={props.initialInputs.name}><button onClick={() => props.onResult({ id: 'c1', portrait_url: '/new', profile: { name: 'Nova', character_type: 'fox', traits: ['kind'], profile_summary: 'New fox.' } })}>Complete</button><button onClick={props.onEdit}>Edit again</button><button onClick={props.onDelete}>Delete</button>wizard</div>; });
jest.mock('../../create/page.module.css', () => ({}));
test('loads old character, updates from the saved result, and remounts with new inputs', async () => { const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<EditCharacterPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); expect(host.textContent).toContain('Lumi'); await act(async()=>host.querySelector('button').click()); expect(host.textContent).toContain('wizard'); expect(host.textContent).not.toContain('Lumi'); await act(async()=>Array.from(host.querySelectorAll('button')).find((button)=>button.textContent==='Edit again').click()); expect(latestWizard.initialInputs.name).toBe('Nova'); await act(async()=>root.unmount()); });
test('edit callbacks retain routes for done and delete', async () => { const host=document.createElement('div'); const root=createRoot(host); await act(async()=>{root.render(<EditCharacterPage params={{id:'c1'}}/>); await Promise.resolve(); await Promise.resolve();}); expect(typeof latestWizard.onDone).toBe('function'); expect(typeof latestWizard.onDelete).toBe('function'); await act(async()=>root.unmount()); });
