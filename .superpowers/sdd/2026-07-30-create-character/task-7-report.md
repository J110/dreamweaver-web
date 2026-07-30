# Task 7 Report: Three-step Create Character wizard

## Tests

```text
npm test -- --runInBand src/app/characters/create/page.test.js
Initial regressions: quote outage was not visible, completed jobs treated their payload as embedded character data, result actions were unwired, and Surprise state lacked aria-pressed.

npm test -- --runInBand src/app/characters/create/page.test.js src/utils/characterWizard.test.js src/utils/i18nProvider.test.js src/components/PremiumThemeCoverage.test.js src/components/EmberlightThemeController.test.js src/utils/emberlightTheme.test.js src/utils/authThemeLogout.test.js src/app/upgrade/upgradeTheme.test.js
8 suites, 46 tests passed.

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

Task 7 follow-up commit records the approved fixes.

## Self-Review

The backend `GenerationJob` completion contract uses `character_id`, not `result_character_id`; completed polling now fetches that character before rendering the result. Terminal failures reset submission, retries re-quote before creating another job, and three consecutive polling errors transition to a recoverable failure while a successful poll resets the error budget.

Quote, validation, conflict, and delete failures use localized copy. The paid dialog provides localized credit copy, initial focus, a focus trap, Escape dismissal, and focus return; result Edit and Delete use the completed character ID, with deletion confirmation and error recovery. The route styles visible steps, controls, focus states, errors, dialog, result, and progress with theme variables and safe-area spacing.

## Concerns

`.superpowers/brainstorm/` remains untracked and unstaged.
