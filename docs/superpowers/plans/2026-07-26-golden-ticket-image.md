# Golden Ticket Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the existing upgrade artwork to the trailing Golden Ticket while preserving its compact mobile proportions.

**Architecture:** Add the same decorative image to both entitlement branches and split the fixed-aspect card into a 45% image region and 55% ticket body. Keep entitlement, routing, copy, slot capacity, and banner behavior unchanged.

**Tech Stack:** Next.js App Router, React, CSS Modules, Jest, jsdom

## Global Constraints

- Both trailing cards use `/upgrade-showcase.webp`.
- Artwork occupies the upper 45% with `object-fit: cover`.
- Ticket copy remains in the lower 55%.
- The existing fixed compact aspect ratio remains unchanged.
- Free capacity remains 5 and premium capacity remains 30.
- The trailing card consumes no save slot.
- Free card remains clickable; premium card remains non-interactive.
- Existing save, unsave, filtering, offline download, reconciliation, copy, and banner behavior remains unchanged.

---

### Task 1: Split image-and-ticket card

**Files:**
- Modify: `src/app/my-stories/page.js:210-242`
- Modify: `src/app/my-stories/page.module.css:157-219`
- Test: `src/app/my-stories/MyStoriesPage.test.js`

**Interfaces:**
- Consumes: existing `planCard`, `ticketBorder`, `ticketBody`, and entitlement branches
- Produces: identical decorative image regions for free and premium trailing cards

- [ ] **Step 1: Write failing image behavior assertions**

Replace the existing no-image assertions in both entitlement tests:

```js
const freeImage = planCard.querySelector('img');
expect(freeImage).not.toBeNull();
expect(freeImage.getAttribute('src')).toBe('/upgrade-showcase.webp');
expect(freeImage.getAttribute('alt')).toBe('');

const premiumImage = premiumCard.querySelector('img');
expect(premiumImage).not.toBeNull();
expect(premiumImage.getAttribute('src')).toBe('/upgrade-showcase.webp');
expect(premiumImage.getAttribute('alt')).toBe('');
```

The production mutations caught are omitting the artwork from either entitlement branch, using the wrong asset, or exposing decorative artwork to screen readers.

- [ ] **Step 2: Run the page test and verify RED**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: FAIL because neither Golden Ticket currently renders an image.

- [ ] **Step 3: Add the image to both cards**

Add this as the first child of both the premium `div` and free `button`:

```jsx
<img
  src="/upgrade-showcase.webp"
  alt=""
  className={styles.ticketImage}
/>
```

Keep the existing card tags, click handlers, data attributes, ticket border, copy, and entitlement branches unchanged.

- [ ] **Step 4: Split the fixed-aspect card into image and text regions**

Add:

```css
.ticketImage {
  position: absolute;
  inset: 0 0 auto;
  width: 100%;
  height: 45%;
  object-fit: cover;
}
```

Update the ticket border so it begins inside the lower ticket region:

```css
.ticketBorder {
  position: absolute;
  top: calc(45% + 11px);
  right: 11px;
  bottom: 11px;
  left: 11px;
  border: 1px dashed rgba(255, 229, 179, 0.58);
  border-radius: 12px;
  pointer-events: none;
}
```

Keep `.planCard` at `aspect-ratio: 0.76`. Keep `.ticketBody` bottom-aligned within the lower 55%, retaining the existing explicit typography limits.

- [ ] **Step 5: Run page tests and verify GREEN**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js --runInBand
```

Expected: all page tests PASS.

- [ ] **Step 6: Run focused regressions**

Run:

```bash
npm test -- src/app/my-stories/MyStoriesPage.test.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/PremiumOfflineContract.test.js --runInBand
```

Expected: all selected suites PASS with zero failures.

- [ ] **Step 7: Verify and commit**

Run:

```bash
git diff --check
git status --short
git add src/app/my-stories/page.js src/app/my-stories/page.module.css src/app/my-stories/MyStoriesPage.test.js docs/superpowers/plans/2026-07-26-golden-ticket-image.md
git commit -m "feat: add artwork to golden ticket"
```

Expected: the commit contains only the Golden Ticket page, styles, tests, and this plan.
