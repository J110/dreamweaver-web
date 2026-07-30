import {
  clearPendingJob,
  createIdempotencyKey,
  loadPendingJob,
  savePendingJob,
  validateIdentity,
  validatePersonality,
} from './characterWizard';
import { characterApi } from './api';

beforeEach(() => {
  const entries = new Map();
  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => entries.get(key) || null,
      setItem: (key, value) => entries.set(key, String(value)),
      removeItem: (key) => entries.delete(key),
    },
  });
});

test('identity accepts explicit values or surprise flags', () => {
  expect(validateIdentity({
    name: '',
    surpriseName: true,
    characterType: '',
    surpriseType: true,
    gender: 'not_specified',
    surpriseGender: false,
  })).toEqual({});
});

test('personality limits traits and description', () => {
  expect(validatePersonality({
    traits: ['brave', 'curious', 'kind', 'playful', 'gentle', 'wise'],
    customDescription: 'x'.repeat(301),
  })).toEqual({
    traits: 'Choose up to 5 traits',
    customDescription: 'Keep details under 300 characters',
  });
});

test('idempotency keys are stable for one submission and nonempty', () => {
  const key = createIdempotencyKey();
  expect(key).toMatch(/^character-[a-z0-9-]{16,}$/);
  expect(createIdempotencyKey(key)).toBe(key);
});

test('pending jobs persist only resumable fields for their user', () => {
  savePendingJob('user-1', {
    jobId: 'job-1',
    mode: 'edit',
    targetCharacterId: 'character-1',
    startedAt: '2026-07-30T00:00:00.000Z',
    customDescription: 'never persist this',
  });

  expect(loadPendingJob('user-1')).toEqual({
    jobId: 'job-1',
    mode: 'edit',
    targetCharacterId: 'character-1',
    startedAt: '2026-07-30T00:00:00.000Z',
  });
  expect(localStorage.getItem('dv_character_job:user-1')).not.toContain('never persist this');

  clearPendingJob('user-1');
  expect(loadPendingJob('user-1')).toBeNull();
});

test('identity and personality reject malformed values and unknown choices', () => {
  expect(validateIdentity({
    name: null,
    surpriseName: false,
    characterType: 'wolf',
    surpriseType: false,
    gender: [],
    surpriseGender: false,
  })).toEqual({
    name: 'Enter a valid name or choose Surprise me',
    characterType: 'Choose a valid type or Surprise me',
    gender: 'Choose a valid gender or Surprise me',
  });
  expect(validateIdentity(null)).toEqual({
    name: 'Enter a valid name or choose Surprise me',
    characterType: 'Choose a valid type or Surprise me',
    gender: 'Choose a valid gender or Surprise me',
  });
  expect(validatePersonality({ traits: 'kind', customDescription: null })).toEqual({
    traits: 'Choose valid traits',
    customDescription: 'Enter details as text',
  });
  expect(validateIdentity({ surpriseName: [], surpriseType: 'yes', surpriseGender: null })).toEqual({
    name: 'Enter a valid name or choose Surprise me',
    characterType: 'Choose a valid type or Surprise me',
    gender: 'Choose a valid gender or Surprise me',
  });
});

test('idempotency fallback uses cryptographic random bytes', () => {
  const getRandomValues = jest.fn((values) => values.fill(171));
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: { getRandomValues },
  });

  expect(createIdempotencyKey()).toBe(`character-${'ab'.repeat(16)}`);
  expect(getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
});

test('idempotency keys use crypto random UUID when available', () => {
  const randomUUID = jest.fn(() => '123e4567-e89b-12d3-a456-426614174000');
  Object.defineProperty(global, 'crypto', {
    configurable: true,
    value: { randomUUID },
  });

  expect(createIdempotencyKey()).toBe('character-123e4567-e89b-12d3-a456-426614174000');
  expect(randomUUID).toHaveBeenCalledTimes(1);
});

test('invalid and cross-user pending jobs are cleared without storage failures', () => {
  localStorage.setItem('dv_character_job:user-1', JSON.stringify({
    jobId: 'job-1', mode: 'invalid', targetCharacterId: null, startedAt: 1, extra: true,
  }));

  expect(loadPendingJob('user-1')).toBeNull();
  expect(localStorage.getItem('dv_character_job:user-1')).toBeNull();
  expect(loadPendingJob('user-2')).toBeNull();

  Object.defineProperty(global, 'localStorage', {
    configurable: true,
    value: {
      getItem: () => { throw new Error('storage denied'); },
      setItem: () => { throw new Error('storage denied'); },
      removeItem: () => { throw new Error('storage denied'); },
    },
  });

  expect(() => savePendingJob('user-1', { jobId: 'job-1', mode: 'create', startedAt: 1 })).not.toThrow();
  expect(loadPendingJob('user-1')).toBeNull();
  expect(() => clearPendingJob('user-1')).not.toThrow();
});

test('completed generation and delete invalidate character cache once', async () => {
  global.fetch = jest.fn((url) => Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      data: String(url).includes('/generations/')
        ? { id: 'job-1', status: 'completed', character_id: 'character-1' }
        : {},
    }),
  }));

  await characterApi.list();
  await characterApi.get('character-1');
  await characterApi.generation('job-1');
  await characterApi.list();
  await characterApi.get('character-1');
  await characterApi.generation('job-1');
  await characterApi.list();
  await characterApi.remove('character-1');
  await characterApi.list();

  expect(global.fetch).toHaveBeenCalledTimes(8);
});
