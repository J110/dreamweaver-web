# Task 1: Centralize Premium Theme Resolution

## Delivered

- Added `src/utils/emberlightTheme.js` with the premium theme resolver, explicit cache reader, and same-tab change event dispatcher.
- Added Jest coverage for upgrade preview, confirmed/non-confirmed premium resolution, explicit cache values, and same-tab cache change details.
- Routed `subscriptionApi.getCurrent()` cache writes through `cacheEffectivePremium`.
- Included the baseline Jest dependency changes and enabled ES modules for the Jest test files while preserving the Next configuration's behavior.

## TDD evidence

1. The initial focused test run failed because `./emberlightTheme` did not exist.
2. After implementation, the focused suite passed: 1 suite, 7 tests.
3. The full available suite passed: 1 suite, 7 tests.

## Self-review

- The resolver grants the premium theme only for confirmed `true`, except for the `/upgrade` preview route.
- Cache parsing accepts only the strings `true` and `false`; storage and event errors remain fail-safe.
- The API no longer writes the cache directly, so same-tab listeners receive the centralized event.

## Concern

Jest's ESM execution requires `NODE_OPTIONS=--experimental-vm-modules` in this environment; running the brief's bare `npx jest` command cannot parse ES module imports.
