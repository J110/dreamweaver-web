import {
  clearPendingJob,
  createIdempotencyKey,
  loadPendingJob,
  savePendingJob,
  validateIdentity,
  validatePersonality,
} from './characterWizard';

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
  expect(createIdempotencyKey()).toMatch(/^character-[a-z0-9-]{16,}$/);
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
