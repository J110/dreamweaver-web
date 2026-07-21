# Premium Marketing Entry and Regional Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a prominent web-only Premium entry point and a clear monthly/annual Stripe purchase flow with India and rest-of-world display pricing.

**Architecture:** Keep Stripe Checkout and the existing backend plan identifiers authoritative. Add small client-side helpers for regional display and short-lived pricing intent, then connect the landing page, pricing page, and onboarding page without changing billing APIs or native purchase surfaces.

**Tech Stack:** Next.js App Router, React, CSS Modules, Jest, existing Stripe Checkout backend.

## Global Constraints

- Preserve the existing free hero CTA and native-app purchase restrictions.
- Render the new hero Premium CTA only when `nativeRequest === false`.
- Display India pricing as ₹500/month and ₹4,000/year; display ROW pricing as $6/month and $40/year.
- Label both paid plans `10% web discount`; keep annual selected and marked recommended by default.
- The India/ROW switch changes website presentation only. Never send a currency override to the backend.
- Continue calling `billingApi.startCheckout('monthly' | 'annual')`; the existing Stripe Prices and their INR currency options determine the Checkout currency.
- Preserve the existing portal, restore, success, cancellation, webhook, and entitlement flows.
- Keep pricing intent in `sessionStorage` with a 30-minute expiry; never auto-start a charge after onboarding.

---

### Task 1: Add regional-pricing and checkout-intent helpers

**Files:**
- Create: `src/utils/regionalPricing.js`
- Create: `src/utils/regionalPricing.test.js`
- Create: `src/utils/pricingIntent.js`
- Create: `src/utils/pricingIntent.test.js`

- [ ] **Step 1: Write failing regional-pricing tests**

```js
import {
  PRICING_REGIONS,
  getPlanPrice,
  inferPricingRegion,
} from './regionalPricing';

describe('regionalPricing', () => {
  test('uses India for an Indian locale or timezone', () => {
    expect(inferPricingRegion({ locale: 'en-IN', timeZone: 'UTC' })).toBe(PRICING_REGIONS.INDIA);
    expect(inferPricingRegion({ locale: 'en-US', timeZone: 'Asia/Kolkata' })).toBe(PRICING_REGIONS.INDIA);
  });

  test('uses ROW when neither signal indicates India', () => {
    expect(inferPricingRegion({ locale: 'en-US', timeZone: 'America/New_York' })).toBe(PRICING_REGIONS.ROW);
  });

  test('returns approved monthly and annual prices', () => {
    expect(getPlanPrice(PRICING_REGIONS.INDIA, 'monthly')).toEqual({ amount: '₹500', period: 'month' });
    expect(getPlanPrice(PRICING_REGIONS.INDIA, 'annual')).toEqual({ amount: '₹4,000', period: 'year' });
    expect(getPlanPrice(PRICING_REGIONS.ROW, 'monthly')).toEqual({ amount: '$6', period: 'month' });
    expect(getPlanPrice(PRICING_REGIONS.ROW, 'annual')).toEqual({ amount: '$40', period: 'year' });
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- --runInBand src/utils/regionalPricing.test.js`

Expected: FAIL because `regionalPricing.js` does not exist.

- [ ] **Step 3: Implement the regional-pricing helper**

```js
export const PRICING_REGIONS = Object.freeze({ INDIA: 'IN', ROW: 'ROW' });

const PRICES = Object.freeze({
  IN: Object.freeze({
    monthly: Object.freeze({ amount: '₹500', period: 'month' }),
    annual: Object.freeze({ amount: '₹4,000', period: 'year' }),
  }),
  ROW: Object.freeze({
    monthly: Object.freeze({ amount: '$6', period: 'month' }),
    annual: Object.freeze({ amount: '$40', period: 'year' }),
  }),
});

export function inferPricingRegion({ locale = '', timeZone = '' } = {}) {
  const indianLocale = /(?:^|[-_])IN$/i.test(locale);
  const indianTimeZone = timeZone === 'Asia/Kolkata' || timeZone === 'Asia/Calcutta';
  return indianLocale || indianTimeZone ? PRICING_REGIONS.INDIA : PRICING_REGIONS.ROW;
}

export function getPlanPrice(region, plan) {
  const safeRegion = region === PRICING_REGIONS.INDIA ? region : PRICING_REGIONS.ROW;
  return PRICES[safeRegion][plan];
}
```

- [ ] **Step 4: Write failing pricing-intent tests**

Use a fake `sessionStorage` and fake clock. Cover saving only `monthly`/`annual`, reading a valid intent, deleting an invalid value, deleting an expired value, clearing the value, and returning `/pricing?plan=annual` or `/pricing?plan=monthly` only when an intent is valid.

```js
import {
  clearPricingIntent,
  getPricingReturnPath,
  readPricingIntent,
  savePricingIntent,
} from './pricingIntent';

describe('pricingIntent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  });

  afterEach(() => jest.restoreAllMocks());

  test('round-trips a valid plan and builds its pricing return path', () => {
    savePricingIntent('annual');
    expect(readPricingIntent()).toBe('annual');
    expect(getPricingReturnPath()).toBe('/pricing?plan=annual');
  });

  test('rejects invalid and expired intents', () => {
    savePricingIntent('lifetime');
    expect(readPricingIntent()).toBeNull();
    sessionStorage.setItem('dv_pricing_intent', JSON.stringify({ plan: 'monthly', createdAt: 1 }));
    expect(readPricingIntent()).toBeNull();
    expect(getPricingReturnPath()).toBe('/');
  });

  test('clears an intent', () => {
    savePricingIntent('monthly');
    clearPricingIntent();
    expect(readPricingIntent()).toBeNull();
  });
});
```

- [ ] **Step 5: Run the test and confirm RED**

Run: `npm test -- --runInBand src/utils/pricingIntent.test.js`

Expected: FAIL because `pricingIntent.js` does not exist.

- [ ] **Step 6: Implement the short-lived intent helper**

```js
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
```

- [ ] **Step 7: Run both helper test files and confirm GREEN**

Run: `npm test -- --runInBand src/utils/regionalPricing.test.js src/utils/pricingIntent.test.js`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/utils/regionalPricing.js src/utils/regionalPricing.test.js src/utils/pricingIntent.js src/utils/pricingIntent.test.js
git commit -m "feat: add regional pricing intent helpers"
```

---

### Task 2: Add the prominent web-only hero CTA

**Files:**
- Modify: `src/components/landing/landingCopy.js`
- Modify: `src/components/landing/LandingPage.js:328-337`
- Modify: `src/components/landing/landing.module.css:233-276`
- Create: `src/components/landing/LandingPage.test.js`

- [ ] **Step 1: Write a failing landing CTA regression test**

Mock `next/link`, `useI18n`, and the media APIs already mocked by landing tests. Render `<LandingPage nativeRequest={false} />` and assert that a `Get Premium` link points to `/pricing`; render with `nativeRequest={true}` and assert that the link is absent. Also assert the existing free CTA is present in both renders.

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- --runInBand src/components/landing/LandingPage.test.js`

Expected: FAIL because the hero has no Premium link.

- [ ] **Step 3: Add localized hero copy**

Add `premiumCta` under both `hero` dictionaries:

```js
premiumCta: 'Get Premium',
```

```js
premiumCta: 'Premium lein',
```

- [ ] **Step 4: Render the CTA beside the current hero controls**

Inside `heroCtas`, after the free CTA and before the “See how it works” button:

```jsx
{!nativeRequest && (
  <Link href="/pricing" className={styles.ctaPremium}>
    {c.hero.premiumCta}
  </Link>
)}
```

- [ ] **Step 5: Style it as a prominent but secondary purchase action**

Add `.ctaPremium` beside `.ctaPrimary`/`.ctaSecondary`, using the existing gold gradient, rounded shape, focus-visible state, and mobile full-width behavior. Do not change the visual priority of `.ctaPrimary`.

- [ ] **Step 6: Run the regression test and confirm GREEN**

Run: `npm test -- --runInBand src/components/landing/LandingPage.test.js`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/landing/landingCopy.js src/components/landing/LandingPage.js src/components/landing/landing.module.css src/components/landing/LandingPage.test.js
git commit -m "feat: add prominent premium landing entry"
```

---

### Task 3: Replace the hidden monthly link with explicit regional plan choices

**Files:**
- Modify: `src/app/pricing/PricingClient.js:1-277`
- Modify: `src/app/pricing/page.module.css:1-219`
- Create: `src/app/pricing/PricingClient.test.js`

- [ ] **Step 1: Write failing pricing-page behavior tests**

Mock `billingApi`, `subscriptionApi`, `isLoggedIn`, `openCheckoutUrl`, and `next/navigation`. Assert:

- India inference renders `₹500` monthly and `₹4,000` annual.
- ROW renders `$6` monthly and `$40` annual.
- Both plans visibly show `10% web discount`.
- Annual is selected/recommended by default and monthly can be selected.
- An authenticated click calls `billingApi.startCheckout` with only the selected plan identifier.
- An anonymous click saves the selected plan and routes to `/onboarding`.
- A saved intent/query plan selects the returning plan but does not auto-start Checkout.

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- --runInBand src/app/pricing/PricingClient.test.js`

Expected: FAIL because the current page hardcodes annual USD and hides monthly in a text link.

- [ ] **Step 3: Add regional and selected-plan state**

Import `useSearchParams`, regional helpers, and intent helpers. Initialize ROW for SSR, then infer on mount using:

```js
const locale = navigator.language || '';
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
setRegion(inferPricingRegion({ locale, timeZone }));
const requestedPlan = searchParams.get('plan');
setSelectedPlan(requestedPlan === 'monthly' || requestedPlan === 'annual'
  ? requestedPlan
  : readPricingIntent() || 'annual');
```

- [ ] **Step 4: Add the visible India/ROW switch**

Render two accessible buttons above the plans. Use `aria-pressed`, labels `India (₹)` and `Rest of world ($)`, and localize the surrounding “Showing prices for” text. The switch changes `region` only.

- [ ] **Step 5: Render two explicit paid plan options**

Within the Premium card, replace the one hardcoded annual price plus monthly text link with two radio-like buttons:

```jsx
{['annual', 'monthly'].map((plan) => {
  const price = getPlanPrice(region, plan);
  const selected = selectedPlan === plan;
  return (
    <button
      key={plan}
      type="button"
      className={`${styles.planOption} ${selected ? styles.planOptionSelected : ''}`}
      aria-pressed={selected}
      onClick={() => setSelectedPlan(plan)}
    >
      <span>{plan === 'annual' ? annualLabel : monthlyLabel}</span>
      {plan === 'annual' && <span className={styles.recommendedBadge}>{recommendedLabel}</span>}
      <strong>{price.amount}</strong>
      <span>/{price.period}</span>
      <span className={styles.webDiscountBadge}>10% web discount</span>
    </button>
  );
})}
```

Keep Annual first and selected by default. Retain the shared Premium benefits list and existing seven-day-trial copy.

- [ ] **Step 6: Route purchase intent correctly**

Use one purchase handler:

```js
function continueWithPlan() {
  savePricingIntent(selectedPlan);
  if (!authed) {
    router.push('/onboarding');
    return;
  }
  startCheckout(selectedPlan);
}
```

Clear the intent only after `billingApi.startCheckout(selectedPlan)` returns a non-empty `checkout_url`, immediately before `openCheckoutUrl(checkout_url)`. Keep the intent when Checkout creation fails so retrying preserves the plan.

- [ ] **Step 7: Add analytics at decision points**

Use the existing `dvAnalytics` utility:

```js
dvAnalytics.track('pricing_region_changed', { region });
dvAnalytics.track('pricing_plan_selected', { plan, region });
dvAnalytics.track('pricing_checkout_started', { plan: selectedPlan, region, authenticated: authed });
```

Do not include price, currency, username, or other identity values in these events.

- [ ] **Step 8: Style the selector and plans responsively**

Add CSS Module classes for `regionSwitch`, `regionButton`, `regionButtonActive`, `planOptions`, `planOption`, `planOptionSelected`, `recommendedBadge`, and `webDiscountBadge`. On narrow screens stack plans; on wider screens show two columns. Preserve accessible focus outlines and the current card contrast.

- [ ] **Step 9: Run the pricing tests and confirm GREEN**

Run: `npm test -- --runInBand src/app/pricing/PricingClient.test.js`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/app/pricing/PricingClient.js src/app/pricing/page.module.css src/app/pricing/PricingClient.test.js
git commit -m "feat: show monthly annual regional web pricing"
```

---

### Task 4: Return onboarding users to their selected plan

**Files:**
- Modify: `src/app/onboarding/page.js:1-145`
- Create: `src/app/onboarding/page.test.js`

- [ ] **Step 1: Write failing onboarding-return tests**

Mock the auth API and router. Cover all three successful branches:

- Existing device account returns a token and routes to `/pricing?plan=monthly` when monthly intent exists.
- Local-only onboarding routes to `/pricing?plan=annual` when annual intent exists.
- Authenticated onboarding routes to `/pricing?plan=annual` when annual intent exists.
- All branches continue to route to `/` when there is no valid intent.

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test -- --runInBand src/app/onboarding/page.test.js`

Expected: FAIL because every successful branch currently hardcodes `/`.

- [ ] **Step 3: Use the safe intent return helper**

Import `getPricingReturnPath` from `@/utils/pricingIntent` and replace each successful `router.replace('/')` in `handleSubmit` with:

```js
router.replace(getPricingReturnPath());
```

Do not clear the intent here. `AppShell` is allowed to mint the device token when the user reaches public `/pricing`; the pricing page then preserves the selected plan and requires an explicit second confirmation before Checkout.

- [ ] **Step 4: Run onboarding and intent tests and confirm GREEN**

Run: `npm test -- --runInBand src/app/onboarding/page.test.js src/utils/pricingIntent.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/page.js src/app/onboarding/page.test.js
git commit -m "feat: return onboarding users to premium plan"
```

---

### Task 5: Verify the full web purchase path and deploy safely

**Files:**
- Verify only; no expected source changes.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- --runInBand \
  src/utils/regionalPricing.test.js \
  src/utils/pricingIntent.test.js \
  src/components/landing/LandingPage.test.js \
  src/app/pricing/PricingClient.test.js \
  src/app/onboarding/page.test.js
```

Expected: all PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Next.js build completes with no errors.

- [ ] **Step 3: Complete browser verification before deployment**

Verify in a desktop private window and a narrow mobile viewport:

- Homepage shows the free CTA plus a prominent `Get Premium` CTA; native app mode does not show the Premium CTA.
- India inference and manual switch show ₹500/month and ₹4,000/year; ROW shows $6/month and $40/year.
- Annual is recommended/default, Monthly is visible, and both show `10% web discount`.
- Anonymous Monthly selection completes onboarding and returns to Monthly without auto-opening Checkout.
- Authenticated Monthly and Annual selections each open Stripe Checkout; Checkout shows the correct live localized currency based on Stripe's customer location.

- [ ] **Step 4: Run the existing production deploy guard**

Run the repository's documented web production deployment command only after the guard reports success. If the guard fails, stop and fix the reported condition; do not bypass it.

- [ ] **Step 5: Deploy the verified web build**

Use the existing Dream Valley web production deployment procedure. Do not restart or modify the backend because this feature does not change backend code or environment variables.

- [ ] **Step 6: Verify production**

Open `https://dreamvalley.app/` and `https://dreamvalley.app/pricing` in a private window. Repeat the homepage, regional display, onboarding-return, Monthly Checkout, and Annual Checkout checks. Confirm the Stripe customer portal, restore link, success URL, and cancel URL still open their existing destinations.

- [ ] **Step 7: Commit any test-only correction separately**

If production verification exposes a defect, return to the relevant task's RED/GREEN steps and commit the smallest correction. Do not make untracked production-only edits.

