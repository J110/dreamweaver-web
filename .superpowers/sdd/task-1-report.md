# Task 1: Theme-gated ambient fireflies

## Root cause

`StarField` generated only position, size, and twinkle timing. Premium mode therefore had no per-particle transform path, and the shared star CSS could not render differentiated firefly motion. The fixed field also did not clip transformed children.

## RED evidence

The regression was added before production changes. The initial test environment lacked `@babel/runtime`, then required the jsdom environment; after those test-runtime prerequisites were corrected, the regression failed as intended:

```
Expected: not ""
Received: ""
particles[0].style.getPropertyValue('--firefly-drift-x')
```

## GREEN evidence

```
npx jest src/components/StarField.test.js --runInBand
1 passed, 1 total

npm run test:emberlight
7 passed, 7 total; 28 passed, 28 total

npx jest --runInBand
9 passed, 9 total; 32 passed, 32 total

npm run verify:emberlight
exit 0
```

## Final behavior-level entitlement review fixes

### Root cause

`handleStartTrial` fetched a subscription baseline but ignored its result, so confirmed premium, failed entitlement lookups, and unconfirmed payloads all proceeded to checkout. Controller regressions also inspected source text rather than exercising root attributes and browser events.

### RED evidence

The new mounted behavior tests ran before the checkout guard was changed:

```
npx jest src/components/EmberlightThemeController.test.js src/app/upgrade/UpgradeClient.test.js --runInBand

confirmed premium: expected billingApi.startCheckout not to have been called; received 1 call
failed entitlement request: expected billingApi.startCheckout not to have been called; received 1 call
missing entitlement boolean: expected billingApi.startCheckout not to have been called; received 1 call
```

The controller mount tests were GREEN against the existing fail-closed controller, validating that the source-text checks could be removed without reducing coverage.

### Fix and behavior coverage

- Checkout now proceeds only after `effective_premium === false`.
- A confirmed premium result displays already-premium guidance; rejected or unconfirmed results display a retry error and never open checkout.
- Mounted JSDOM controller tests cover stale persisted `true`, same-tab confirmation, cross-tab true/false/clear/account replacement, and `navigator.connection` saver true, supported false, and unsupported states.
- The focused Emberlight script now includes the mounted `UpgradeClient` test.

### GREEN evidence

```
Focused mounted suites
2 suites passed; 9 tests passed

npm run test:emberlight
8 suites passed; 41 tests passed

npx jest --runInBand
10 suites passed; 45 tests passed

npm run verify:emberlight
exit 0
```

## Whole-branch entitlement and battery review fixes

### Root causes

- The controller read persisted premium state on mount, allowing a stale cached `true` to select premium before a confirmed event.
- Checkout started without first fetching `/subscriptions/current`, so a first purchaser had no confirmed `false` cache transition before the later `true` confirmation.
- Wash persistence and its in-memory replay guard used one device-wide key instead of an account/family namespace.
- Premium fireflies had no battery-saver selector, while missing connection capability cleared the saver attribute and kept decorative motion active.

### RED evidence

The new regressions ran before production edits:

```
npx jest src/components/EmberlightThemeController.test.js src/utils/emberlightTransition.test.js src/components/StarField.test.js src/app/upgrade/upgradeTheme.test.js --runInBand

Theme controller: expected applyTheme(false), event.newValue === 'true', and account replacement handling; absent.
Upgrade baseline: expected await subscriptionApi.getCurrent() before checkout; absent.
Wash namespace: family-b expected false; received true.
Battery saver: expected premium battery CSS rule; rule was undefined.
```

### Fixes

- Mount, unknown events, storage clear, and account replacement now resolve free; same-tab confirmed event detail is authoritative, and cross-tab effective-premium storage uses `event.newValue`.
- Checkout awaits `subscriptionApi.getCurrent()` before starting payment and tolerates a fetch failure without inferring a free entitlement or changing the preview.
- Wash storage and session replay state are keyed by `getStoredFamilyId()` with an `anonymous` fallback.
- Premium battery-saver CSS disables firefly animation; controller defaults to saver activity when connection capability is unavailable while preserving normal motion for explicit `saveData === false`.
- Restored `docs/superpowers/plans/2026-07-24-emberlight-premium-theme.md` unchanged from the provided source.

### GREEN evidence

```
Focused affected suites
5 suites passed; 30 tests passed

npm run test:emberlight
7 suites passed; 38 tests passed

npx jest --runInBand
9 suites passed; 42 tests passed

npm run verify:emberlight
exit 0
```

## CSSOM timing declaration coverage

### Test strengthening

The timing regression now asserts the loaded premium CSSOM animation declaration consumes both `var(--firefly-wander-duration)` and `var(--firefly-glow-duration)`. The free twinkle declaration must consume `var(--star-twinkle-duration)` and `var(--star-twinkle-delay)`.

### Mutation RED evidence

```
npx jest src/components/StarField.test.js --runInBand -t "independent premium"
fireflyWander 4s => Expected substring: "var(--firefly-wander-duration)"; received declaration: "fireflyWander 4s ..."

npx jest src/components/StarField.test.js --runInBand -t "retains all 60"
twinkle 9s => Expected substring: "var(--star-twinkle-duration)"; received declaration: "twinkle 9s ..."
```

These failures prove the CSSOM fallback rejects hard-coded timing even when jsdom does not resolve custom-property animation durations through `getComputedStyle`.

### Final GREEN evidence

```
npx jest src/components/StarField.test.js --runInBand
1 suite passed; 6 tests passed

npm run test:emberlight
7 suites passed; 33 tests passed

npx jest --runInBand
9 suites passed; 37 tests passed

npm run verify:emberlight
exit 0
```

## Natural-motion revision

### Root cause

The earlier premium animation used two shared drift points over a short 2–5 second star timing cycle. It created synchronized straight-line return paths, showed only 24 particles, and inherited free-star placement rather than covering the premium scene evenly.

### RED evidence

The strengthened regression was written before revising production code. It failed against the prior implementation:

```
npx jest src/components/StarField.test.js --runInBand
--firefly-left Expected: not ""; Received: ""
premium visible count Expected: 40; Received: 24
premium left CSS property Expected: "var(--firefly-left)"; Received: ""
```

### Mutation RED evidence

Every revised behavior was deliberately changed, observed failing, then restored:

```
npx jest src/components/StarField.test.js --runInBand -t "shows exactly 40"
n + 40 => Expected length: 40; Received length: 39

npx jest src/components/StarField.test.js --runInBand -t "shows exactly 40"
fireflyWander -> twinkle => Expected substring: "fireflyWander"; Received: "twinkle ... fireflyGlow ..."

npx jest src/components/StarField.test.js --runInBand -t "shows exactly 40"
wanderDuration: 40 => Expected: <= 32; Received: 40

npx jest src/components/StarField.test.js --runInBand -t "retains all 60"
free twinkle -> fireflyGlow => Expected substring: "twinkle"; Received: "fireflyGlow var(--transition-slow) infinite"

npx jest src/components/StarField.test.js --runInBand -t "reduced motion"
animation: fireflyGlow 1s infinite => Expected: "none"; Received: "fireflyGlow 1s infinite"
```

### Final GREEN evidence

```
npx jest src/components/StarField.test.js --runInBand
1 suite passed; 4 tests passed

npm run test:emberlight
7 suites passed; 31 tests passed

npx jest --runInBand
9 suites passed; 35 tests passed

npm run verify:emberlight
exit 0
```

### Self-review

- Premium mode displays the first 40 particles and places them in all 8 columns and 5 rows with the specified jitter bounds.
- Each premium-capable particle has five independent two-axis waypoints, 18–32 second wander timing, and independent 3–7 second glow timing.
- Premium overrides are root-theme scoped; free mode keeps all 60 randomly positioned twinkling stars.
- The fixed star layer remains clipped and the premium reduced-motion rule disables all animation.
- Browser QA was not run, per controller instruction.

## Premium timing override fix

### Root cause

`StarField` set `animationDuration` and `animationDelay` inline for free twinkle. Those inline longhands overrode the premium animation shorthand, leaving the browser with one approximately 2–5 second animation duration instead of independent wander and glow timing.

### RED evidence

The timing regression was added before production changes and rendered the premium StarField with the shipped stylesheet:

```
npx jest src/components/StarField.test.js --runInBand -t "independent premium"
Expected: ""
Received: "2.421893056076888s"
star.style.animationDuration
```

The failure proves the free inline timing override was present on a premium particle.

### Fix and GREEN evidence

- Replaced inline free animation longhands with `--star-twinkle-duration` and `--star-twinkle-delay`.
- Scoped twinkle animation consumption to `:root:not([data-theme='premium']) .star`.
- The premium DOM regression asserts no inline duration override, two animation names, wander duration 18–32 seconds, and glow duration 3–7 seconds. jsdom does not resolve animation custom properties through `getComputedStyle`, so the test uses the rendered DOM plus the loaded stylesheet's CSSOM declaration as its fallback while retaining the inline-override assertion that reproduced the browser defect.
- The free DOM regression confirms twinkle timing stays within 2–5 seconds.

```
npx jest src/components/StarField.test.js --runInBand
1 suite passed; 6 tests passed

npm run test:emberlight
7 suites passed; 33 tests passed

npx jest --runInBand
9 suites passed; 37 tests passed

npm run verify:emberlight
exit 0
```

## Files

- `src/components/StarField.test.js`
- `src/components/StarField.js`
- `src/app/globals.css`
- `package.json`

## Commit

Implementation commit: `3d99b1bb4c983f7ede880057fc42cf85ff681bb5`

## Self-review

- Each of 60 shared particles receives all four requested firefly path custom properties.
- Premium CSS changes only premium particles, hides particles 25–60, and retains the free twinkle rule.
- Reduced-motion premium particles disable animation.
- The fixed particle layer uses `overflow: hidden` to keep transformed particles inside the viewport.
- Browser QA was intentionally not run; it is assigned to the controller.

## Review fix report

### Changes

- Removed the `@babel/runtime` development dependency.
- Rewrote the StarField regression with CommonJS and `React.createElement`, so the test does not rely on Babel runtime helpers.
- Loaded the shipped global stylesheet into jsdom and exercised rendered premium/free DOM state with `getComputedStyle`; jsdom does not evaluate animation names or media queries, so CSSOM validates the actual premium animation declaration and the reduced-motion rule.
- Kept the required `overflow: hidden` on the fixed `.star-field` layer.

### Mutation RED evidence

Each strengthened behavior failed when deliberately changed, then was restored:

```
npx jest src/components/StarField.test.js --runInBand
n + 26 => Expected length: 24; Received length: 25

npx jest src/components/StarField.test.js --runInBand -t "shows exactly 24"
animation-name: twinkle => Expected: "fireflyDrift"; Received: "twinkle"

npx jest src/components/StarField.test.js --runInBand -t "retains all 60"
display: none => Expected length: 60; Received length: 0

npx jest src/components/StarField.test.js --runInBand
free animation: fireflyDrift => Expected substring: "twinkle"; Received: "fireflyDrift var(--transition-slow) infinite"

npx jest src/components/StarField.test.js --runInBand -t "reduced motion"
animation: fireflyDrift 1s infinite => Expected: "none"; Received: "fireflyDrift 1s infinite"

npx jest src/components/StarField.test.js --runInBand -t "reduced motion"
opacity: 0.5 => Expected: "0.65"; Received: "0.5"
```

### Final GREEN evidence

```
npx jest src/components/StarField.test.js --runInBand
1 suite passed; 4 tests passed

npm run test:emberlight
7 suites passed; 31 tests passed

npx jest --runInBand
9 suites passed; 35 tests passed

npm run verify:emberlight
exit 0
```
