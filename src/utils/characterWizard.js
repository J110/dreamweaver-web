export const CHARACTER_TYPES = [
  'human_child', 'cat', 'dog', 'fox', 'rabbit', 'bear', 'bird',
  'dragon', 'unicorn', 'robot', 'mermaid', 'fairy', 'nature_spirit',
];

export const CHARACTER_GENDERS = ['girl', 'boy', 'non_binary', 'not_specified'];

export const CHARACTER_TRAITS = [
  'brave', 'curious', 'kind', 'playful', 'gentle', 'wise', 'funny',
  'shy', 'creative', 'loyal', 'adventurous', 'calm', 'dreamy', 'clever',
];

const pendingJobKey = (uid) => `dv_character_job:${uid}`;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const pendingJobIsValid = (job, exact = false) => {
  if (!isObject(job)) return false;
  if (exact && (Object.keys(job).length !== 4 || ![
    'jobId', 'mode', 'targetCharacterId', 'startedAt',
  ].every((key) => Object.prototype.hasOwnProperty.call(job, key)))) return false;
  if (typeof job.jobId !== 'string' || !job.jobId) return false;
  if (!['create', 'edit'].includes(job.mode)) return false;
  if (job.mode === 'edit' && (typeof job.targetCharacterId !== 'string' || !job.targetCharacterId)) return false;
  if (job.mode === 'create' && job.targetCharacterId !== null) return false;
  return (typeof job.startedAt === 'string' && job.startedAt.length > 0)
    || (typeof job.startedAt === 'number' && Number.isFinite(job.startedAt));
};

const storage = () => {
  try {
    const current = globalThis.localStorage;
    return current
      && typeof current.getItem === 'function'
      && typeof current.setItem === 'function'
      && typeof current.removeItem === 'function'
      ? current
      : null;
  } catch {
    return null;
  }
};

export const validateIdentity = (input = {}) => {
  const {
    name = '',
    surpriseName = false,
    characterType = '',
    surpriseType = false,
    gender = '',
    surpriseGender = false,
  } = isObject(input) ? input : {};
  const errors = {};
  if (surpriseName !== true && (typeof name !== 'string' || !name.trim())) {
    errors.name = 'Enter a valid name or choose Surprise me';
  } else if (surpriseName !== true && typeof name === 'string' && name.length > 40) {
    errors.name = 'Keep names under 40 characters';
  }
  if (surpriseType !== true && (typeof characterType !== 'string' || !CHARACTER_TYPES.includes(characterType))) {
    errors.characterType = 'Choose a valid type or Surprise me';
  }
  if (surpriseGender !== true && (typeof gender !== 'string' || !CHARACTER_GENDERS.includes(gender))) {
    errors.gender = 'Choose a valid gender or Surprise me';
  }
  return errors;
};

export const validatePersonality = (input = {}) => {
  const { traits = [], customDescription = '' } = isObject(input) ? input : {};
  const errors = {};
  if (!Array.isArray(traits) || traits.some((trait) => !CHARACTER_TRAITS.includes(trait))) {
    errors.traits = 'Choose valid traits';
  } else if (traits.length > 5) {
    errors.traits = 'Choose up to 5 traits';
  }
  if (typeof customDescription !== 'string') {
    errors.customDescription = 'Enter details as text';
  } else if (customDescription.length > 300) {
    errors.customDescription = 'Keep details under 300 characters';
  }
  return errors;
};

export const createIdempotencyKey = (existingKey = null) => {
  if (typeof existingKey === 'string' && /^character-[a-z0-9-]{16,}$/.test(existingKey)) {
    return existingKey;
  }
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `character-${cryptoApi.randomUUID()}`;
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return `character-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }
  throw new Error('Secure random unavailable');
};

export const savePendingJob = (uid, job) => {
  const currentStorage = storage();
  if (!currentStorage || typeof uid !== 'string' || !uid || !isObject(job)) return;
  const pendingJob = {
    jobId: job.jobId,
    mode: job.mode,
    targetCharacterId: job.targetCharacterId ?? null,
    startedAt: job.startedAt,
  };
  if (!pendingJobIsValid(pendingJob)) return;
  try {
    currentStorage.setItem(pendingJobKey(uid), JSON.stringify(pendingJob));
  } catch {}
};

export const loadPendingJob = (uid) => {
  const currentStorage = storage();
  if (!currentStorage || typeof uid !== 'string' || !uid) return null;
  try {
    const pendingJob = JSON.parse(currentStorage.getItem(pendingJobKey(uid)) || 'null');
    if (pendingJobIsValid(pendingJob, true)) return pendingJob;
    currentStorage.removeItem(pendingJobKey(uid));
    return null;
  } catch {
    try {
      currentStorage.removeItem(pendingJobKey(uid));
    } catch {}
    return null;
  }
};

export const clearPendingJob = (uid) => {
  const currentStorage = storage();
  if (!currentStorage || typeof uid !== 'string' || !uid) return;
  try {
    currentStorage.removeItem(pendingJobKey(uid));
  } catch {}
};
