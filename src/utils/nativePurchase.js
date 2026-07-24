'use client';

const RC_MONTHLY = '$rc_monthly';
const RC_ANNUAL = '$rc_annual';

export function nativePurchaseBridge() {
  if (typeof window === 'undefined') return null;
  const bridge = window.DreamValleyPurchase;
  return bridge?.isAvailable === true ? bridge : null;
}

export function parseOfferings(raw) {
  const packages = Array.isArray(raw?.packages) ? raw.packages : [];
  let monthly = null;
  let annual = null;
  const other = [];

  for (const pkg of packages) {
    if (!pkg?.id) continue;
    if (pkg.id === RC_MONTHLY && !monthly) monthly = pkg;
    else if (pkg.id === RC_ANNUAL && !annual) annual = pkg;
    else other.push(pkg);
  }

  return { monthly, annual, other, all: packages };
}

export async function getNativeOfferings() {
  const bridge = nativePurchaseBridge();
  if (!bridge) return null;
  try {
    const raw = await bridge.getOfferings();
    return raw ? parseOfferings(raw) : null;
  } catch {
    return null;
  }
}

export async function identifyNative(uid) {
  const bridge = nativePurchaseBridge();
  if (!bridge || !uid) return false;
  try {
    return (await bridge.identify(uid)) === true;
  } catch {
    return false;
  }
}

export async function purchaseNative(packageId) {
  const bridge = nativePurchaseBridge();
  if (!bridge) return { success: false, error: 'bridge_unavailable' };
  if (!packageId) return { success: false, error: 'missing_package' };
  try {
    const result = await bridge.purchase(packageId);
    return {
      success: result?.success === true,
      error: result?.error || null,
    };
  } catch (error) {
    return { success: false, error: error?.message || 'purchase_failed' };
  }
}

export async function restoreNative() {
  const bridge = nativePurchaseBridge();
  if (!bridge) return { success: false, active: false, error: 'bridge_unavailable' };
  try {
    const result = await bridge.restore();
    return {
      success: result?.success === true,
      active: result?.active === true,
      error: result?.error || null,
    };
  } catch (error) {
    return { success: false, active: false, error: error?.message || 'restore_failed' };
  }
}

export async function restoreNativeForUser(
  uid,
  { identify = identifyNative, restore = restoreNative } = {},
) {
  if (uid) await identify(uid);
  let result = await restore();
  if (!result.success && uid && result.error !== 'identity_mismatch') {
    await identify(uid);
    result = await restore();
  }
  return result;
}

export async function recoverActivePurchase(purchaseResult, restore = restoreNative) {
  if (purchaseResult?.success) return purchaseResult;
  if (['cancelled', 'identity_mismatch', 'not_identified'].includes(purchaseResult?.error)) {
    return purchaseResult;
  }
  const restored = await restore();
  return restored?.success && restored?.active
    ? { success: true, restored: true }
    : purchaseResult;
}

export function isAmbiguousPurchaseResult(result) {
  return result?.success === false && result?.error === 'timeout';
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

export async function pollEntitlementUntilPremium(
  fetchIsPremium,
  { attempts = 6, delayMs = 1500, signal } = {},
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal?.aborted) return false;
    try {
      if ((await fetchIsPremium()) === true) return true;
    } catch {}
    if (signal?.aborted) return false;
    if (attempt < attempts - 1) await sleep(delayMs, signal);
  }
  return false;
}

export async function confirmEntitlementAfterPurchase(
  fetchIsPremium,
  { attempts = 6, delayMs = 1500, signal } = {},
) {
  if (await pollEntitlementUntilPremium(fetchIsPremium, { attempts, delayMs, signal })) {
    return 'premium';
  }
  if (signal?.aborted) return 'aborted';
  const result = await restoreNative();
  return result.success && result.active ? 'activating' : 'failed';
}
