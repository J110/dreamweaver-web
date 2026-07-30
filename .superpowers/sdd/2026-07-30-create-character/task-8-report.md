# Task 8 Report: Saved characters

## Tests

```text
npm test -- --runInBand --runTestsByPath 'src/app/characters/[id]/page.test.js' src/app/characters/create/page.test.js src/app/privacy/characterPrivacy.test.js src/app/my-stories/page.test.js src/app/my-stories/MyStoriesPage.test.js src/components/my-content/MyContentComponents.test.js src/utils/characterWizard.test.js src/utils/i18nProvider.test.js
8 suites, 50 tests passed.

npm run verify:emberlight
Passed.
```

## Files Changed

- `src/components/characters/CharacterCard.js`
- `src/components/characters/CharacterWizard.js`
- `src/app/characters/[id]/page.js`
- `src/app/characters/[id]/page.module.css`
- `src/app/characters/[id]/page.test.js`
- `src/app/characters/[id]/edit/page.js`
- `src/app/my-stories/page.js`
- `src/app/my-stories/page.test.js`
- `src/app/privacy/page.js`
- `src/app/privacy/characterPrivacy.test.js`
- `src/utils/i18n.js`

## Commit

Pending Task 8 commit.

## Self-Review

Saved characters load only for authenticated My Content visitors and appear between the create card and locked previews. Detail routes authenticate before fetching, present safe load errors, and require a confirmation dialog before deleting and returning to My Content.

Edit routes retain the saved character until an edit generation completes, hydrate the Task 7 wizard with its current profile, and display the edit rule as two credits. The privacy policy explicitly covers stored character data, contracted generation providers, no reference-image collection, and active-record plus queued-media deletion.

## Concerns

`.superpowers/brainstorm/` remains untracked and unstaged.
