# Saved Library Upgrade Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable free upgrade messaging and a permanent entitlement-aware trailing card to My Stories.

**Architecture:** Keep the behavior inside `MyStoriesPage`, where save count and entitlement are already available. Render the saved-content grid even when empty so the trailing card is always present, reuse `handleUpgrade` for both free calls to action, and isolate visual treatment in the page CSS module.

**Tech Stack:** Next.js App Router, React, CSS Modules, Jest, jsdom

## Global Constraints

- Free save capacity remains 5.
- Premium save capacity remains 30.
- The trailing card does not consume a save slot.
- Existing save, unsave, filtering, offline download, and reconciliation behavior remains unchanged.
- Free copy is `{saved}/5 saved. Upgrade to Premium for more slots and offline downloads`.
- Premium copy is `You have 30 slots. Save more favorites that you can listen to offline.`

---

### Task 1: Entitlement-aware saved-library calls to action

**Files:**
- Modify: `src/app/my-stories/page.js:194-242`
- Modify: `src/app/my-stories/page.module.css:96-102`
- Test: `src/app/my-stories/MyStoriesPage.test.js`

**Interfaces:**
- Consumes: `isPremiumUser: boolean`, `saveCap: number | null`, `saved: Content[]`, `filteredContent: Content[]`, `handleUpgrade(): void`
- Produces: a free upgrade banner and trailing card that call `handleUpgrade`, or a premium informational trailing card

- [ ] **Step 1: Write failing free-user behavior tests**

Add a render helper that resolves `mockGetUserSaves` with a complete free response:

```js
async function renderPage(response) {
  mockOpenOfflineStore.mockRejectedValue(new Error('IndexedDB unavailable'));
  mockGetUserSaves.mockReset().mockResolvedValue(response);
  mockRouter.push.mockReset();
  const container = document.createElement('div');
  const root = createRoot(container);
  document.body.appendChild(container);
  await act(async () => {
    root.render(<MyStoriesPage />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return { container, root };
}
```

Add a test whose production mutation is removing either free upgrade entry point or making it consume a saved slot:

```js
test('free users get clickable upgrade messaging and a trailing locked card without losing a save slot', async () => {
  const { container, root } = await renderPage({
    items: [
      { id: 'one', title: 'One' },
      { id: 'two', title: 'Two' },
      { id: 'three', title: 'Three' },
      { id: 'four', title: 'Four' },
      { id: 'five', title: 'Five' },
    ],
    effective_premium: false,
    save_cap: 5,
  });

  expect(container.textContent).toContain(
    '5/5 saved. Upgrade to Premium for more slots and offline downloads'
  );
  expect(container.querySelectorAll('[data-saved-content-card]')).toHaveLength(5);
  const upgradeActions = [...container.querySelectorAll('button')]
    .filter((button) => button.textContent.includes('Upgrade to Premium'));
  expect(upgradeActions).toHaveLength(2);

  await act(async () => upgradeActions[1].click());
  expect(mockRouter.push).toHaveBeenCalledWith(
    '/upgrade?intent=%2Fmy-stories'
  );

  await act(async () => root.unmount());
  container.remove();
});
```

Update the `ContentCard` test double so real saved entries can be distinguished from the promotional card:

```js
jest.mock('@/components/ContentCard', () => ({ content }) => (
  <div data-saved-content-card>{content.title}</div>
));
```

- [ ] **Step 2: Run the free-user test and verify RED**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: FAIL because the new copy is absent and no trailing upgrade button exists.

- [ ] **Step 3: Write the failing premium-user behavior test**

Add a test whose production mutation is showing the locked upgrade state to premium users or hiding the trailing card:

```js
test('premium users get a permanent offline-listening encouragement card', async () => {
  const { container, root } = await renderPage({
    items: [{ id: 'one', title: 'One' }],
    effective_premium: true,
    save_cap: 30,
  });

  expect(container.textContent).toContain(
    'You have 30 slots. Save more favorites that you can listen to offline.'
  );
  expect(container.textContent).not.toContain('Upgrade to Premium');
  expect(container.querySelector('[data-library-plan-card="premium"]')).not.toBeNull();

  await act(async () => root.unmount());
  container.remove();
});
```

- [ ] **Step 4: Run both tests and verify RED**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: both new tests FAIL because the entitlement-aware trailing card is absent.

- [ ] **Step 5: Implement the minimal page behavior**

Replace the free banner with a semantic button using the exact copy:

```jsx
{saveCap != null && !isPremiumUser && (
  <button type="button" onClick={handleUpgrade} className={styles.upgradeBanner}>
    <span aria-hidden>✨</span>
    <span>{saved.length}/{saveCap} saved. Upgrade to Premium for more slots and offline downloads</span>
  </button>
)}
```

Render a grid regardless of saved-item count, keep every real item, and append the plan card:

```jsx
{loading ? (
  <div className={styles.loadingMessage}>{t('loading')}</div>
) : (
  <>
    <div className={styles.grid}>
      {filteredContent.map((item) => (
        <ContentCard key={item.id} content={item} />
      ))}
      {isPremiumUser ? (
        <div className={styles.planCard} data-library-plan-card="premium">
          <img src="/upgrade-showcase.webp" alt="" className={styles.planCardImage} />
          <strong>You have 30 slots.</strong>
          <span>Save more favorites that you can listen to offline.</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleUpgrade}
          className={`${styles.planCard} ${styles.lockedPlanCard}`}
          data-library-plan-card="free"
        >
          <img src="/upgrade-showcase.webp" alt="" className={styles.planCardImage} />
          <span className={styles.lockBadge}>🔒 Premium</span>
          <strong>Upgrade to Premium</strong>
          <span>Get more slots and offline downloads</span>
        </button>
      )}
    </div>
    {filteredContent.length === 0 && (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>❤️</div>
        <h3 className={styles.emptyTitle}>{t('myEmptyFavorites')}</h3>
        <p className={styles.emptyText}>{t('myEmptyFavoritesText')}</p>
        <button onClick={() => router.push('/before-bed')} className="btn btn-primary">
          {t('myExplore')}
        </button>
      </div>
    )}
  </>
)}
```

Add CSS module rules for a full-width clickable banner, a card-shaped image treatment, a visible lock badge, accessible focus state, and existing mobile grid widths. Use `appearance: none`, `width: 100%`, `text-align: left`, `overflow: hidden`, and the existing color variables so both entitlement themes remain legible.

- [ ] **Step 6: Run the page tests and verify GREEN**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: all tests in the suite PASS.

- [ ] **Step 7: Run focused regressions**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/PremiumOfflineContract.test.js --runInBand
```

Expected: all selected suites PASS with zero failures.

- [ ] **Step 8: Verify the patch and commit**

Run:

```bash
git diff --check
git status --short
git add src/app/my-stories/page.js src/app/my-stories/page.module.css src/app/my-stories/MyStoriesPage.test.js docs/superpowers/plans/2026-07-26-saved-library-upgrade-card.md
git commit -m "feat: add saved library upgrade card"
```

Expected: `git diff --check` exits 0 and the commit contains only the page, styles, tests, and plan.
