'use client';

const RC_MONTHLY = '$rc_monthly';
const RC_ANNUAL = '$rc_annual';

export function nativePurchaseBridge() {
  if (typeof window === 'undefined') return null;
  const b = window.DreamValleyPurchase;
  return b && b.isAvailable === true ? b : null;
}

export function isNativePurchaseAvailable() {
  return nativePurchaseBridge() !== null;
}

export function parseOfferings(raw) {
  const packages = raw && Array.isArray(raw.packages) ? raw.packages : [];
  let monthly = null;
  let annual = null;
  const other = [];
  for (const p of packages) {
    if (!p || !p.id) continue;
    if (p.id === RC_MONTHLY && !monthly) monthly = p;
    else if (p.id === RC_ANNUAL && !annual) annual = p;
    else other.push(p);
  }
  return { monthly, annual, other, all: packages };
}

export async function getNativeOfferings() {
  const b = nativePurchaseBridge();
  if (!b) return null;
  try {
    const raw = await b.getOfferings();
    return raw ? parseOfferings(raw) : null;
  } catch {
    return null;
  }
}

export async function identifyNative(uid) {
  const b = nativePurchaseBridge();
  if (!b || !uid) return false;
  try {
    return (await b.identify(uid)) === true;
  } catch {
    return false;
  }
}

export async function logoutNative() {
  const b = nativePurchaseBridge();
  if (!b) return;
  try {
    await b.logout();
  } catch {
    /* best-effort */
  }
}

export async function purchaseNative(packageId, { gate } = {}) {
  const b = nativePurchaseBridge();
  if (!b) return { success: false, error: 'bridge_unavailable' };
  if (!packageId) return { success: false, error: 'missing_package' };
  if (typeof gate === 'function') {
    let passed = false;
    try {
      passed = (await gate()) === true;
    } catch {
      passed = false;
    }
    if (!passed) return { success: false, error: 'gate_failed' };
  }
  try {
    const r = await b.purchase(packageId);
    return { success: !!(r && r.success === true), error: (r && r.error) || null };
  } catch (e) {
    return { success: false, error: (e && e.message) || 'purchase_failed' };
  }
}

export async function restoreNative() {
  const b = nativePurchaseBridge();
  if (!b) return { success: false, active: false, error: 'bridge_unavailable' };
  try {
    const r = await b.restore();
    return {
      success: !!(r && r.success === true),
      active: !!(r && r.active),
      error: (r && r.error) || null,
    };
  } catch (e) {
    return { success: false, active: false, error: (e && e.message) || 'restore_failed' };
  }
}

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    }
  });
}

export async function pollEntitlementUntilPremium(
  fetchIsPremium,
  { attempts = 6, delayMs = 1500, signal } = {},
) {
  for (let i = 0; i < attempts; i += 1) {
    if (signal && signal.aborted) return false;
    try {
      if ((await fetchIsPremium()) === true) return true;
    } catch {
      /* keep polling */
    }
    if (signal && signal.aborted) return false;
    if (i < attempts - 1) await sleep(delayMs, signal);
  }
  return false;
}

export async function confirmEntitlementAfterPurchase(
  fetchIsPremium,
  { attempts = 6, delayMs = 1500, signal } = {},
) {
  const viaBackend = await pollEntitlementUntilPremium(fetchIsPremium, { attempts, delayMs, signal });
  if (viaBackend) return { entitled: true, via: 'backend' };
  if (signal && signal.aborted) return { entitled: false, via: null };
  const r = await restoreNative();
  if (r.success && r.active) return { entitled: true, via: 'sdk_optimistic' };
  return { entitled: false, via: null };
}
