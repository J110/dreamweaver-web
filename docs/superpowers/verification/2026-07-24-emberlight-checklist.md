# Emberlight Release Verification

- [ ] Free account: all routes retain the current indigo/violet theme except `/upgrade`. Partial evidence: `/privacy` at 768×1024 used `data-theme="free"` with no horizontal overflow.
- [ ] Premium account: home, explore, player, playlists, creation, stories, settings, profile, legal, loading, empty, error, and dialog states use Emberlight. Partial evidence: `/upgrade` used `data-theme="premium"` and Emberlight colors.
- [ ] Upgrade: pricing, trial disclosure, checkout, cancellation, and restore behavior are unchanged. Restore navigated safely to `/restore` and rendered the Hindi restore form; real checkout submission and cancellation remain release-stage external checks.
- [x] Transition: automated Emberlight transition coverage verifies one confirmed free-to-premium conversion plays once and reload/relaunch do not replay it.
- [ ] Accessibility: reduced motion skips the wash; keyboard focus is visible; representative text/control pairs pass WCAG AA. Partial evidence: the focused input had a visible box-shadow.
- [ ] Language: English and Hindi headings render without clipping or invisible fallback text. Partial evidence: the landing Hindi control changed copy and `html.lang` to `hi` without overflow, the Tiro variable was present, and `/upgrade` resolved its `h1` to `__Fraunces…`.
- [x] Responsive: `/upgrade` at 390×844 and 1280×900 and `/privacy` at 768×1024 preserved their layouts without horizontal overflow; all four upgrade benefits remained readable and CTA/restore controls remained present.
- [ ] Flutter: status bar, navigation bar, WebView surround, loading, and error surfaces match the settled web theme. Theme bridge tests passed; physical-device native-chrome smoke remains a release-stage external check.
- [ ] Failure states: unavailable storage, unavailable fonts, unknown entitlement, and unavailable Flutter channel fall back safely.
- [ ] Performance: scrolling and playback remain smooth; native mode and battery-saving mode show no motes. Physical-device native-chrome smoke remains a release-stage external check.

## Automated evidence

- `npm run test:emberlight`: 28/28 tests passed.
- `npx jest --runInBand`: 28/28 tests passed.
- `npm run verify:emberlight`: theme audit and route verification passed.
- `npm run build`: production build passed.
- `cd "/Users/anmolmohan/Music/Bed Time Story App/dreamweaver/.worktrees/emberlight" && flutter test test/auth_bridge_test.dart test/emberlight_theme_bridge_test.dart`: 8/8 tests passed.

## Release-stage external checks

- [ ] Perform a real checkout submission and cancellation against staging; do not trigger payment during local verification.
- [ ] Run physical-device native-chrome smoke for status/navigation bars, WebView surround, loading/error surfaces, scrolling/playback, native mode, battery-saving mode, and mote suppression.
