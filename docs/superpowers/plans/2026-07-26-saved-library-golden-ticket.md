# Saved Library Golden Ticket Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain saved-library upgrade banner and oversized trailing card with the approved compact Golden Ticket design.

**Architecture:** Keep entitlement and routing behavior inside `MyStoriesPage`, where save count and `handleUpgrade` already exist. Replace only the presentation structure and CSS, preserving the existing free/premium branches, trailing-card placement, and save-library data flow.

**Tech Stack:** Next.js App Router, React, CSS Modules, Jest, jsdom

## Global Constraints

- Free save capacity remains 5.
- Premium save capacity remains 30.
- The trailing card does not consume a save slot.
- Existing save, unsave, filtering, offline download, and reconciliation behavior remains unchanged.
- The free banner shows `{saved} of 5 saved`, `More slots + offline downloads`, and `Get Premium →`.
- The free card shows `Premium pass`, `Unlock your full library`, and `30 favorites + offline downloads`.
- The premium card shows `Premium library`, `30 saves included`, and `Save favorites and listen offline`.
- The Golden Ticket uses no showcase image.
- The card must remain compact at narrow mobile widths and must not inherit oversized entitlement-theme typography.

---

### Task 1: Golden Ticket presentation

**Files:**
- Modify: `src/app/my-stories/page.js:194-231`
- Modify: `src/app/my-stories/page.module.css:96-160`
- Test: `src/app/my-stories/MyStoriesPage.test.js`

**Interfaces:**
- Consumes: `saved.length`, `saveCap`, `isPremiumUser`, `handleUpgrade()`
- Produces: a free clickable Golden Ticket banner/card and a non-interactive premium Golden Ticket card

- [ ] **Step 1: Write failing free-user behavior tests**

Update the existing free-user page test to assert the three banner messages and three card messages independently, while retaining independent click assertions for both controls:

```js
const upgradeBanner = container.querySelector('[data-library-upgrade-banner]');
const planCard = container.querySelector('[data-library-plan-card="free"]');

expect(upgradeBanner.textContent).toContain('5 of 5 saved');
expect(upgradeBanner.textContent).toContain('More slots + offline downloads');
expect(upgradeBanner.textContent).toContain('Get Premium →');
expect(planCard.textContent).toContain('Premium pass');
expect(planCard.textContent).toContain('Unlock your full library');
expect(planCard.textContent).toContain('30 favorites + offline downloads');
expect(planCard.querySelector('img')).toBeNull();

await act(async () => upgradeBanner.click());
expect(mockRouter.push).toHaveBeenCalledWith('/upgrade?intent=%2Fmy-stories');
mockRouter.push.mockClear();
await act(async () => planCard.click());
expect(mockRouter.push).toHaveBeenCalledWith('/upgrade?intent=%2Fmy-stories');
```

The production mutations caught are restoring the plain single-line banner, restoring the showcase image, omitting any ticket message, or disconnecting either upgrade control.

- [ ] **Step 2: Write failing premium-user behavior tests**

Update the premium test to verify the complete non-interactive ticket:

```js
const premiumCard = container.querySelector('[data-library-plan-card="premium"]');

expect(premiumCard.tagName).toBe('DIV');
expect(premiumCard.textContent).toContain('Premium library');
expect(premiumCard.textContent).toContain('30 saves included');
expect(premiumCard.textContent).toContain('Save favorites and listen offline');
expect(premiumCard.querySelector('img')).toBeNull();
expect(container.querySelector('[data-library-upgrade-banner]')).toBeNull();
```

The production mutations caught are showing an upgrade action to premium users, restoring oversized legacy copy, restoring the image, or showing the free banner.

- [ ] **Step 3: Run the page test and verify RED**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: FAIL because the current banner lacks the structured messages and the current plan cards use `/upgrade-showcase.webp` with the old copy.

- [ ] **Step 4: Implement the Golden Ticket markup**

Replace the free banner markup with:

```jsx
<button
  type="button"
  onClick={handleUpgrade}
  className={styles.upgradeBanner}
  data-library-upgrade-banner
>
  <span className={styles.savedCount}>{saved.length} of {saveCap}</span>
  <span className={styles.upgradeBannerCopy}>
    <strong>saved</strong>
    <small>More slots + offline downloads</small>
  </span>
  <span className={styles.upgradeBannerAction}>Get Premium →</span>
</button>
```

Replace both image-led plan cards with a shared ticket structure. The free button contains:

```jsx
<span className={styles.ticketBorder} aria-hidden />
<span className={styles.ticketBody}>
  <span className={styles.ticketEyebrow}>Premium pass</span>
  <strong>Unlock your full library</strong>
  <span>30 favorites + offline downloads</span>
</span>
```

The premium `div` contains:

```jsx
<span className={styles.ticketBorder} aria-hidden />
<span className={styles.ticketBody}>
  <span className={styles.ticketEyebrow}>Premium library</span>
  <strong>30 saves included</strong>
  <span>Save favorites and listen offline</span>
</span>
```

Keep the existing `data-library-plan-card` values and call `handleUpgrade` only from the free button.

- [ ] **Step 5: Implement the compact Golden Ticket styles**

Replace the banner/card rules with explicit component typography and proportions:

```css
.upgradeBanner {
  appearance: none;
  width: 100%;
  margin: 0 0 18px;
  padding: 11px 14px;
  border: 1px solid rgba(255, 220, 151, 0.8);
  border-radius: 16px;
  background: linear-gradient(105deg, #f7cd7a, #d99838);
  color: #2a1908;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  text-align: left;
  box-shadow: 0 8px 22px rgba(218, 143, 44, 0.24);
}

.savedCount {
  font-size: 16px;
  font-weight: 800;
}

.upgradeBannerCopy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.upgradeBannerCopy strong,
.upgradeBannerCopy small,
.upgradeBannerAction {
  font-family: 'Quicksand', sans-serif;
}

.upgradeBannerCopy strong {
  font-size: 13px;
}

.upgradeBannerCopy small {
  font-size: 11px;
  line-height: 1.25;
  opacity: 0.78;
}

.upgradeBannerAction {
  padding: 7px 9px;
  border-radius: 999px;
  background: rgba(42, 25, 8, 0.9);
  color: #fff8e8;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.planCard {
  appearance: none;
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 0;
  aspect-ratio: 0.76;
  padding: 18px;
  border: 1px solid #e1a84d;
  border-radius: var(--radius-lg);
  background: linear-gradient(155deg, #724918, #2a1a0c);
  color: #fff7e6;
  font-family: 'Quicksand', sans-serif;
  text-align: left;
}

.ticketBorder {
  position: absolute;
  inset: 11px;
  border: 1px dashed rgba(255, 229, 179, 0.58);
  border-radius: 12px;
  pointer-events: none;
}

.ticketBody {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ticketEyebrow {
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.ticketBody strong {
  font-size: clamp(15px, 4.2vw, 20px);
  line-height: 1.15;
}

.ticketBody > span:last-child {
  font-size: clamp(11px, 3vw, 14px);
  line-height: 1.3;
  opacity: 0.82;
}
```

Retain pointer/focus styling for the free card, keep the premium card non-clickable, and add a narrow-width banner media rule that moves `Get Premium →` below the supporting copy when the available width is below 360px.

- [ ] **Step 6: Run the page test and verify GREEN**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: all page tests PASS.

- [ ] **Step 7: Run focused regressions**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/PremiumOfflineContract.test.js --runInBand
```

Expected: all selected suites PASS with zero failures.

- [ ] **Step 8: Verify and commit**

Run:

```bash
git diff --check
git status --short
git add src/app/my-stories/page.js src/app/my-stories/page.module.css src/app/my-stories/MyStoriesPage.test.js docs/superpowers/plans/2026-07-26-saved-library-golden-ticket.md
git commit -m "feat: redesign saved library golden ticket"
```

Expected: the commit contains only the page markup, styles, tests, and this plan.
