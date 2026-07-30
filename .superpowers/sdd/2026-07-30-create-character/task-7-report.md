# Task 7 Report: Three-step Create Character wizard

## Tests

```text
npm test -- --runInBand src/app/characters/create/page.test.js
Initial regressions: quote outage was not visible, completed jobs treated their payload as embedded character data, result actions were unwired, and Surprise state lacked aria-pressed.

npm test -- --runInBand src/app/characters/create/page.test.js src/utils/characterWizard.test.js src/utils/i18nProvider.test.js src/components/PremiumThemeCoverage.test.js src/components/EmberlightThemeController.test.js src/utils/emberlightTheme.test.js src/utils/authThemeLogout.test.js src/app/upgrade/upgradeTheme.test.js
8 suites, 51 tests passed.

Follow-up regressions covered terminal idempotency rotation, transport recovery without duplicate submission, serialized and late polling, stale-quote revalidation, client hydration, and in-flight dialog dismissal.

npm run verify:emberlight
Passed.
```

## Files Changed

- `src/components/characters/CharacterWizard.js`
- `src/components/characters/GenerationProgress.js`
- `src/components/characters/PaidGenerationDialog.js`
- `src/app/characters/create/page.js`
- `src/app/characters/create/page.module.css`
- `src/app/characters/create/page.test.js`
- `src/utils/i18n.js`

## Commit

Task 7 re-review follow-up commit records the recovery fixes.

## Self-Review

The backend `GenerationJob` completion contract uses `character_id`, not `result_character_id`; completed polling now fetches that character before rendering the result. Terminal backend failures clear pending storage and reset the idempotency key, while transport exhaustion preserves both and exposes a retry that resumes the same job without a second generation request.

Polling now uses serialized recursive timeouts and ignores late success or failure after terminal state or unmount. Stale quotes fetch a fresh review quote and retain their idempotency key because the backend rejects stale requests before creating a job; terminal jobs rotate that key. The result portrait is constrained for the card and mobile viewport.

The create route starts from an unresolved client-auth state so server markup and first hydration match; it checks auth and reads the user only from the client effect. The paid confirmation dialog ignores Escape while submitting and moves focus to its modal boundary while all controls are disabled.

## Concerns

`.superpowers/brainstorm/` remains untracked and unstaged.
