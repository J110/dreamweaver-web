# Emberlight Premium Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Emberlight theme to every premium user surface on web and Flutter, preview it on the upgrade page, and preserve all existing layouts and product flows.

**Architecture:** The web application owns tier-to-theme resolution and exposes the selected theme through a root `data-theme` attribute backed by semantic CSS variables. A small controller reacts to authoritative premium-cache changes, coordinates the one-time upgrade wash, and sends the settled theme to the Flutter WebView shell through a narrow JavaScript channel. Flutter maps that message only to native theme data and system chrome.

**Tech Stack:** Next.js App Router, React, CSS Modules, Jest, Flutter, Dart, `webview_flutter`, Flutter Test.

## Global Constraints

- Preserve every existing page layout, information hierarchy, navigation path, and interaction.
- Do not change billing, checkout, restore, authentication, pricing, trials, or entitlement rules.
- Free users retain the current theme on every route except `/upgrade`.
- `/upgrade` always previews Emberlight without granting premium access.
- Unknown or failed entitlement states resolve to the free theme.
- Emberlight colors are ink `#201418`, surface `#2C1D20`, raised `#3A262A`, ember `#D9A05F`, ember-deep `#A8743F`, cream `#F2E6D8`, dim text `#B39A86`, and faint text `#8D7568`.
- Normal transitions are 300–600 ms ease-out; breathing is 5.5 seconds; lamp glow is 7 seconds; motes drift for 14–26 seconds.
- Reduced motion or battery-saving mode disables decorative motion.
- Existing semantic success, warning, error, disabled, selected, and focus meanings remain distinguishable and meet WCAG AA.
- Web and Flutter changes ship together.

---

### Task 1: Centralize Premium Theme Resolution

**Files:**
- Create: `src/utils/emberlightTheme.js`
- Create: `src/utils/emberlightTheme.test.js`
- Modify: `src/utils/api.js:660-665`

**Interfaces:**
- Consumes: `localStorage`, browser `CustomEvent`, and `effective_premium` from existing subscription responses.
- Produces: `resolveTheme({ effectivePremium, pathname }) -> 'free' | 'premium'`, `readEffectivePremium(storage) -> boolean | null`, and `cacheEffectivePremium(value, storage, eventTarget) -> void`.

- [ ] **Step 1: Write the failing resolver and cache tests**

```js
import {
  EFFECTIVE_PREMIUM_KEY,
  THEME_CHANGE_EVENT,
  cacheEffectivePremium,
  readEffectivePremium,
  resolveTheme,
} from './emberlightTheme';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('upgrade always previews premium', () => {
  expect(resolveTheme({ effectivePremium: false, pathname: '/upgrade' })).toBe('premium');
});

test('confirmed premium selects premium', () => {
  expect(resolveTheme({ effectivePremium: true, pathname: '/settings' })).toBe('premium');
});

test.each([false, null, undefined])('non-confirmed %p selects free', (effectivePremium) => {
  expect(resolveTheme({ effectivePremium, pathname: '/settings' })).toBe('free');
});

test('cache reads only explicit booleans', () => {
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'true' }))).toBe(true);
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'false' }))).toBe(false);
  expect(readEffectivePremium(memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'broken' }))).toBeNull();
});

test('cache dispatches previous and current values in the same tab', () => {
  const storage = memoryStorage({ [EFFECTIVE_PREMIUM_KEY]: 'false' });
  const target = new EventTarget();
  const details = [];
  target.addEventListener(THEME_CHANGE_EVENT, (event) => details.push(event.detail));
  cacheEffectivePremium(true, storage, target);
  expect(details).toEqual([{ previous: false, current: true }]);
});
```

- [ ] **Step 2: Run the tests and confirm the module is missing**

Run: `cd dreamweaver-web && npx jest src/utils/emberlightTheme.test.js --runInBand`

Expected: FAIL because `./emberlightTheme` cannot be resolved.

- [ ] **Step 3: Implement the theme contract**

```js
export const EFFECTIVE_PREMIUM_KEY = 'dv_effective_premium';
export const THEME_CHANGE_EVENT = 'dv-effective-premium-change';

export function resolveTheme({ effectivePremium, pathname }) {
  if (pathname === '/upgrade' || pathname?.startsWith('/upgrade?')) return 'premium';
  return effectivePremium === true ? 'premium' : 'free';
}

export function readEffectivePremium(storage) {
  try {
    const value = storage?.getItem(EFFECTIVE_PREMIUM_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {}
  return null;
}

export function cacheEffectivePremium(value, storage, eventTarget) {
  if (typeof value !== 'boolean') return;
  const previous = readEffectivePremium(storage);
  try {
    storage?.setItem(EFFECTIVE_PREMIUM_KEY, String(value));
  } catch {}
  if (previous === value) return;
  try {
    eventTarget?.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { previous, current: value },
    }));
  } catch {}
}
```

- [ ] **Step 4: Route the existing API cache write through the contract**

```js
import { cacheEffectivePremium } from '@/utils/emberlightTheme';
```

Replace the direct `localStorage.setItem('dv_effective_premium', ...)` call with:

```js
if (typeof data.effective_premium === 'boolean') {
  cacheEffectivePremium(data.effective_premium, localStorage, window);
}
```

- [ ] **Step 5: Run the focused tests**

Run: `cd dreamweaver-web && npx jest src/utils/emberlightTheme.test.js --runInBand`

Expected: PASS with five resolver/cache cases.

- [ ] **Step 6: Commit**

```bash
cd dreamweaver-web
git add src/utils/emberlightTheme.js src/utils/emberlightTheme.test.js src/utils/api.js
git commit -m "feat: centralize premium theme resolution"
```

---

### Task 2: Apply the Theme at the Web Application Shell

**Files:**
- Create: `src/components/EmberlightThemeController.js`
- Create: `src/components/EmberlightThemeController.test.js`
- Modify: `src/components/AppShell.js:280-285`
- Modify: `src/app/layout.js:1-5,119-146`
- Modify: `src/app/globals.css:1-33`

**Interfaces:**
- Consumes: Task 1 exports, `usePathname()`, the `storage` event, and optional `window.DreamValleyTheme.postMessage`.
- Produces: `<html data-theme="free|premium">`, `--font-dream-display`, `--font-dream-devanagari`, and the complete Emberlight semantic token set.

- [ ] **Step 1: Write a failing source-level controller test**

```js
import fs from 'node:fs';
import path from 'node:path';

test('theme controller owns root theme selection and native notification', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/components/EmberlightThemeController.js'),
    'utf8',
  );
  expect(source).toContain("setAttribute('data-theme', theme)");
  expect(source).toContain('DreamValleyTheme?.postMessage(theme)');
  expect(source).toContain('THEME_CHANGE_EVENT');
});
```

- [ ] **Step 2: Run the test and confirm the controller is missing**

Run: `cd dreamweaver-web && npx jest src/components/EmberlightThemeController.test.js --runInBand`

Expected: FAIL with `ENOENT` for `EmberlightThemeController.js`.

- [ ] **Step 3: Implement the controller**

```js
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  EFFECTIVE_PREMIUM_KEY,
  THEME_CHANGE_EVENT,
  readEffectivePremium,
  resolveTheme,
} from '@/utils/emberlightTheme';

export default function EmberlightThemeController() {
  const pathname = usePathname();

  useEffect(() => {
    const applyTheme = () => {
      const effectivePremium = readEffectivePremium(window.localStorage);
      const theme = resolveTheme({ effectivePremium, pathname });
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.toggleAttribute(
        'data-battery-saver',
        navigator.connection?.saveData === true,
      );
      try {
        window.DreamValleyTheme?.postMessage(theme);
      } catch {}
    };
    const onStorage = (event) => {
      if (event.key === EFFECTIVE_PREMIUM_KEY) applyTheme();
    };
    applyTheme();
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_CHANGE_EVENT, applyTheme);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, applyTheme);
    };
  }, [pathname]);

  return null;
}
```

- [ ] **Step 4: Mount the controller once inside `AppShell`**

Add the import:

```js
import EmberlightThemeController from '@/components/EmberlightThemeController';
```

Mount it as the first child of `I18nProvider`:

```jsx
<I18nProvider>
  <EmberlightThemeController />
  <VoicePreferencesProvider>
```

- [ ] **Step 5: Load premium display fonts without changing layout markup**

Replace the font import and declarations in `src/app/layout.js` with:

```js
import { Fraunces, Quicksand, Tiro_Devanagari_Hindi } from 'next/font/google';

const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-dream-ui' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-dream-display' });
const tiroHindi = Tiro_Devanagari_Hindi({
  subsets: ['devanagari'],
  weight: '400',
  variable: '--font-dream-devanagari',
});
```

Set the existing body class without changing its children:

```jsx
<body className={`${quicksand.variable} ${fraunces.variable} ${tiroHindi.variable}`}>
```

- [ ] **Step 6: Add semantic aliases and Emberlight overrides to `globals.css`**

Extend `:root`:

```css
--dv-bg: var(--color-deep-night);
--dv-bg-raised: var(--color-midnight-blue);
--dv-surface: var(--color-card-dark);
--dv-surface-raised: #2D2364;
--dv-accent: var(--color-primary-purple);
--dv-accent-pressed: #5137BE;
--dv-text: var(--color-text-light);
--dv-text-dim: var(--color-text-muted);
--dv-text-faint: rgba(248, 246, 255, 0.52);
--dv-hairline: rgba(107, 76, 230, 0.24);
--dv-soft-accent: rgba(107, 76, 230, 0.12);
--dv-focus: #FFF3CD;
--dv-font-display: var(--font-dream-ui);
```

Add the settled premium contract:

```css
:root[data-theme='premium'] {
  --color-deep-night: #201418;
  --color-midnight-blue: #2C1D20;
  --color-primary-purple: #D9A05F;
  --color-primary-pink: #A8743F;
  --color-card-dark: #2C1D20;
  --color-text-light: #F2E6D8;
  --color-text-muted: #B39A86;
  --dv-bg: #201418;
  --dv-bg-raised: #2C1D20;
  --dv-surface: #2C1D20;
  --dv-surface-raised: #3A262A;
  --dv-accent: #D9A05F;
  --dv-accent-pressed: #A8743F;
  --dv-text: #F2E6D8;
  --dv-text-dim: #B39A86;
  --dv-text-faint: #8D7568;
  --dv-hairline: rgba(217, 160, 95, 0.22);
  --dv-soft-accent: rgba(217, 160, 95, 0.10);
  --dv-focus: #F6D9A8;
  --dv-font-display: var(--font-dream-display);
  --shadow-sm: 0 2px 8px rgba(32, 20, 24, 0.28);
  --shadow-md: 0 8px 24px rgba(32, 20, 24, 0.36);
  --shadow-lg: 0 16px 48px rgba(32, 20, 24, 0.44);
  --transition-fast: 300ms ease-out;
  --transition-normal: 450ms ease-out;
  --transition-slow: 600ms ease-out;
}

:root[data-theme='premium'] :is(h1, h2, h3) {
  font-family: var(--dv-font-display), serif;
  font-weight: 350;
}

:root[data-theme='premium'][lang='hi'] :is(h1, h2, h3) {
  font-family: var(--font-dream-devanagari), serif;
  font-weight: 400;
}

@media (prefers-reduced-motion: reduce) {
  :root[data-theme='premium'] *,
  :root[data-theme='premium'] *::before,
  :root[data-theme='premium'] *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 7: Run the focused tests and production build**

Run: `cd dreamweaver-web && npx jest src/components/EmberlightThemeController.test.js src/utils/emberlightTheme.test.js --runInBand`

Expected: PASS.

Run: `cd dreamweaver-web && npm run build`

Expected: Next.js production build completes without font, import, or hydration errors.

- [ ] **Step 8: Commit**

```bash
cd dreamweaver-web
git add src/components/EmberlightThemeController.js src/components/EmberlightThemeController.test.js src/components/AppShell.js src/app/layout.js src/app/globals.css
git commit -m "feat: apply Emberlight at the app shell"
```

---

### Task 3: Convert Existing Styles to Semantic Theme Tokens

**Files:**
- Create: `scripts/tokenize-theme-colors.mjs`
- Create: `scripts/audit-theme-colors.mjs`
- Modify: `src/app/explore/page.module.css`
- Modify: `src/app/onboarding/page.module.css`
- Modify: `src/app/create/page.module.css`
- Modify: `src/app/player/[id]/page.module.css`
- Modify: `src/app/my-stories/page.module.css`
- Modify: `src/app/login/page.module.css`
- Modify: `src/app/settings/page.module.css`
- Modify: `src/app/privacy/page.module.css`
- Modify: `src/app/category/[slug]/page.module.css`
- Modify: `src/app/page.module.css`
- Modify: `src/app/about/page.module.css`
- Modify: `src/app/before-bed/page.module.css`
- Modify: `src/app/ages/[range]/page.module.css`
- Modify: `src/app/how-it-works/page.module.css`
- Modify: `src/app/stories/[slug]/page.module.css`
- Modify: `src/app/profile/page.module.css`
- Modify: `src/app/blog/page.module.css`
- Modify: `src/app/blog/BlogPostCard.module.css`
- Modify: `src/app/blog/BlogMarkdown.module.css`
- Modify: `src/app/blog/tag/[tag]/page.module.css`
- Modify: `src/app/blog/[slug]/page.module.css`
- Modify: `src/app/blog/[slug]/CommentsSection.module.css`
- Modify: `src/app/blog/[slug]/ShareButtons.module.css`
- Modify: `src/app/blog/[slug]/LikeButton.module.css`
- Modify: `src/components/PremiumBanner.module.css`
- Modify: `src/components/RadioLiveCard.module.css`
- Modify: `src/components/HeartButton.module.css`
- Modify: `src/components/ContentCard.module.css`
- Modify: `src/components/BottomNav.module.css`
- Modify: `src/components/Header.module.css`
- Modify: `src/components/InstallPrompt.module.css`

**Interfaces:**
- Consumes: the CSS variables from Task 2.
- Produces: unchanged free-tier rendering and complete premium-tier inheritance without per-component entitlement checks.

- [ ] **Step 1: Create the deterministic palette codemod**

```js
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app', 'src/components'];
const replacements = new Map([
  [/#0D0B2E/gi, 'var(--color-deep-night)'],
  [/#1A1550/gi, 'var(--color-midnight-blue)'],
  [/#2D2364/gi, 'var(--dv-surface-raised)'],
  [/#6B4CE6/gi, 'var(--color-primary-purple)'],
  [/#FF6B9D/gi, 'var(--color-primary-pink)'],
  [/#1E1854/gi, 'var(--color-card-dark)'],
  [/#F8F6FF/gi, 'var(--color-text-light)'],
  [/#B8B3D8/gi, 'var(--color-text-muted)'],
  [/rgba\\(107,\\s*76,\\s*230,\\s*0\\.24\\)/gi, 'var(--dv-hairline)'],
  [/rgba\\(107,\\s*76,\\s*230,\\s*0\\.12\\)/gi, 'var(--dv-soft-accent)'],
]);

function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\\.(css|js)$/.test(entry.name) ? [full] : [];
  });
}

for (const root of roots) {
  for (const file of filesUnder(root)) {
    if (file.endsWith('globals.css') || file.includes('/upgrade/')) continue;
    let source = fs.readFileSync(file, 'utf8');
    for (const [pattern, replacement] of replacements) {
      source = source.replace(pattern, replacement);
    }
    fs.writeFileSync(file, source);
  }
}
```

- [ ] **Step 2: Add a CI-friendly residual audit**

```js
import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app', 'src/components'];
const forbidden = /#(?:0D0B2E|1A1550|2D2364|6B4CE6|FF6B9D|1E1854|F8F6FF|B8B3D8)\\b/i;
const failures = [];

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) scan(full);
    if (!entry.isFile() || !/\\.(css|js)$/.test(entry.name)) continue;
    if (full.endsWith('globals.css') || full.includes('/upgrade/')) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\\n');
    lines.forEach((line, index) => {
      if (forbidden.test(line)) failures.push(`${full}:${index + 1}`);
    });
  }
}

roots.forEach(scan);
if (failures.length) {
  process.stderr.write(`${failures.join('\\n')}\\n`);
  process.exit(1);
}
```

- [ ] **Step 3: Run the audit before tokenization**

Run: `cd dreamweaver-web && node scripts/audit-theme-colors.mjs`

Expected: FAIL and list current literal palette references.

- [ ] **Step 4: Run the codemod**

Run: `cd dreamweaver-web && node scripts/tokenize-theme-colors.mjs`

Expected: the listed application and shared-component files replace legacy palette literals with semantic variables; markup and layout declarations remain untouched.

- [ ] **Step 5: Confirm no residual legacy literals remain**

Run: `cd dreamweaver-web && node scripts/audit-theme-colors.mjs`

Expected: exit code 0 with no output.

- [ ] **Step 6: Run the web test suite and build**

Run: `cd dreamweaver-web && npx jest --runInBand`

Expected: PASS.

Run: `cd dreamweaver-web && npm run build`

Expected: production build completes.

- [ ] **Step 7: Commit**

```bash
cd dreamweaver-web
git add scripts/tokenize-theme-colors.mjs scripts/audit-theme-colors.mjs src/app src/components
git commit -m "refactor: route app surfaces through theme tokens"
```

---

### Task 4: Restyle the Existing Upgrade Page as the Premium Preview

**Files:**
- Modify: `src/app/upgrade/page.module.css:1-18`
- Modify: `src/app/upgrade/UpgradeClient.js:148-155`
- Create: `src/app/upgrade/upgradeTheme.test.js`

**Interfaces:**
- Consumes: Task 2 root premium theme and existing upgrade-page markup.
- Produces: an Emberlight preview with unchanged pricing, trial, restore, checkout, and layout behavior.

- [ ] **Step 1: Write the failing upgrade-preview contract test**

```js
import fs from 'node:fs';
import path from 'node:path';

test('upgrade page uses Emberlight tokens and no legacy lavender token', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/page.module.css'),
    'utf8',
  );
  expect(css).toContain('--ink: #201418');
  expect(css).toContain('--ember: #D9A05F');
  expect(css).toContain('--cream: #F2E6D8');
  expect(css).not.toContain('--lavender:');
});

test('upgrade loading state uses semantic text', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/app/upgrade/UpgradeClient.js'),
    'utf8',
  );
  expect(source).not.toContain("color: 'rgba(248,246,255,0.5)'");
});
```

- [ ] **Step 2: Run the tests and confirm the old palette fails**

Run: `cd dreamweaver-web && npx jest src/app/upgrade/upgradeTheme.test.js --runInBand`

Expected: FAIL because the current CSS still defines lavender and the loading state has a literal color.

- [ ] **Step 3: Replace only the page-local visual variables**

Replace the `.root` variable block with:

```css
.root {
  --ink: #201418;
  --surface: #2C1D20;
  --raised: #3A262A;
  --ember: #D9A05F;
  --ember-deep: #A8743F;
  --ember-glow: rgba(217, 160, 95, 0.35);
  --ember-glow-soft: rgba(217, 160, 95, 0.15);
  --glass-bg: rgba(44, 29, 32, 0.84);
  --glass-border: rgba(217, 160, 95, 0.14);
  --ember-border: rgba(217, 160, 95, 0.22);
  --cream: #F2E6D8;
  --text-muted: #B39A86;
  --text-dim: #8D7568;
  --radius-card: 22px;
}
```

Within the same file, replace old local variable usages exactly:

```css
var(--gold) -> var(--ember)
var(--gold-bright) -> var(--cream)
var(--gold-glow) -> var(--ember-glow)
var(--gold-glow-soft) -> var(--ember-glow-soft)
var(--gold-border) -> var(--ember-border)
var(--night-deep) -> var(--ink)
var(--night-mid) -> var(--surface)
var(--text-primary) -> var(--cream)
var(--lavender) -> var(--ember)
var(--lavender-soft) -> var(--ember-glow-soft)
```

Do not change display, grid, flex, width, height, padding, margin, gap, position, or breakpoint declarations.

- [ ] **Step 4: Remove the loading-state literal**

Change only the inline color:

```jsx
style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dv-text-dim)', fontSize: '0.9rem' }}
```

- [ ] **Step 5: Run the focused test and build**

Run: `cd dreamweaver-web && npx jest src/app/upgrade/upgradeTheme.test.js --runInBand`

Expected: PASS.

Run: `cd dreamweaver-web && npm run build`

Expected: production build completes and `/upgrade` is generated successfully.

- [ ] **Step 6: Commit**

```bash
cd dreamweaver-web
git add src/app/upgrade/page.module.css src/app/upgrade/UpgradeClient.js src/app/upgrade/upgradeTheme.test.js
git commit -m "feat: preview Emberlight on upgrade"
```

---

### Task 5: Add the One-Time Lamplight Upgrade Transition

**Files:**
- Create: `src/utils/emberlightTransition.js`
- Create: `src/utils/emberlightTransition.test.js`
- Create: `src/components/EmberlightUpgradeWash.js`
- Create: `src/components/EmberlightUpgradeWash.module.css`
- Modify: `src/components/AppShell.js:280-285`

**Interfaces:**
- Consumes: `THEME_CHANGE_EVENT` from Task 1 and the event detail `{ previous, current }`.
- Produces: `shouldRunUpgradeWash({ previous, current, seen, reducedMotion }) -> boolean`, `clampWashSeconds(value) -> number`, and a one-time non-interactive overlay.

- [ ] **Step 1: Write the transition-policy tests**

```js
import { clampWashSeconds, shouldRunUpgradeWash } from './emberlightTransition';

test('runs only on a confirmed free-to-premium edge', () => {
  expect(shouldRunUpgradeWash({
    previous: false,
    current: true,
    seen: false,
    reducedMotion: false,
  })).toBe(true);
});

test.each([
  { previous: null, current: true, seen: false, reducedMotion: false },
  { previous: true, current: true, seen: false, reducedMotion: false },
  { previous: false, current: true, seen: true, reducedMotion: false },
  { previous: false, current: true, seen: false, reducedMotion: true },
])('does not animate for $previous -> $current', (state) => {
  expect(shouldRunUpgradeWash(state)).toBe(false);
});

test.each([
  [undefined, 6],
  [1, 2],
  [6, 6],
  [14, 10],
])('clamps %p seconds to %p', (input, expected) => {
  expect(clampWashSeconds(input)).toBe(expected);
});
```

- [ ] **Step 2: Run the tests and confirm the policy module is missing**

Run: `cd dreamweaver-web && npx jest src/utils/emberlightTransition.test.js --runInBand`

Expected: FAIL because `./emberlightTransition` cannot be resolved.

- [ ] **Step 3: Implement the policy**

```js
export const UPGRADE_WASH_SEEN_KEY = 'dv_emberlight_wash_seen_v1';

export function shouldRunUpgradeWash({
  previous,
  current,
  seen,
  reducedMotion,
}) {
  return previous === false
    && current === true
    && seen !== true
    && reducedMotion !== true;
}

export function clampWashSeconds(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(10, Math.max(2, parsed));
}
```

- [ ] **Step 4: Implement the transition component**

```jsx
'use client';

import { useEffect, useState } from 'react';
import { THEME_CHANGE_EVENT } from '@/utils/emberlightTheme';
import {
  UPGRADE_WASH_SEEN_KEY,
  clampWashSeconds,
  shouldRunUpgradeWash,
} from '@/utils/emberlightTransition';
import styles from './EmberlightUpgradeWash.module.css';

export default function EmberlightUpgradeWash() {
  const [active, setActive] = useState(false);
  const seconds = clampWashSeconds(process.env.NEXT_PUBLIC_EMBERLIGHT_WASH_SECONDS);

  useEffect(() => {
    const onPremiumChange = (event) => {
      let seen = false;
      try {
        seen = localStorage.getItem(UPGRADE_WASH_SEEN_KEY) === '1';
      } catch {}
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const detail = event.detail ?? {};
      try {
        if (detail.previous === false && detail.current === true) {
          localStorage.setItem(UPGRADE_WASH_SEEN_KEY, '1');
        }
      } catch {}
      if (!shouldRunUpgradeWash({ ...detail, seen, reducedMotion })) return;
      setActive(true);
      window.setTimeout(() => setActive(false), seconds * 1000);
    };
    window.addEventListener(THEME_CHANGE_EVENT, onPremiumChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onPremiumChange);
  }, [seconds]);

  if (!active) return null;
  return (
    <div
      className={styles.overlay}
      style={{ '--wash-seconds': `${seconds}s` }}
      aria-hidden="true"
    >
      <div className={styles.wash} />
      <div className={styles.line}>the lamp turns down…</div>
      <div className={styles.motes} />
    </div>
  );
}
```

- [ ] **Step 5: Add the non-interactive sleep-safe CSS**

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: hidden;
  pointer-events: none;
}

.wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(130% 95% at 50% 112%, rgba(233, 164, 94, 0.60), rgba(233, 164, 94, 0.14) 55%, rgba(42, 37, 80, 0) 85%);
  animation: emberlight-wash var(--wash-seconds) ease both;
}

.line {
  position: absolute;
  right: 0;
  bottom: 17%;
  left: 0;
  color: #F6E7CF;
  font-family: var(--font-dream-display), serif;
  font-size: 1rem;
  font-style: italic;
  text-align: center;
  animation: emberlight-line var(--wash-seconds) ease both;
}

.motes {
  position: absolute;
  inset: 0;
  opacity: 0.55;
  background-image:
    radial-gradient(circle, #F6D9A8 0 1.5px, transparent 2.5px),
    radial-gradient(circle, #F6D9A8 0 1px, transparent 2px);
  background-position: 18% 88%, 76% 72%;
  background-size: 140px 180px, 190px 230px;
  animation: emberlight-motes 18s linear both;
}

@keyframes emberlight-wash {
  0% { opacity: 0; }
  25%, 75% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes emberlight-line {
  0% { opacity: 0; transform: translateY(10px); }
  30%, 78% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; }
}

@keyframes emberlight-motes {
  0% { opacity: 0; transform: translateY(12%); }
  12% { opacity: 0.55; }
  100% { opacity: 0; transform: translateY(-12%); }
}

@media (prefers-reduced-motion: reduce) {
  .overlay { display: none; }
}

html[data-battery-saver] .motes,
html[data-native] .motes {
  display: none;
}
```

- [ ] **Step 6: Mount the wash beside the theme controller**

Add:

```js
import EmberlightUpgradeWash from '@/components/EmberlightUpgradeWash';
```

Mount:

```jsx
<EmberlightThemeController />
<EmberlightUpgradeWash />
```

- [ ] **Step 7: Run focused and full tests**

Run: `cd dreamweaver-web && npx jest src/utils/emberlightTransition.test.js src/utils/emberlightTheme.test.js --runInBand`

Expected: PASS.

Run: `cd dreamweaver-web && npx jest --runInBand`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd dreamweaver-web
git add src/utils/emberlightTransition.js src/utils/emberlightTransition.test.js src/components/EmberlightUpgradeWash.js src/components/EmberlightUpgradeWash.module.css src/components/AppShell.js
git commit -m "feat: add one-time Emberlight upgrade wash"
```

---

### Task 6: Mirror Emberlight into Flutter Native Chrome

**Files:**
- Create: `dreamweaver/lib/emberlight_theme_bridge.dart`
- Create: `dreamweaver/test/emberlight_theme_bridge_test.dart`
- Modify: `dreamweaver/lib/config/theme.dart:1-190`
- Modify: `dreamweaver/lib/main.dart:29-58,199-211,314-323`

**Interfaces:**
- Consumes: web messages `'free' | 'premium'` posted to `window.DreamValleyTheme`.
- Produces: `parseEmberlightTheme(String) -> bool?`, `DreamTheme.emberlightTheme`, and synchronized Flutter system chrome.

- [ ] **Step 1: Write the failing parser and palette tests**

```dart
import 'package:dreamweaver/config/theme.dart';
import 'package:dreamweaver/emberlight_theme_bridge.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('theme bridge fails closed for unknown messages', () {
    expect(parseEmberlightTheme('premium'), true);
    expect(parseEmberlightTheme('free'), false);
    expect(parseEmberlightTheme(''), null);
    expect(parseEmberlightTheme('gold'), null);
  });

  test('native premium palette matches the web contract', () {
    expect(DreamTheme.emberInk.value, 0xFF201418);
    expect(DreamTheme.emberSurface.value, 0xFF2C1D20);
    expect(DreamTheme.ember.value, 0xFFD9A05F);
    expect(DreamTheme.emberCream.value, 0xFFF2E6D8);
  });
}
```

- [ ] **Step 2: Run the Flutter test and confirm missing symbols**

Run: `cd dreamweaver && flutter test test/emberlight_theme_bridge_test.dart`

Expected: FAIL because the bridge and Emberlight palette do not exist.

- [ ] **Step 3: Implement the fail-closed message parser**

```dart
bool? parseEmberlightTheme(String message) {
  if (message == 'premium') return true;
  if (message == 'free') return false;
  return null;
}
```

- [ ] **Step 4: Add the native Emberlight theme**

Add to `DreamTheme`:

```dart
static const Color emberInk = Color(0xFF201418);
static const Color emberSurface = Color(0xFF2C1D20);
static const Color emberRaised = Color(0xFF3A262A);
static const Color ember = Color(0xFFD9A05F);
static const Color emberDeep = Color(0xFFA8743F);
static const Color emberCream = Color(0xFFF2E6D8);
static const Color emberTextDim = Color(0xFFB39A86);
static const Color emberTextFaint = Color(0xFF8D7568);

static ThemeData get emberlightTheme {
  return darkTheme.copyWith(
    scaffoldBackgroundColor: emberInk,
    colorScheme: const ColorScheme.dark(
      primary: ember,
      secondary: emberDeep,
      surface: emberSurface,
      error: Color(0xFFFF6B6B),
      onPrimary: emberInk,
      onSecondary: emberCream,
      onSurface: emberCream,
      onError: emberCream,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      foregroundColor: emberCream,
    ),
  );
}
```

- [ ] **Step 5: Make the Flutter root react to settled theme messages**

Add a top-level notifier:

```dart
final ValueNotifier<bool> emberlightThemeEnabled = ValueNotifier<bool>(false);
```

Wrap the current `MaterialApp` return:

```dart
return ValueListenableBuilder<bool>(
  valueListenable: emberlightThemeEnabled,
  builder: (context, premium, child) {
    return MaterialApp(
      title: 'Dream Valley',
      debugShowCheckedModeBanner: false,
      theme: premium ? DreamTheme.emberlightTheme : DreamTheme.darkTheme,
      home: const WebAppScreen(),
    );
  },
);
```

Register the channel beside `DreamValleySystemRequest`:

```dart
_controller.addJavaScriptChannel(
  'DreamValleyTheme',
  onMessageReceived: (JavaScriptMessage message) {
    final premium = parseEmberlightTheme(message.message);
    if (premium == null) return;
    emberlightThemeEnabled.value = premium;
    SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor:
          premium ? DreamTheme.emberInk : DreamTheme.deepNight,
      systemNavigationBarIconBrightness: Brightness.light,
    ));
  },
);
```

- [ ] **Step 6: Run focused and full Flutter tests**

Run: `cd dreamweaver && flutter test test/emberlight_theme_bridge_test.dart`

Expected: PASS.

Run: `cd dreamweaver && flutter test`

Expected: PASS.

- [ ] **Step 7: Commit in the Flutter repository**

```bash
cd dreamweaver
git add lib/emberlight_theme_bridge.dart test/emberlight_theme_bridge_test.dart lib/config/theme.dart lib/main.dart
git commit -m "feat: mirror Emberlight into native chrome"
```

---

### Task 7: Add Release Verification and Complete the Cross-Repository Rollout

**Files:**
- Create: `scripts/verify-emberlight-routes.mjs`
- Create: `docs/superpowers/verification/2026-07-24-emberlight-checklist.md`
- Modify: `package.json:5-8`

**Interfaces:**
- Consumes: all web and Flutter deliverables from Tasks 1–6.
- Produces: a repeatable automated gate and a finite manual acceptance checklist for simultaneous release.

- [ ] **Step 1: Add the route and contract verification script**

```js
import fs from 'node:fs';

const requiredFiles = [
  'src/app/page.js',
  'src/app/explore/page.js',
  'src/app/player/[id]/page.js',
  'src/app/playlist/page.js',
  'src/app/my-stories/page.js',
  'src/app/settings/page.js',
  'src/app/login/page.js',
  'src/app/pricing/PricingClient.js',
  'src/app/upgrade/UpgradeClient.js',
  'src/app/upgrade/success/page.js',
  'src/app/upgrade/cancelled/page.js',
  'src/app/privacy/page.js',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Missing verification route: ${file}`);
}

const globals = fs.readFileSync('src/app/globals.css', 'utf8');
for (const token of [
  '#201418',
  '#2C1D20',
  '#3A262A',
  '#D9A05F',
  '#A8743F',
  '#F2E6D8',
  '#B39A86',
  '#8D7568',
]) {
  if (!globals.includes(token)) throw new Error(`Missing Emberlight token: ${token}`);
}

const upgrade = fs.readFileSync('src/app/upgrade/page.module.css', 'utf8');
if (!upgrade.includes('--ink: #201418')) {
  throw new Error('Upgrade page is not an Emberlight preview');
}
```

- [ ] **Step 2: Add verification commands to `package.json`**

Add:

```json
"test:emberlight": "jest src/utils/emberlightTheme.test.js src/utils/emberlightTransition.test.js src/components/EmberlightThemeController.test.js src/app/upgrade/upgradeTheme.test.js --runInBand",
"verify:emberlight": "node scripts/audit-theme-colors.mjs && node scripts/verify-emberlight-routes.mjs"
```

- [ ] **Step 3: Create the release checklist**

```markdown
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
```

- [ ] **Step 4: Run all automated web gates**

Run: `cd dreamweaver-web && npm run test:emberlight`

Expected: PASS.

Run: `cd dreamweaver-web && npm run verify:emberlight`

Expected: exit code 0 with no residual palette or route-contract errors.

Run: `cd dreamweaver-web && npx jest --runInBand && npm run build`

Expected: all tests pass and the production build completes.

- [ ] **Step 5: Run all automated Flutter gates**

Run: `cd dreamweaver && flutter test`

Expected: all Flutter tests pass.

- [ ] **Step 6: Complete the manual release checklist**

Run both applications against the same staging backend and check every item in `docs/superpowers/verification/2026-07-24-emberlight-checklist.md`.

Expected: all checklist items are checked with no layout, entitlement, checkout, restore, contrast, or motion regressions.

- [ ] **Step 7: Commit the verification gate**

```bash
cd dreamweaver-web
git add scripts/verify-emberlight-routes.mjs docs/superpowers/verification/2026-07-24-emberlight-checklist.md package.json
git commit -m "test: add Emberlight release verification"
```

- [ ] **Step 8: Confirm both repositories are ready for one release**

Run: `git -C dreamweaver-web status --short`

Expected: no uncommitted Emberlight files.

Run: `git -C dreamweaver status --short`

Expected: no uncommitted Emberlight files; pre-existing unrelated user changes may remain and must not be included in Emberlight commits.
