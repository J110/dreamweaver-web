export const UPGRADE_WASH_SEEN_KEY = 'dv_emberlight_wash_seen_v1';
const upgradeWashSeenThisSession = new Set();

function washSeenKey(familyId) {
  return `${UPGRADE_WASH_SEEN_KEY}:${familyId || 'anonymous'}`;
}

export function readUpgradeWashSeen(storage, familyId) {
  const key = washSeenKey(familyId);
  if (upgradeWashSeenThisSession.has(key)) return true;
  try {
    return storage?.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function markUpgradeWashSeen(storage, familyId) {
  const key = washSeenKey(familyId);
  upgradeWashSeenThisSession.add(key);
  try {
    storage?.setItem(key, '1');
  } catch {}
}

export function shouldRunUpgradeWash({
  previous,
  current,
  seen,
  reducedMotion,
}) {
  return previous === false
    && current === true
    && seen !== true
    && reducedMotion !== true;
}

export function clampWashSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(10, Math.max(2, parsed));
}
