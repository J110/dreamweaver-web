# Character Wizard UX And Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make traits compact and unmistakably multi-select, restore Dream Valley theming with a banner, and show actionable generation-stage failures.

**Architecture:** Keep the existing three-step `CharacterWizard` and backend generation contract. Add semantic trait-chip presentation and failure-code mapping in the shared wizard, and add a CSS-rendered Dream Valley hero in the shared create/edit page shell.

**Tech Stack:** Next.js, React, CSS Modules, Jest, jsdom

## Global Constraints

- Preserve the current slot rule: slots 1–3 are free, later generations cost 2 credits, maximum 30 slots.
- Preserve backend moderation, profile generation, portrait generation, atomic save, and credit release on failure.
- Allow up to five traits and state clearly that more than one may be selected.
- Use existing theme tokens and no new image dependency.

---

### Task 1: Compact Multi-Select Trait Chips

**Files:**
- Modify: `src/components/characters/CharacterWizard.js`
- Modify: `src/app/characters/create/page.module.css`
- Modify: `src/utils/i18n.js`
- Test: `src/app/characters/create/page.test.js`

**Interfaces:**
- Consumes: `inputs.traits: string[]`, `CHARACTER_TRAITS`, `toggleTrait(trait)`
- Produces: `.characterTraitGrid`, `.characterTraitHelp`, `.characterTraitChip`, selected `aria-pressed`, and selection count copy

- [ ] **Step 1: Write the failing tests**

Add a test that enters Personality, finds the helper text, selects Brave and Kind, and asserts both buttons expose `aria-pressed="true"`, visible checkmarks, and `2 of 5 selected`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: FAIL because the helper, count, checkmarks, and chip classes are absent.

- [ ] **Step 3: Implement the minimal trait UI**

Wrap the trait buttons in `.characterTraitGrid`, add instruction/count copy, render a hidden-from-assistive-technology checkmark for selected chips, retain `aria-pressed`, and use a compact wrapping grid with a solid high-contrast selected state.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: PASS.

### Task 2: Dream Valley Banner

**Files:**
- Modify: `src/app/characters/create/page.js`
- Modify: `src/app/characters/[id]/edit/page.js`
- Modify: `src/app/characters/create/page.module.css`
- Modify: `src/utils/i18n.js`
- Test: `src/app/characters/create/page.test.js`

**Interfaces:**
- Produces: a shared `.hero` banner with moon/stars decoration, title, and subtitle before `CharacterWizard`

- [ ] **Step 1: Write the failing test**

Assert the create page contains a labelled banner before the wizard with `Create a Dream Valley Character` and the subtitle `Bring a new friend into your stories.`

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: FAIL because no banner exists.

- [ ] **Step 3: Implement the shared themed banner**

Render the banner in create and edit page shells and style it with theme-token gradients, crescent moon, stars, and responsive spacing.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: PASS.

### Task 3: Actionable Generation Failure States

**Files:**
- Modify: `src/components/characters/CharacterWizard.js`
- Modify: `src/utils/i18n.js`
- Test: `src/app/characters/create/page.test.js`

**Interfaces:**
- Consumes: terminal job `error_code`
- Produces: safe-input editing action, profile-stage retry message, portrait-stage retry message, and generic fallback with a support code

- [ ] **Step 1: Write the failing tests**

Add table-driven terminal-job tests for `invalid_profile`, `profile_failed`, `unsafe_profile`, and `portrait_failed`, asserting a user-facing stage message and the appropriate Edit details or Retry action. Add an unknown-code test that includes a non-sensitive support code.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: FAIL because all non-`unsafe_input` codes currently render the generic message.

- [ ] **Step 3: Implement failure-code mapping**

Map safety failures to Edit details, profile failures to profile retry copy, portrait failures to portrait retry copy, and unknown failures to generic copy plus `Reference: <error_code>`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: PASS.

### Task 4: Release Verification

**Files:**
- Verify: `src/app/characters/create/page.test.js`
- Verify: full web test suite

**Interfaces:**
- Consumes: completed Tasks 1–3
- Produces: deployable web commit

- [ ] **Step 1: Run the focused suite**

Run: `npm test -- --runInBand src/app/characters/create/page.test.js`

Expected: PASS with no warnings.

- [ ] **Step 2: Run the full suite**

Run: `npm test -- --runInBand`

Expected: all suites pass.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-08-01-character-wizard-ux-and-errors.md src/app/characters/create/page.js src/app/characters/[id]/edit/page.js src/app/characters/create/page.module.css src/app/characters/create/page.test.js src/components/characters/CharacterWizard.js src/utils/i18n.js
git commit -m "fix: clarify character creation flow"
```
