# Character Wizard Numbered Stepper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain character-wizard status row with an accessible numbered stepper that fills completed numbers and emphasizes the current step.

**Architecture:** Keep the existing `CharacterWizard` state machine and semantic ordered list. Derive a presentational `completed`, `current`, or `upcoming` state for each of the three existing steps, expose it through stable DOM attributes, and style the shared create/edit wizard through the existing page CSS module.

**Tech Stack:** Next.js 14, React, CSS Modules, Jest, React DOM test utilities

## Global Constraints

- Preserve the existing Identity, Personality, and Review flow, validation, translations, and `aria-current="step"` behavior.
- Use visible numbered circles `1`, `2`, and `3` above the translated labels.
- Completed steps use a solid accent fill.
- The current step uses the solid accent fill plus a stronger outline or glow.
- Upcoming steps use a muted outlined circle.
- Keep the three items legible without horizontal overflow at a 390-pixel viewport.
- Do not add dependencies or modify lockfiles.

---

### Task 1: Add the numbered wizard stepper

**Files:**
- Modify: `src/components/characters/CharacterWizard.js:257-265`
- Modify: `src/app/characters/create/page.module.css:25-46`
- Test: `src/app/characters/create/page.test.js`

**Interfaces:**
- Consumes: existing `step` state values `'identity'`, `'personality'`, and `'review'`.
- Produces: three `li[data-step-state]` elements whose values are `'completed'`, `'current'`, or `'upcoming'`, each containing a `.characterStepNumber` span and its existing translated label.

- [ ] **Step 1: Write the failing numbered-stepper state test**

Add this focused test to `src/app/characters/create/page.test.js`:

```javascript
test('numbered stepper fills completed steps and highlights the current step', async () => {
  const { container, root } = await renderPage();
  const stepStates = () => Array.from(container.querySelectorAll('ol > li')).map((item) => ({
    number: item.querySelector('.characterStepNumber')?.textContent,
    state: item.getAttribute('data-step-state'),
    current: item.getAttribute('aria-current'),
  }));

  expect(stepStates()).toEqual([
    { number: '1', state: 'current', current: 'step' },
    { number: '2', state: 'upcoming', current: null },
    { number: '3', state: 'upcoming', current: null },
  ]);

  await click(container, 'Surprise name');
  await click(container, 'Surprise type');
  await click(container, 'Surprise gender');
  await click(container, 'Continue');

  expect(stepStates()).toEqual([
    { number: '1', state: 'completed', current: null },
    { number: '2', state: 'current', current: 'step' },
    { number: '3', state: 'upcoming', current: null },
  ]);

  await click(container, 'Continue');

  expect(stepStates()).toEqual([
    { number: '1', state: 'completed', current: null },
    { number: '2', state: 'completed', current: null },
    { number: '3', state: 'current', current: 'step' },
  ]);

  await act(async () => root.unmount());
  container.remove();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- --runTestsByPath src/app/characters/create/page.test.js --runInBand
```

Expected: FAIL because `.characterStepNumber` and `data-step-state` do not exist.

- [ ] **Step 3: Derive and render the three visual states**

In `CharacterWizard.js`, add the ordered step definitions immediately before the component return:

```javascript
  const wizardSteps = [
    { id: 'identity', label: t('characterIdentity') },
    { id: 'personality', label: t('characterPersonality') },
    { id: 'review', label: t(mode === 'edit' ? 'characterEditReview' : 'characterReview') },
  ];
  const currentStepIndex = wizardSteps.findIndex((item) => item.id === step);
```

Replace the existing three hard-coded list items with:

```javascript
      <ol aria-label={t('characterSteps')}>
        {wizardSteps.map((item, index) => {
          const stepState = index < currentStepIndex
            ? 'completed'
            : index === currentStepIndex
              ? 'current'
              : 'upcoming';
          return (
            <li
              key={item.id}
              data-step-state={stepState}
              aria-current={stepState === 'current' ? 'step' : undefined}
            >
              <span className="characterStepNumber">{index + 1}</span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ol>
```

- [ ] **Step 4: Style the numbered circles and connector**

Replace the existing ordered-list/list-item rules in `page.module.css` with:

```css
.card :global(.characterWizard ol) {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.card :global(.characterWizard li) {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--dv-text-dim);
  text-align: center;
}

.card :global(.characterWizard li:not(:last-child)::after) {
  position: absolute;
  z-index: 0;
  top: 16px;
  left: calc(50% + 20px);
  width: calc(100% - 32px);
  height: 1px;
  background: var(--dv-hairline);
  content: '';
}

.card :global(.characterStepNumber) {
  position: relative;
  z-index: 1;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 2px solid var(--dv-control-border);
  border-radius: 50%;
  background: var(--dv-surface);
  color: var(--dv-text-dim);
  font-weight: 800;
  line-height: 1;
}

.card :global(.characterWizard li[data-step-state='completed'] .characterStepNumber),
.card :global(.characterWizard li[data-step-state='current'] .characterStepNumber) {
  border-color: var(--dv-accent);
  background: var(--dv-accent);
  color: var(--dv-on-accent);
}

.card :global(.characterWizard li[data-step-state='current']) {
  color: var(--dv-accent);
  font-weight: 700;
}

.card :global(.characterWizard li[data-step-state='current'] .characterStepNumber) {
  box-shadow: 0 0 0 4px var(--dv-soft-accent);
}
```

- [ ] **Step 5: Run focused create and edit wizard tests**

Run:

```bash
npm test -- --runTestsByPath src/app/characters/create/page.test.js 'src/app/characters/[id]/edit/page.test.js' --runInBand
```

Expected: both suites pass, including the new state-transition test.

- [ ] **Step 6: Run theme verification**

Run:

```bash
npm run verify:emberlight
```

Expected: theme audit and Emberlight route verification exit 0.

- [ ] **Step 7: Commit the implementation**

Run:

```bash
git add src/components/characters/CharacterWizard.js \
  src/app/characters/create/page.module.css \
  src/app/characters/create/page.test.js
git commit -m "feat(characters): add numbered wizard stepper"
```
