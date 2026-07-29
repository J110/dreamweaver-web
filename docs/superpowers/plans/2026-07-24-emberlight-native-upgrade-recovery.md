# Emberlight Native Upgrade Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the locked-story preview with the shared Emberlight upgrade page and restore iOS StoreKit subscriptions through RevenueCat.

**Architecture:** The player becomes a redirect-only entry point for locked content. `/upgrade` owns both checkout branches: guarded Stripe on web and the existing `DreamValleyPurchase` bridge on native platforms.

**Tech Stack:** Next.js 14, React, Jest, Flutter WebView bridge, RevenueCat, StoreKit

## Global Constraints

- Preserve the current Emberlight layout and visual tokens.
- Do not duplicate native purchase logic in the player.
- Keep web checkout fail-closed when subscription status is unknown.
- Return to the original locked item only after backend-confirmed premium entitlement.

---

### Task 1: Lock redirect regression

**Files:**
- Modify: `src/app/player/[id]/page.js`
- Test: `src/app/player/LockedPremiumRedirect.test.js`

**Interfaces:**
- Consumes: `setUpgradeIntent(intentPath)` and Next.js router.
- Produces: redirect from locked content to `/upgrade?intent=<encoded intent>`.

- [ ] **Step 1: Write the failing test**

```js
expect(source).toContain('router.replace(`/upgrade?intent=');
expect(source).not.toContain('<LockedCTA');
expect(source).not.toContain('<UpgradeShowcase');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/player/LockedPremiumRedirect.test.js --runInBand`
Expected: FAIL because the player still renders `LockedCTA` and `UpgradeShowcase`.

- [ ] **Step 3: Implement the redirect**

Store `/player/${params.id}?autoplay=1`, replace the route with `/upgrade?intent=...`, render only a neutral loading state while navigation completes, and delete `LockedCTA`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/player/LockedPremiumRedirect.test.js --runInBand`
Expected: PASS.

### Task 2: Restore native upgrade access

**Files:**
- Modify: `src/app/upgrade/page.js`
- Modify: `src/middleware.js`
- Test: `src/app/upgrade/NativeUpgradeRoute.test.js`

**Interfaces:**
- Consumes: native user-agent detection in middleware.
- Produces: native access to `/upgrade`; `/pricing` remains web-only.

- [ ] **Step 1: Write the failing test**

```js
expect(upgradePage).not.toContain('isNativeRequest');
expect(middleware).toContain("matcher: ['/pricing']");
expect(middleware).not.toContain("'/pricing', '/upgrade'");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/upgrade/NativeUpgradeRoute.test.js --runInBand`
Expected: FAIL because both route guards still block `/upgrade`.

- [ ] **Step 3: Remove only the `/upgrade` native guards**

Render `UpgradeClient` unconditionally and leave middleware protection on `/pricing`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/upgrade/NativeUpgradeRoute.test.js --runInBand`
Expected: PASS.

### Task 3: Restore RevenueCat checkout inside Emberlight

**Files:**
- Create: `src/utils/nativePurchase.js`
- Modify: `src/app/upgrade/UpgradeClient.js`
- Modify: `src/app/upgrade/page.module.css`
- Test: `src/utils/nativePurchase.test.js`
- Test: `src/app/upgrade/NativeUpgradeCheckout.test.js`

**Interfaces:**
- Consumes: `window.DreamValleyPurchase`, `subscriptionApi.reconcileRevenueCat()`, `getUser()`, and `useParentalGate()`.
- Produces: `getNativeOfferings()`, `purchaseNative()`, `restoreNativeForUser()`, `recoverActivePurchase()`, and backend-confirmed return routing.

- [ ] **Step 1: Write failing bridge and UI tests**

```js
expect(source).toContain('getNativeOfferings');
expect(source).toContain('purchaseNative');
expect(source).toContain('<NativePaywall router={router} />');
expect(source).toContain('returnToIntent(router)');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/utils/nativePurchase.test.js src/app/upgrade/NativeUpgradeCheckout.test.js --runInBand`
Expected: FAIL because the native purchase bridge is absent from the release.

- [ ] **Step 3: Merge the native purchase flow into Emberlight**

Add the proven RevenueCat bridge helpers and native paywall state machine. Style plan options, disclosures, errors, and restore actions with the existing Emberlight variables.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/utils/nativePurchase.test.js src/app/upgrade/NativeUpgradeCheckout.test.js --runInBand`
Expected: PASS.

### Task 4: Verify and deploy

**Files:**
- Test: existing Jest and Emberlight suites

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: tested GCP release with rollback.

- [ ] **Step 1: Run all tests**

Run: `npm test -- --runInBand`
Expected: all suites pass.

- [ ] **Step 2: Run Emberlight verification**

Run: `npm run verify:emberlight`
Expected: exit 0.

- [ ] **Step 3: Build production**

Run: `npm run build`
Expected: 257 pages compile successfully.

- [ ] **Step 4: Commit and push**

```bash
git add src docs/superpowers
git commit -m "fix: restore native Emberlight upgrade flow"
git push origin HEAD:main
```

- [ ] **Step 5: Deploy with guardrails**

Build commit in a new GCP release directory, preflight `/upgrade` with web and native user agents, atomically activate it, retain rollback, verify production visually, and run Deploy Guard checks.
