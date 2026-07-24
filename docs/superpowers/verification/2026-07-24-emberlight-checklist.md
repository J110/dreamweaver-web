# Emberlight Release Verification

- [x] Free account: route isolation is covered by resolver tests; `/privacy` at 768×1024 used `data-theme="free"` with no horizontal overflow.
- [x] Premium account: shell resolver, tokenization, audit, and route tests cover Emberlight application across routes; `/upgrade` used `data-theme="premium"` and Emberlight colors.
- [x] Upgrade: pricing, trial disclosure, CTA, and restore surfaces remained intact; restore navigated safely to `/restore` and rendered the Hindi restore form. Real checkout submission and cancellation are tracked separately as a release-stage external check.
- [x] Transition: automated Emberlight transition coverage verifies one confirmed free-to-premium conversion plays once and reload/relaunch do not replay it.
- [x] Accessibility: reduced-motion tests and rules skip the wash, the focused input had a visible box-shadow, and semantic error/disabled states passed review. Formal automated contrast scanning is tracked separately.
- [x] Language: the live landing Hindi switch changed copy and `html.lang` to `hi` without overflow, the Tiro variable was present, and `/upgrade` resolved its `h1` to `__Fraunces…`.
- [x] Responsive: `/upgrade` at 390×844 and 1280×900 and `/privacy` at 768×1024 preserved their layouts without horizontal overflow; all four upgrade benefits remained readable and CTA/restore controls remained present.
- [x] Flutter: theme bridge tests and native surround implementation review cover status/navigation bars, WebView surround, loading, and error surfaces. Physical-device native-chrome smoke is tracked separately.
- [x] Failure states: fail-closed resolver, storage, font, and unavailable-channel paths are covered by code and tests.
- [x] Performance: browser verification and implementation review cover smooth scrolling/playback and mote suppression in native and battery-saving modes. Physical-device native-chrome smoke is tracked separately.

## Automated evidence

- `npm run test:emberlight`: 28/28 tests passed.
- `npx jest --runInBand`: 28/28 tests passed.
- `npm run verify:emberlight`: theme audit and route verification passed.
- `npm run build`: production build passed.
- `cd "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver/.worktrees/emberlight" && flutter test test/auth_bridge_test.dart test/emberlight_theme_bridge_test.dart`: 8/8 tests passed.

## Release-stage external checks

- [ ] Perform a real checkout submission and cancellation against staging; do not trigger payment during local verification.
- [ ] Run physical-device native-chrome smoke for status/navigation bars, WebView surround, loading/error surfaces, scrolling/playback, native mode, battery-saving mode, and mote suppression.
- [ ] Run a formal automated WCAG contrast scan for representative text/control pairs.
