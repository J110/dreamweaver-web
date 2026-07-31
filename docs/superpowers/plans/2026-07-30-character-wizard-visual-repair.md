# Character Wizard Visual Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore visible, compact, theme-aware character wizard controls without changing the existing three-step flow or generation behavior.

**Architecture:** Keep `CharacterWizard` markup and state unchanged. Repair the shared create/edit CSS module by using the established `--dv-*` theme contract, then protect the contract with a focused test that compares every consumed CSS variable against the variables defined in `globals.css`.

**Tech Stack:** Next.js 14, React 18, CSS Modules, Jest 30, PM2, Deploy Guard.

## Global Constraints

- Keep the existing Identity, Personality, and Review structure.
- Scope visual changes to the character create and edit surfaces.
- Do not change translations, authentication, API calls, slot rules, credits, or generation jobs.
- Preserve free and premium themes through existing `--dv-*` tokens.
- Preserve minimum 44-pixel touch targets and current accessibility attributes.
- Do not add dependencies or modify lockfiles.

---

### Task 1: Repair and protect the shared wizard styling

**Files:**
- Create: `src/app/characters/create/page.module.test.js`
- Modify: `src/app/characters/create/page.module.css`

**Interfaces:**
- Consumes: theme variables defined by `src/app/globals.css`.
- Produces: the shared `page`, `card`, wizard, result, failure, progress, dialog, and `editPortrait` styles used by both create and edit routes.

- [ ] **Step 1: Write the failing theme-variable contract test**

Create `src/app/characters/create/page.module.test.js`:

```javascript
const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

const variableNames = (source, pattern) => (
  Array.from(source.matchAll(pattern), (match) => match[1])
);

test('character wizard only consumes theme variables defined by globals', () => {
  const wizard = read('src/app/characters/create/page.module.css');
  const globals = read('src/app/globals.css');
  const consumed = new Set(variableNames(wizard, /var\((--[\w-]+)/g));
  const defined = new Set(variableNames(globals, /^\s*(--[\w-]+)\s*:/gm));

  expect(Array.from(consumed).filter((name) => !defined.has(name))).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and verify the undefined tokens fail**

Run:

```bash
npm test -- src/app/characters/create/page.module.test.js --runInBand
```

Expected: FAIL with `--color-accent`, `--color-bg-card`, and `--color-border` reported as undefined.

- [ ] **Step 3: Replace undefined tokens and compact the existing layout**

Update `src/app/characters/create/page.module.css` to:

```css
.page {
  min-height: 100vh;
  padding: 20px 16px calc(104px + env(safe-area-inset-bottom));
  color: var(--dv-text);
}

.card {
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 24px;
  border: 1px solid var(--dv-hairline);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--dv-surface) 94%, transparent);
  box-shadow: var(--shadow-lg);
}

.card :global(.characterWizard),
.card :global(.characterResult),
.card :global(.characterFailure),
.card :global(.characterProgress) {
  display: grid;
  gap: 16px;
}

.card :global(.characterWizard h1) {
  margin: 0;
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 1.08;
}

.card :global(.characterWizard ol) {
  display: flex;
  gap: 10px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.card :global(.characterWizard li) {
  color: var(--dv-text-dim);
}

.card :global(.characterWizard li[aria-current='step']) {
  color: var(--dv-accent);
  font-weight: 700;
}

.card :global(.characterWizard fieldset) {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--dv-hairline);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--dv-surface-raised) 38%, transparent);
}

.card :global(.characterWizard legend) {
  padding: 0 8px;
  color: var(--dv-text);
  font-weight: 700;
}

.card :global(.characterWizard label) {
  display: grid;
  gap: 7px;
  color: var(--dv-text-dim);
  font-weight: 600;
}

.card :global(.characterWizard input),
.card :global(.characterWizard select),
.card :global(.characterWizard textarea) {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--dv-hairline);
  border-radius: var(--radius-sm);
  background: var(--dv-surface);
  color: var(--dv-text);
  padding: 11px 12px;
}

.card :global(.characterWizard textarea) {
  min-height: 112px;
  resize: vertical;
}

.card :global(.characterWizard button),
.card :global(.characterResult button),
.card :global(.characterFailure button),
.card :global(.characterPaidDialog button) {
  min-height: 44px;
  border: 1px solid var(--dv-hairline);
  border-radius: var(--radius-sm);
  background: var(--dv-surface-raised);
  color: var(--dv-text);
  padding: 9px 14px;
  font-weight: 700;
}

.card :global(.characterWizard fieldset > button) {
  background: var(--dv-soft-accent);
}

.card :global(.characterWizard > button:last-of-type),
.card :global(.characterResult > button:first-of-type),
.card :global(.characterFailure > button:first-of-type) {
  border-color: var(--dv-accent);
  background: var(--dv-accent);
  color: var(--dv-text);
}

.card :global(.characterWizard button[aria-pressed='true']) {
  border-color: var(--dv-accent);
  background: var(--dv-soft-accent);
}

.card :global(.characterWizard button:focus-visible),
.card :global(.characterResult button:focus-visible),
.card :global(.characterFailure button:focus-visible),
.card :global(.characterPaidDialog button:focus-visible),
.card :global(.characterWizard input:focus-visible),
.card :global(.characterWizard select:focus-visible),
.card :global(.characterWizard textarea:focus-visible) {
  outline: 3px solid var(--dv-focus);
  outline-offset: 2px;
}

.card :global(.characterError),
.card :global(.characterWizard [role='alert']) {
  margin: 0;
  color: var(--color-error);
  font-weight: 600;
}

.card :global(.characterPaidDialog) {
  position: fixed;
  z-index: 10;
  inset: auto 16px calc(16px + env(safe-area-inset-bottom));
  max-width: 480px;
  margin: auto;
  padding: 20px;
  border: 1px solid var(--dv-accent);
  border-radius: var(--radius-lg);
  background: var(--dv-surface);
  box-shadow: var(--shadow-lg);
}

.card :global(.characterProgress) {
  min-height: 120px;
  place-content: center;
  text-align: center;
}

.card :global(.characterResult img) {
  width: 100%;
  max-width: 320px;
  height: min(72vw, 320px);
  max-height: 320px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.editPortrait {
  width: 100%;
  max-width: 320px;
  height: min(72vw, 320px);
  border-radius: var(--radius-md);
  object-fit: cover;
}

@media (max-width: 520px) {
  .page {
    padding: 14px 12px calc(96px + env(safe-area-inset-bottom));
  }

  .card {
    padding: 18px 16px;
    border-radius: 20px;
  }

  .card :global(.characterWizard),
  .card :global(.characterResult),
  .card :global(.characterFailure),
  .card :global(.characterProgress) {
    gap: 13px;
  }

  .card :global(.characterWizard fieldset) {
    gap: 10px;
    padding: 14px 12px;
  }
}
```

- [ ] **Step 4: Run focused styling and route tests**

Run:

```bash
npm test -- \
  src/app/characters/create/page.module.test.js \
  src/app/characters/create/page.test.js \
  'src/app/characters/[id]/edit/page.test.js' \
  --runInBand
```

Expected: all suites pass.

- [ ] **Step 5: Run the theme audit**

Run:

```bash
npm run verify:emberlight
```

Expected: audit and route verification exit 0.

- [ ] **Step 6: Commit the scoped repair**

```bash
git add \
  src/app/characters/create/page.module.css \
  src/app/characters/create/page.module.test.js
git commit -m "fix(characters): restore wizard control styling"
```

---

### Task 2: Verify and deploy the repaired wizard

**Files:**
- No additional tracked feature files.

**Interfaces:**
- Consumes: Task 1 styling commit.
- Produces: verified production create and edit wizard styling.

- [ ] **Step 1: Run the production web build**

Run:

```bash
npm run build
```

Expected: build exits 0 and includes `/characters/create` and `/characters/[id]/edit`.

- [ ] **Step 2: Push the verified web commit**

Run:

```bash
git status --short
git push origin HEAD:main
```

Expected: only the existing `.superpowers/brainstorm/` directory remains unrelated and untracked; push is non-force.

- [ ] **Step 3: Capture Deploy Guard snapshot**

Run from the backend worktree:

```bash
.venv/bin/python scripts/deploy_guard.py snapshot
```

Expected: production content and JSON backup snapshot complete before mutation.

- [ ] **Step 4: Deploy the scoped web files**

On `dreamvalley-prod`:

```bash
cd /opt/dreamweaver-web
git fetch origin main
git checkout origin/main -- \
  src/app/characters/create/page.module.css \
  src/app/characters/create/page.module.test.js
```

Build with the existing guarded procedure: move `.next/standalone/public` outside `.next`, stop `dreamweaver-web`, run `npm run build`, recreate the public symlink and static bundle, restart PM2, and restore the prior standalone bundle automatically if the build fails.

- [ ] **Step 5: Verify production rendering and processes**

Require:

```text
GET https://dreamvalley.app/characters/create → 200
GET https://dreamvalley.app/my-stories → 200
GET https://api.dreamvalley.app/health → 200
dreamweaver-web → online
dreamweaver-character-worker → online with zero restarts
```

Use the in-app browser at a mobile viewport and inspect computed styles to verify visible borders, filled fields, minimum 44-pixel touch targets, secondary surprise buttons, a clear primary action, compact spacing, and correct free/premium theme tokens.

- [ ] **Step 6: Run post-deploy Guard**

On production:

```bash
cd /opt/dreamweaver-backend
python3 scripts/deploy_guard.py verify
```

Expected: all application checks pass. Preserve the YouTube offline result as the known external broadcast blocker if it remains the only issue.
