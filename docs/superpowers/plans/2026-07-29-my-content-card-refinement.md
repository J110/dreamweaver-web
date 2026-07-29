# My Content Card Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Favorite cards match the shelf preview height by removing their metadata footer and replace placeholder locked-card artwork with four existing production story covers.

**Architecture:** Add an opt-in `compact` presentation prop to the shared `ContentCard` so My Content can omit metadata without changing other pages. Keep locked previews data-driven and replace only their fixed image URLs with stable `/covers/` assets already served in production.

**Tech Stack:** Next.js 14, React, CSS Modules, Jest, React DOM test utilities

## Global Constraints

- Favorites keep cover images, titles, age badges, saved state, navigation, and accessibility.
- Duration and mood remain visible on every non-compact `ContentCard`.
- Characters and Voices retain their current localized labels, locked badges, sizing, and coming-soon interactions.
- Use fixed production `/covers/` URLs; do not derive artwork from a user's saved library.
- The Emberlight audit and production build must pass before deployment.

---

### Task 1: Compact Favorite Cards

**Files:**
- Modify: `src/components/ContentCard.js:27,208-218`
- Modify: `src/components/my-content/MyContentComponents.test.js:64-82`
- Modify: `src/app/my-stories/page.js:211`
- Modify: `src/app/my-stories/page.test.js:91-93`

**Interfaces:**
- Consumes: existing `ContentCard({ content, onClick })`
- Produces: `ContentCard({ content, onClick, compact = false })`, where `compact=true` omits `.cardFooter`

- [ ] **Step 1: Write the failing component tests**

Add tests that prove compact cards omit duration and mood while ordinary cards retain them:

```jsx
test('compact ContentCard omits duration and mood metadata', () => {
  act(() => root.render(
    <ContentCard compact content={{
      id: 'favorite-1',
      title: 'Moon Story',
      type: 'story',
      category: 'bedtime',
      age_group: '2-5',
      duration: 5,
      mood: 'curious',
    }} />
  ));

  expect(host.textContent).not.toContain('5 min');
  expect(host.textContent).not.toContain('Curious');
  expect(host.querySelector('h3').textContent).toBe('Moon Story');
});

test('ordinary ContentCard retains duration and mood metadata', () => {
  act(() => root.render(
    <ContentCard content={{
      id: 'story-1',
      title: 'Moon Story',
      type: 'story',
      category: 'bedtime',
      age_group: '2-5',
      duration: 5,
      mood: 'curious',
    }} />
  ));

  expect(host.textContent).toContain('5 min');
  expect(host.textContent).toContain('Curious');
});
```

Update the page-test `ContentCard` mock to expose compact mode:

```jsx
jest.mock('../../components/ContentCard', () => function ContentCard({ content, compact }) {
  return <article data-compact={compact ? 'true' : 'false'}>{content.title}</article>;
});
```

Add a page assertion after rendering one saved item:

```jsx
expect(host.querySelector('article[data-compact="true"]')).not.toBeNull();
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- --runInBand src/components/my-content/MyContentComponents.test.js src/app/my-stories/page.test.js
```

Expected: FAIL because `ContentCard` always renders its footer and My Content does not pass `compact`.

- [ ] **Step 3: Implement compact mode**

Change the component signature:

```jsx
export default function ContentCard({ content, onClick, compact = false }) {
```

Render the existing footer only outside compact mode:

```jsx
{!compact && (
  <div className={styles.cardFooter}>
    <span className={styles.cardMeta}>
      {durationLabel && <><span className={styles.clockIcon}>&#128336;</span> {durationLabel}</>}
    </span>
    {content.mood && MOOD_CONFIG[content.mood] && (
      <span className={`${styles.moodBadge} ${styles[`mood_${content.mood}`]}`}>
        {MOOD_CONFIG[content.mood].emoji} {MOOD_CONFIG[content.mood].label[lang] || MOOD_CONFIG[content.mood].label.en}
      </span>
    )}
  </div>
)}
```

Pass compact mode only in My Content:

```jsx
{favorites.map((item) => <ContentCard key={item.id} content={item} compact />)}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- --runInBand src/components/my-content/MyContentComponents.test.js src/app/my-stories/page.test.js
```

Expected: both suites PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContentCard.js src/components/my-content/MyContentComponents.test.js src/app/my-stories/page.js src/app/my-stories/page.test.js
git commit -m "fix(my-content): compact favorite cards"
```

### Task 2: Replace Locked Preview Artwork

**Files:**
- Modify: `src/app/my-stories/page.js:25-34`
- Modify: `src/app/my-stories/page.test.js`

**Interfaces:**
- Consumes: existing `LockedPreviewCard({ imageSrc, label, lockedLabel, onActivate })`
- Produces: four stable preview definitions referencing existing production cover URLs

- [ ] **Step 1: Write the failing page test**

Add a test that renders the page and checks the four fixed preview assets:

```jsx
test('locked character and voice previews use existing story covers', async () => {
  await renderPage();

  const sources = Array.from(
    host.querySelectorAll('button[aria-label^="Locked:"] img'),
    (image) => image.getAttribute('src')
  );

  expect(sources).toEqual(expect.arrayContaining([
    '/covers/gen-40f8fecefbfe.svg',
    '/covers/gen-1ba62b9e17cc.svg',
    '/covers/warning-6-8-59f6.svg',
    '/covers/gen-8c9859bb56c2.svg',
  ]));
});
```

- [ ] **Step 2: Run the page test and verify RED**

Run:

```bash
npm test -- --runInBand src/app/my-stories/page.test.js
```

Expected: FAIL because the locked previews still use showcase, default-blog, and Open Graph images.

- [ ] **Step 3: Replace only the image URLs**

Update the preview definitions:

```jsx
const LOCKED_PREVIEWS = {
  characters: [
    { id: 'character-1', labelKey: 'myMoonExplorer', image: '/covers/gen-40f8fecefbfe.svg' },
    { id: 'character-2', labelKey: 'myDreamGuardian', image: '/covers/gen-1ba62b9e17cc.svg' },
  ],
  voices: [
    { id: 'voice-1', labelKey: 'myGentleStoryteller', image: '/covers/warning-6-8-59f6.svg' },
    { id: 'voice-2', labelKey: 'myMoonlightVoice', image: '/covers/gen-8c9859bb56c2.svg' },
  ],
};
```

- [ ] **Step 4: Run the page test and verify GREEN**

Run:

```bash
npm test -- --runInBand src/app/my-stories/page.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/my-stories/page.js src/app/my-stories/page.test.js
git commit -m "fix(my-content): use story covers for previews"
```

### Task 3: Verify and Deploy

**Files:**
- Verify: `src/components/ContentCard.js`
- Verify: `src/app/my-stories/page.js`
- Verify: `src/components/my-content/MyContentComponents.test.js`
- Verify: `src/app/my-stories/page.test.js`

**Interfaces:**
- Consumes: completed compact-card and fixed-cover changes
- Produces: pushed `main` commit and a restarted production Next.js process

- [ ] **Step 1: Run the focused regression suites**

```bash
npm test -- --runInBand src/components/my-content/MyContentComponents.test.js src/app/my-stories/page.test.js src/app/my-stories/MyStoriesPage.test.js
```

Expected: all tests PASS.

- [ ] **Step 2: Run theme and production-build verification**

```bash
npm run verify:emberlight
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 3: Capture a Deploy Guard snapshot**

From the backend feature worktree:

```bash
python3 scripts/deploy_guard.py snapshot
```

Expected: snapshot completes and records the current production content counts.

- [ ] **Step 4: Push the feature worktree to production main**

```bash
git push origin HEAD:main
```

Expected: `origin/main` advances to the verified commit.

- [ ] **Step 5: Deploy the changed runtime paths**

On `dreamvalley-prod` in `asia-south1-c`, fetch `origin/main`, check out only:

```text
src/components/ContentCard.js
src/app/my-stories/page.js
```

Then rebuild, copy `public` and `.next/static` into the standalone bundle, restart the root-owned `dreamweaver-web` PM2 process, and require HTTP 200 from `https://dreamvalley.app/my-stories`.

- [ ] **Step 6: Run Deploy Guard verification**

Run on the production VM:

```bash
cd /opt/dreamweaver-backend
python3 scripts/deploy_guard.py verify
```

Expected: application, content, playlist, media, frontend, theme, and radio checks pass. If YouTube remains offline, preserve the successful application checks and report the external broadcast session as the sole blocker.

- [ ] **Step 7: Verify the deployed DOM**

Open `https://dreamvalley.app/my-stories` and confirm:

```text
Favorite cards contain no duration or mood text.
Characters use two fixed /covers/ images.
Voices use two fixed /covers/ images.
All creation and locked cards retain their labels and interactions.
```
