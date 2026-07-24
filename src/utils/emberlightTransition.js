export const UPGRADE_WASH_SEEN_KEY = 'dv_emberlight_wash_seen_v1';
let upgradeWashSeenThisSession = false;

export function readUpgradeWashSeen(storage) {
  if (upgradeWashSeenThisSession) return true;
  try {
    return storage?.getItem(UPGRADE_WASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markUpgradeWashSeen(storage) {
  upgradeWashSeenThisSession = true;
  try {
    storage?.setItem(UPGRADE_WASH_SEEN_KEY, '1');
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
