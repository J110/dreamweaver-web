# Emberlight Release Verification

- [ ] Free account: all routes retain the current indigo/violet theme except `/upgrade`.
- [ ] Premium account: home, explore, player, playlists, creation, stories, settings, profile, legal, loading, empty, error, and dialog states use Emberlight.
- [ ] Upgrade: pricing, trial disclosure, checkout, cancellation, and restore behavior are unchanged.
- [ ] Transition: one confirmed free-to-premium conversion plays once; reload and relaunch do not replay it.
- [ ] Accessibility: reduced motion skips the wash; keyboard focus is visible; representative text/control pairs pass WCAG AA.
- [ ] Language: English and Hindi headings render without clipping or invisible fallback text.
- [ ] Responsive: phone, tablet, and desktop widths preserve their current layouts.
- [ ] Flutter: status bar, navigation bar, WebView surround, loading, and error surfaces match the settled web theme.
- [ ] Failure states: unavailable storage, unavailable fonts, unknown entitlement, and unavailable Flutter channel fall back safely.
- [ ] Performance: scrolling and playback remain smooth; native mode and battery-saving mode show no motes.
