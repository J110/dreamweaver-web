const INTENT_KEY = 'dv_upgrade_intent';

function _isSafeRelativePath(value) {
  // Single leading slash only. Reject '//evil.com' and '/\evil.com' —
  // browsers/Next router treat those as protocol-relative external URLs (open redirect).
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.startsWith('/\\');
}

export const setUpgradeIntent = (path) => {
  if (!path) return;
  if (!_isSafeRelativePath(path)) return;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INTENT_KEY, path);
  } catch {
  }
};

export const captureIntentFromQuery = (searchParams) => {
  if (!searchParams) return null;
  const value = searchParams.get('intent');
  if (!value) return null;
  setUpgradeIntent(value);
  return _isSafeRelativePath(value) ? value : null;
};

export const getUpgradeIntent = () => {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(INTENT_KEY) || null;
  } catch {
    return null;
  }
};

export const consumeUpgradeIntent = () => {
  if (typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(INTENT_KEY);
    if (value) sessionStorage.removeItem(INTENT_KEY);
    return value || null;
  } catch {
    return null;
  }
};

export const returnToIntent = (router) => {
  const intent = consumeUpgradeIntent();
  router.replace(intent || '/');
};
