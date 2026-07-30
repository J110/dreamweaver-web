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

export const validateIdentity = ({
  name = '',
  surpriseName = false,
  characterType = '',
  surpriseType = false,
  gender = '',
  surpriseGender = false,
} = {}) => {
  const errors = {};
  if (!surpriseName && !name.trim()) errors.name = 'Enter a name or choose Surprise me';
  if (name.length > 40) errors.name = 'Keep names under 40 characters';
  if (!surpriseType && !characterType) errors.characterType = 'Choose a type or Surprise me';
  if (!surpriseGender && !gender) errors.gender = 'Choose a gender or Surprise me';
  return errors;
};

export const validatePersonality = ({ traits = [], customDescription = '' } = {}) => {
  const errors = {};
  if (traits.length > 5) errors.traits = 'Choose up to 5 traits';
  if (customDescription.length > 300) errors.customDescription = 'Keep details under 300 characters';
  return errors;
};

export const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `character-${crypto.randomUUID()}`;
  }
  return `character-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const savePendingJob = (uid, job) => {
  if (typeof localStorage === 'undefined' || !uid) return;
  const pendingJob = {
    jobId: job.jobId,
    mode: job.mode,
    targetCharacterId: job.targetCharacterId ?? null,
    startedAt: job.startedAt,
  };
  localStorage.setItem(pendingJobKey(uid), JSON.stringify(pendingJob));
};

export const loadPendingJob = (uid) => {
  if (typeof localStorage === 'undefined' || !uid) return null;
  try {
    return JSON.parse(localStorage.getItem(pendingJobKey(uid)) || 'null');
  } catch {
    localStorage.removeItem(pendingJobKey(uid));
    return null;
  }
};

export const clearPendingJob = (uid) => {
  if (typeof localStorage !== 'undefined' && uid) localStorage.removeItem(pendingJobKey(uid));
};
