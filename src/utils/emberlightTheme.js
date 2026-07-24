export const EFFECTIVE_PREMIUM_KEY = 'dv_effective_premium';
export const THEME_CHANGE_EVENT = 'dv-effective-premium-change';

export function resolveTheme({ effectivePremium, pathname }) {
  if (pathname === '/upgrade' || pathname?.startsWith('/upgrade?')) return 'premium';
  return effectivePremium === true ? 'premium' : 'free';
}

export function readEffectivePremium(storage) {
  try {
    const value = storage?.getItem(EFFECTIVE_PREMIUM_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {}
  return null;
}

export function cacheEffectivePremium(value, storage, eventTarget) {
  if (typeof value !== 'boolean') return;
  const previous = readEffectivePremium(storage);
  try {
    storage?.setItem(EFFECTIVE_PREMIUM_KEY, String(value));
  } catch {}
  if (previous === value) return;
  try {
    eventTarget?.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { previous, current: value },
    }));
  } catch {}
}
