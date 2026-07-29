const KEY = 'dv_pricing_intent';
const TTL_MS = 30 * 60 * 1000;
const VALID_PLANS = new Set(['monthly', 'annual']);

export function clearPricingIntent() {
  try { sessionStorage.removeItem(KEY); } catch {}
}

export function savePricingIntent(plan) {
  if (!VALID_PLANS.has(plan)) {
    clearPricingIntent();
    return;
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ plan, createdAt: Date.now() }));
  } catch {}
}

export function readPricingIntent() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!value || !VALID_PLANS.has(value.plan) || Date.now() - value.createdAt > TTL_MS) {
      clearPricingIntent();
      return null;
    }
    return value.plan;
  } catch {
    clearPricingIntent();
    return null;
  }
}

export function getPricingReturnPath() {
  const plan = readPricingIntent();
  return plan ? `/pricing?plan=${plan}` : '/';
}
