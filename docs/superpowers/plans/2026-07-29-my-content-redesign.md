# My Content Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three-shelf My Content hub, relocate Dream Valley Radio to Profile, and enforce monthly Free 3 / Premium 30 credit allocations.

**Architecture:** A pure backend credit-period module owns allocation, reset boundaries, persistence, and display totals; subscription and Stripe handlers consume it instead of embedding tier numbers. The web page composes focused shelf, creation-card, locked-card, and dialog components while loading Favorites and credits independently.

**Tech Stack:** Next.js 14, React 18, CSS Modules, existing Jest conventions, FastAPI, Firestore, Python `datetime`, pytest.

## Global Constraints

- Free accounts receive 3 monthly credits.
- Premium accounts receive 30 monthly credits.
- Monthly credits never roll over.
- Purchased top-up credits survive all monthly resets.
- Free periods use UTC calendar-month boundaries.
- Premium periods continue using Stripe billing-period boundaries.
- Signed-out visitors may see the Free allowance but cannot receive or spend account credits.
- Content, Character, and Voice creation remain unavailable and open one accessible Coming Soon dialog.
- Existing favorite save limits and radio playback destinations do not change.
- Do not modify lockfiles, generated output, or unrelated user changes.

---

### Task 1: Central Monthly Credit Domain

**Files:**
- Create: `dreamweaver-backend/app/utils/credits.py`
- Create: `dreamweaver-backend/scripts/test_monthly_credits.py`

**Interfaces:**
- Produces: `FREE_MONTHLY_CREDITS: int`
- Produces: `PREMIUM_MONTHLY_CREDITS: int`
- Produces: `CreditRefreshError`
- Produces: `calendar_month_period(now: datetime) -> tuple[datetime, datetime]`
- Produces: `refresh_credit_period(db_client, uid: str, user_data: dict, now: datetime | None = None) -> dict`
- Produces: `available_credit_total(user_data: dict) -> int`
- Produces: `premium_period_credit_fields(period_start: str | None, period_end: str | None) -> dict`

- [ ] **Step 1: Write the failing domain tests**

```python
from datetime import datetime, timezone

import pytest

from app.utils.credits import (
    CreditRefreshError,
    available_credit_total,
    refresh_credit_period,
)


class FakeDocument:
    def __init__(self, store, uid, fail=False):
        self.store = store
        self.uid = uid
        self.fail = fail

    def update(self, fields):
        if self.fail:
            raise RuntimeError("write failed")
        self.store[self.uid].update(fields)


class FakeCollection:
    def __init__(self, store, fail=False):
        self.store = store
        self.fail = fail

    def document(self, uid):
        return FakeDocument(self.store, uid, self.fail)


class FakeDb:
    def __init__(self, store, fail=False):
        self.store = store
        self.fail = fail

    def collection(self, name):
        assert name == "users"
        return FakeCollection(self.store, self.fail)


NOW = datetime(2026, 7, 29, 10, 0, tzinfo=timezone.utc)


def test_free_user_migrates_to_three_credit_calendar_period():
    users = {"u1": {"subscription_tier": "free", "lifetime_free_remaining": 1}}
    refreshed = refresh_credit_period(FakeDb(users), "u1", users["u1"], NOW)
    assert refreshed["credits_remaining"] == 3
    assert refreshed["lifetime_free_remaining"] == 0
    assert refreshed["credits_period_start"] == "2026-07-01T00:00:00+00:00"
    assert refreshed["credits_period_end"] == "2026-08-01T00:00:00+00:00"


def test_free_user_does_not_refresh_inside_current_period():
    users = {"u1": {
        "subscription_tier": "free",
        "credits_remaining": 1,
        "credits_period_start": "2026-07-01T00:00:00+00:00",
        "credits_period_end": "2026-08-01T00:00:00+00:00",
    }}
    refreshed = refresh_credit_period(FakeDb(users), "u1", users["u1"], NOW)
    assert refreshed["credits_remaining"] == 1


def test_free_user_resets_without_rollover_and_preserves_topups():
    users = {"u1": {
        "subscription_tier": "free",
        "credits_remaining": 2,
        "topup_credits_remaining": 7,
        "credits_period_end": "2026-07-01T00:00:00+00:00",
    }}
    refreshed = refresh_credit_period(FakeDb(users), "u1", users["u1"], NOW)
    assert refreshed["credits_remaining"] == 3
    assert refreshed["topup_credits_remaining"] == 7
    assert available_credit_total(refreshed) == 10


def test_premium_period_is_owned_by_stripe():
    users = {"u1": {
        "subscription_tier": "premium",
        "credits_remaining": 4,
        "credits_period_end": "2026-07-01T00:00:00+00:00",
    }}
    refreshed = refresh_credit_period(FakeDb(users), "u1", users["u1"], NOW)
    assert refreshed["credits_remaining"] == 4


def test_premium_renewal_fields_reset_monthly_pool_without_touching_topups():
    from app.utils.credits import premium_period_credit_fields
    fields = premium_period_credit_fields(
        "2026-07-10T00:00:00+00:00",
        "2026-08-10T00:00:00+00:00",
    )
    assert fields == {
        "credits_remaining": 30,
        "credits_period_start": "2026-07-10T00:00:00+00:00",
        "credits_period_end": "2026-08-10T00:00:00+00:00",
        "credits_frozen": False,
    }
    assert "topup_credits_remaining" not in fields


def test_frozen_credits_are_not_spendable():
    assert available_credit_total({
        "credits_remaining": 8,
        "topup_credits_remaining": 2,
        "credits_frozen": True,
    }) == 0


def test_refresh_write_failure_does_not_return_invented_balance():
    users = {"u1": {"subscription_tier": "free"}}
    with pytest.raises(CreditRefreshError):
        refresh_credit_period(FakeDb(users, fail=True), "u1", users["u1"], NOW)
```

- [ ] **Step 2: Run the domain tests and verify the missing module failure**

Run: `.venv-test/bin/python -m pytest scripts/test_monthly_credits.py -v`

Expected: FAIL during collection because `app.utils.credits` does not exist.

- [ ] **Step 3: Implement the credit-period module**

```python
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from typing import Optional

FREE_MONTHLY_CREDITS = 3
PREMIUM_MONTHLY_CREDITS = 30


class CreditRefreshError(RuntimeError):
    pass


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return _utc(datetime.fromisoformat(value.replace("Z", "+00:00")))


def calendar_month_period(now: datetime) -> tuple[datetime, datetime]:
    current = _utc(now)
    start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    days = monthrange(start.year, start.month)[1]
    end = start.replace(day=days) + timedelta(days=1)
    return start, end


def available_credit_total(user_data: dict) -> int:
    if user_data.get("credits_frozen"):
        return 0
    monthly = max(0, int(user_data.get("credits_remaining") or 0))
    topups = max(0, int(user_data.get("topup_credits_remaining") or 0))
    return monthly + topups


def premium_period_credit_fields(
    period_start: str | None,
    period_end: str | None,
) -> dict:
    fields = {
        "credits_remaining": PREMIUM_MONTHLY_CREDITS,
        "credits_frozen": False,
    }
    if period_start:
        fields["credits_period_start"] = period_start
    if period_end:
        fields["credits_period_end"] = period_end
    return fields


def refresh_credit_period(
    db_client,
    uid: str,
    user_data: dict,
    now: datetime | None = None,
) -> dict:
    refreshed = dict(user_data)
    tier = str(refreshed.get("subscription_tier") or "free").lower()
    if tier == "premium":
        return refreshed

    current = _utc(now or datetime.now(timezone.utc))
    start, end = calendar_month_period(current)
    period_end = _parse_iso(refreshed.get("credits_period_end"))
    legacy_free = "lifetime_free_remaining" in refreshed and not refreshed.get("credits_period_start")
    if period_end and current < period_end and not legacy_free:
        return refreshed

    fields = {
        "credits_remaining": FREE_MONTHLY_CREDITS,
        "credits_period_start": start.isoformat(),
        "credits_period_end": end.isoformat(),
        "lifetime_free_remaining": 0,
        "credits_frozen": False,
    }
    try:
        db_client.collection("users").document(uid).update(fields)
    except Exception as exc:
        raise CreditRefreshError(f"credit refresh failed for uid={uid}") from exc
    refreshed.update(fields)
    return refreshed
```

- [ ] **Step 4: Run the domain tests**

Run: `.venv-test/bin/python -m pytest scripts/test_monthly_credits.py -v`

Expected: all seven tests PASS.

- [ ] **Step 5: Commit the backend domain**

```bash
git add app/utils/credits.py scripts/test_monthly_credits.py
git commit -m "feat: add monthly credit periods"
```

---

### Task 2: Subscription and Billing Integration

**Files:**
- Modify: `dreamweaver-backend/app/dependencies.py:252-296`
- Modify: `dreamweaver-backend/app/api/v1/subscriptions.py:14-60`
- Modify: `dreamweaver-backend/app/api/v1/subscriptions.py:99-166`
- Modify: `dreamweaver-backend/app/api/v1/billing.py:145-168`
- Modify: `dreamweaver-backend/app/api/v1/billing.py:320-340`
- Create: `dreamweaver-backend/scripts/test_subscription_credit_contract.py`

**Interfaces:**
- Consumes: `FREE_MONTHLY_CREDITS`, `PREMIUM_MONTHLY_CREDITS`, `refresh_credit_period`, `available_credit_total`, and `premium_period_credit_fields` from `app.utils.credits`
- Produces: subscription payload fields `credits_remaining`, `topup_credits_remaining`, `credits_period_end`, `credits_frozen`, and `credits_total`

- [ ] **Step 1: Write the failing subscription contract tests**

```python
from app.api.v1.subscriptions import SUBSCRIPTION_TIERS
from app.utils.credits import FREE_MONTHLY_CREDITS, PREMIUM_MONTHLY_CREDITS


def tier(tier_id):
    return next(item for item in SUBSCRIPTION_TIERS if item["id"] == tier_id)


def test_tier_metadata_matches_monthly_allocations():
    assert tier("free")["credits_per_period"] == FREE_MONTHLY_CREDITS == 3
    assert tier("free")["lifetime_free_credits"] is None
    assert tier("premium")["credits_per_period"] == PREMIUM_MONTHLY_CREDITS == 30


def test_credit_total_contract_counts_monthly_and_topups():
    from app.utils.credits import available_credit_total
    assert available_credit_total({
        "credits_remaining": 3,
        "topup_credits_remaining": 10,
    }) == 13
```

- [ ] **Step 2: Run the contract tests and verify the metadata failure**

Run: `.venv-test/bin/python -m pytest scripts/test_subscription_credit_contract.py -v`

Expected: FAIL because Free still reports no monthly pool and lifetime credits.

- [ ] **Step 3: Replace legacy credit defaults**

In `app/dependencies.py`, import the tier constant and make new user records start without an invented period:

```python
from app.utils.credits import FREE_MONTHLY_CREDITS

CREDIT_FIELD_DEFAULTS = {
    "lifetime_free_remaining": 0,
    "credits_remaining": FREE_MONTHLY_CREDITS,
    "topup_credits_remaining": 0,
    "credits_period_start": None,
    "credits_period_end": None,
    "credits_frozen": False,
}
```

Keep `_ensure_credit_fields` responsible only for schema backfill. The authenticated `/subscriptions/current` read performs the period refresh and persists its exact boundaries.

- [ ] **Step 4: Integrate refresh and total into `/subscriptions/current`**

Add imports:

```python
from app.utils.credits import (
    FREE_MONTHLY_CREDITS,
    PREMIUM_MONTHLY_CREDITS,
    available_credit_total,
    refresh_credit_period,
)
```

Update Free tier metadata:

```python
"description": "3 personalized story credits every month",
"credits_per_period": FREE_MONTHLY_CREDITS,
"lifetime_free_credits": None,
"features": [
    "Tonight's bedtime bundle (silly song, story, poem, lullaby)",
    "Last 3 days of stories saved",
    "3 personalized story credits every month",
    "Default narration voices",
],
```

Update Premium metadata to use `PREMIUM_MONTHLY_CREDITS`, then refresh the fetched user dictionary before building the response:

```python
user_data = refresh_credit_period(
    db_client,
    user_id,
    user_doc.to_dict(),
)
```

Add the display total:

```python
"credits_total": available_credit_total(user_data),
```

Remove `lifetime_free_remaining` from the public response after the migration because it is no longer an entitlement.

- [ ] **Step 5: Replace Stripe magic numbers**

Import `premium_period_credit_fields` in `app/api/v1/billing.py`. For `subscription.created`, merge exact Stripe boundaries into the user update:

```python
fields = {
    "stripe_subscription_id": sub.get("id"),
    "subscription_status": sub.get("status") or "active",
    "subscription_tier": "premium",
    "current_period_end": period_end_iso,
    **premium_period_credit_fields(period_start_iso, period_end_iso),
}
```

For successful renewal invoices, build the normal subscription fields and then merge `premium_period_credit_fields(period_start_iso, iso_end)`. The helper intentionally omits `topup_credits_remaining`.

- [ ] **Step 6: Run focused backend tests**

Run: `.venv-test/bin/python -m pytest scripts/test_monthly_credits.py scripts/test_subscription_credit_contract.py -v`

Expected: all focused tests PASS.

- [ ] **Step 7: Commit the backend integration**

```bash
git add app/dependencies.py app/api/v1/subscriptions.py app/api/v1/billing.py scripts/test_subscription_credit_contract.py
git commit -m "feat: grant monthly credits by tier"
```

---

### Task 3: My Content Presentational Components

**Files:**
- Create: `dreamweaver-web/src/components/my-content/ContentShelf.js`
- Create: `dreamweaver-web/src/components/my-content/ContentShelf.module.css`
- Create: `dreamweaver-web/src/components/my-content/CreationCard.js`
- Create: `dreamweaver-web/src/components/my-content/LockedPreviewCard.js`
- Create: `dreamweaver-web/src/components/my-content/PreviewCard.module.css`
- Create: `dreamweaver-web/src/components/my-content/ComingSoonDialog.js`
- Create: `dreamweaver-web/src/components/my-content/ComingSoonDialog.module.css`
- Create: `dreamweaver-web/src/components/my-content/MyContentComponents.test.js`

**Interfaces:**
- Produces: `ContentShelf({ title, children, emptyMessage, exploreLabel, onExplore })`
- Produces: `CreationCard({ icon, label, onActivate })`
- Produces: `LockedPreviewCard({ imageSrc, label, onActivate })`
- Produces: `ComingSoonDialog({ kind, copy, onClose, triggerRef })`

- [ ] **Step 1: Write failing component tests**

```javascript
/** @jest-environment jsdom */

import React, { createRef } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import CreationCard from './CreationCard';
import LockedPreviewCard from './LockedPreviewCard';
import ComingSoonDialog from './ComingSoonDialog';

let host;
let root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

test('creation card activates from click', () => {
  const onActivate = jest.fn();
  act(() => root.render(
    <CreationCard icon="＋" label="Create Character" onActivate={onActivate} />
  ));
  host.querySelector('button').click();
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('locked preview is announced as locked and activates', () => {
  const onActivate = jest.fn();
  act(() => root.render(
    <LockedPreviewCard imageSrc="/upgrade-showcase.webp" label="Moon Explorer" onActivate={onActivate} />
  ));
  const button = host.querySelector('button');
  expect(button.getAttribute('aria-label')).toContain('Locked');
  button.click();
  expect(onActivate).toHaveBeenCalledTimes(1);
});

test('dialog closes on Escape and restores trigger focus', () => {
  const triggerRef = createRef();
  const onClose = jest.fn();
  act(() => root.render(
    <>
      <button ref={triggerRef}>Open</button>
      <ComingSoonDialog
        kind="character"
        copy={{ title: 'Characters are coming soon', body: 'We are preparing this feature.', close: 'Got it' }}
        onClose={onClose}
        triggerRef={triggerRef}
      />
    </>
  ));
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the component tests and verify missing-module failures**

Run: `npx jest src/components/my-content/MyContentComponents.test.js --runInBand`

Expected: FAIL because the three component modules do not exist.

- [ ] **Step 3: Implement `ContentShelf`**

```javascript
import styles from './ContentShelf.module.css';

export default function ContentShelf({
  title,
  children,
  emptyMessage,
  exploreLabel,
  onExplore,
}) {
  return (
    <section className={styles.shelf} aria-labelledby={`shelf-${title.toLowerCase()}`}>
      <h2 id={`shelf-${title.toLowerCase()}`} className={styles.title}>{title}</h2>
      <div className={styles.track}>{children}</div>
      {emptyMessage && (
        <div className={styles.empty}>
          <span>{emptyMessage}</span>
          {onExplore && <button onClick={onExplore}>{exploreLabel}</button>}
        </div>
      )}
    </section>
  );
}
```

Style `.track` with `display: flex`, `overflow-x: auto`, `scroll-snap-type: x proximity`, hidden decorative scrollbar where supported, and bottom padding. Give each card a fixed mobile width of about `148px` so the next card peeks into view.

- [ ] **Step 4: Implement creation and locked cards**

Use real `<button type="button">` elements with a shared fixed card footprint. `CreationCard` renders its icon and label; `LockedPreviewCard` renders a Next `Image` with a dark overlay, lock badge, and `aria-label={`Locked: ${label}`}`. Both invoke `onActivate` without navigation.

```javascript
export default function CreationCard({ icon, label, onActivate }) {
  return (
    <button type="button" className={styles.creationCard} onClick={onActivate}>
      <span className={styles.creationIcon} aria-hidden>{icon}</span>
      <span>{label}</span>
      <small>Coming soon</small>
    </button>
  );
}
```

- [ ] **Step 5: Implement the accessible dialog**

Use a portal-free overlay within the page tree. On mount, save the active element, focus the close button, listen for Escape, and constrain Tab/Shift+Tab between the dialog's focusable controls. On unmount or close, restore `triggerRef.current` when present.

```javascript
export default function ComingSoonDialog({ kind, copy, onClose, triggerRef }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef?.current?.focus();
    };
  }, [onClose, triggerRef]);

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`coming-soon-${kind}`} className={styles.dialog}>
        <h2 id={`coming-soon-${kind}`}>{copy.title}</h2>
        <p>{copy.body}</p>
        <button ref={closeRef} type="button" onClick={onClose}>{copy.close}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run the component tests**

Run: `npx jest src/components/my-content/MyContentComponents.test.js --runInBand`

Expected: all component tests PASS without accessibility warnings.

- [ ] **Step 7: Commit the presentational components**

```bash
git add src/components/my-content
git commit -m "feat: add My Content shelf components"
```

---

### Task 4: Rebuild the My Content Page

**Files:**
- Modify: `dreamweaver-web/src/app/my-stories/page.js`
- Modify: `dreamweaver-web/src/app/my-stories/page.module.css`
- Modify: `dreamweaver-web/src/utils/i18n.js:49-68`
- Modify: `dreamweaver-web/src/utils/i18n.js:171-190`
- Create: `dreamweaver-web/src/app/my-stories/page.test.js`

**Interfaces:**
- Consumes: `subscriptionApi.getCurrent() -> { credits_total, credits_remaining, topup_credits_remaining }`
- Consumes: Task 3 component props exactly as documented
- Produces: three shelves in order: Favorites, Characters, Voices

- [ ] **Step 1: Write the failing page contract tests**

Mock `interactionApi.getUserSaves`, `subscriptionApi.getCurrent`, `ContentCard`, navigation, auth, i18n, and `StarField`. Render the page into jsdom and assert:

```javascript
/** @jest-environment jsdom */

test('renders credits and the three shelves without Preferences or Radio', async () => {
  interactionApi.getUserSaves.mockResolvedValue({ items: [{ id: 'f1', title: 'Favorite' }] });
  subscriptionApi.getCurrent.mockResolvedValue({ credits_total: 13 });
  await renderPage();
  expect(document.body.textContent).toContain('Credits: 13');
  expect(headings()).toEqual(['Favorites', 'Characters', 'Voices']);
  expect(document.body.textContent).not.toContain('Preferences');
  expect(document.body.textContent).not.toContain('Dream Valley Radio');
});

test('credit failure does not hide shelves', async () => {
  interactionApi.getUserSaves.mockResolvedValue({ items: [] });
  subscriptionApi.getCurrent.mockRejectedValue(new Error('offline'));
  await renderPage();
  expect(document.body.textContent).toContain('Credits: —');
  expect(headings()).toEqual(['Favorites', 'Characters', 'Voices']);
});

test('signed-out visitors see the free allowance', async () => {
  isLoggedIn.mockReturnValue(false);
  await renderPage();
  expect(document.body.textContent).toContain('Credits: 3');
  expect(subscriptionApi.getCurrent).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the page tests and verify the old-layout failure**

Run: `npx jest src/app/my-stories/page.test.js --runInBand`

Expected: FAIL because the existing page renders tabs, Preferences, Radio, and no credit header.

- [ ] **Step 3: Replace state and data loading**

Remove `THEMES_DATA`, preference state, active tab state, filter state, local-storage preference effects, `toggleTheme`, and `RadioLiveCard`. Add:

```javascript
import { useRef } from 'react';
import { interactionApi, subscriptionApi } from '@/utils/api';
import ContentShelf from '@/components/my-content/ContentShelf';
import CreationCard from '@/components/my-content/CreationCard';
import LockedPreviewCard from '@/components/my-content/LockedPreviewCard';
import ComingSoonDialog from '@/components/my-content/ComingSoonDialog';

const LOCKED_PREVIEWS = {
  characters: [
    { id: 'character-1', label: 'Moon Explorer', image: '/upgrade-showcase.webp' },
    { id: 'character-2', label: 'Dream Guardian', image: '/blog/covers/default.webp' },
  ],
  voices: [
    { id: 'voice-1', label: 'Gentle Storyteller', image: '/og-image.png' },
    { id: 'voice-2', label: 'Moonlight Voice', image: '/upgrade-showcase.webp' },
  ],
};
```

Maintain `creditTotal` with three states: `3` for signed-out visitors, numeric API value for authenticated users, and `null` for an authenticated loading/error placeholder. Fetch Favorites and subscription data independently with `Promise` chains so one failure cannot suppress the other.

- [ ] **Step 4: Compose the three shelves**

Render a header row with `t('myContentTitle')` and `t('myCredits')`. Create one `openComingSoon(kind, event)` callback that records the triggering button in a ref and sets the active dialog kind.

Favorites renders:

```javascript
<ContentShelf
  title={t('myFavorites')}
  emptyMessage={!loading && favorites.length === 0 ? t('myEmptyFavoritesText') : ''}
  exploreLabel={t('myExplore')}
  onExplore={() => router.push('/before-bed')}
>
  <CreationCard icon="＋" label={t('myCreateContent')} onActivate={(event) => openComingSoon('content', event)} />
  {favorites.map((item) => <ContentCard key={item.id} content={item} />)}
</ContentShelf>
```

Characters and Voices use their action cards followed by `LOCKED_PREVIEWS` mapped through `LockedPreviewCard`. Pass translated, context-specific copy to `ComingSoonDialog`.

- [ ] **Step 5: Replace the page CSS**

Delete tab, filter, preference, theme-chip, and fixed grid rules. Keep the 480px mobile content width, add 100px bottom padding, use a flex header row for title and credit pill, and space shelves by 28-32px. Ensure the credit pill does not wrap and uses `font-variant-numeric: tabular-nums`.

- [ ] **Step 6: Replace obsolete translations**

Add matching English and conversational Hindi keys:

```javascript
myContentTitle: 'My Content',
myContentSubtitle: 'Your saved stories and creative tools',
myCredits: 'Credits',
myCharacters: 'Characters',
myVoices: 'Voices',
myCreateContent: 'Create Content',
myCreateCharacter: 'Create Character',
myRecordVoice: 'Record Voice',
myComingSoon: 'Coming soon',
myComingSoonClose: 'Got it',
myContentComingTitle: 'Content creation is coming soon',
myCharacterComingTitle: 'Character creation is coming soon',
myVoiceComingTitle: 'Voice recording is coming later',
myComingBody: 'We are preparing this feature for a future release.',
```

Remove only My Content preference keys that have no remaining callers. Preserve unrelated settings and narrator-preference translations.

- [ ] **Step 7: Run the page and component tests**

Run: `npx jest src/app/my-stories/page.test.js src/components/my-content/MyContentComponents.test.js --runInBand`

Expected: all focused web tests PASS.

- [ ] **Step 8: Commit the My Content page**

```bash
git add src/app/my-stories/page.js src/app/my-stories/page.module.css src/app/my-stories/page.test.js src/utils/i18n.js
git commit -m "feat: redesign My Content as shelves"
```

---

### Task 5: Move Dream Valley Radio to Profile

**Files:**
- Modify: `dreamweaver-web/src/app/profile/page.js:5-11`
- Modify: `dreamweaver-web/src/app/profile/page.js:92-114`
- Modify: `dreamweaver-web/src/app/profile/page.module.css:24-48`
- Create: `dreamweaver-web/src/app/profile/page.test.js`

**Interfaces:**
- Consumes: existing `RadioLiveCard`
- Produces: one Profile radio banner beneath the avatar identity block

- [ ] **Step 1: Write the failing Profile placement test**

Mock Profile dependencies, render the page in jsdom, and expose `RadioLiveCard` as a simple marker:

```javascript
jest.mock('@/components/RadioLiveCard', () => function RadioMarker() {
  return <div data-testid="radio-card">Dream Valley Radio</div>;
});

test('places Dream Valley Radio between identity and settings', async () => {
  renderProfile();
  const radio = document.querySelector('[data-testid="radio-card"]');
  expect(radio).not.toBeNull();
  expect(radio.previousElementSibling.className).toContain('avatarSection');
  expect(radio.nextElementSibling.className).toContain('settings');
});
```

- [ ] **Step 2: Run the Profile test and verify the missing-card failure**

Run: `npx jest src/app/profile/page.test.js --runInBand`

Expected: FAIL because Profile does not import or render `RadioLiveCard`.

- [ ] **Step 3: Render the radio card after identity**

```javascript
import RadioLiveCard from '@/components/RadioLiveCard';

<div className={styles.radioBanner}>
  <RadioLiveCard />
</div>
```

Add a `.radioBanner` wrapper that neutralizes the card's My Content-era side margins without changing the shared component for landing-page consumers:

```css
.radioBanner {
  margin: 0 -12px 20px;
}
```

- [ ] **Step 4: Run the Profile and My Content placement tests**

Run: `npx jest src/app/profile/page.test.js src/app/my-stories/page.test.js --runInBand`

Expected: both tests PASS; Radio appears on Profile and not on My Content.

- [ ] **Step 5: Commit the radio relocation**

```bash
git add src/app/profile/page.js src/app/profile/page.module.css src/app/profile/page.test.js
git commit -m "feat: move radio banner to Profile"
```

---

### Task 6: Cross-Repository Verification

**Files:**
- Verify only; no production files should change.

**Interfaces:**
- Consumes: backend subscription contract and frontend credit display
- Produces: evidence that the coordinated feature is ready

- [ ] **Step 1: Run all focused backend tests**

Run: `.venv-test/bin/python -m pytest scripts/test_monthly_credits.py scripts/test_subscription_credit_contract.py -v`

Expected: all focused backend tests PASS.

- [ ] **Step 2: Run all focused web tests**

Run: `npx jest src/components/my-content/MyContentComponents.test.js src/app/my-stories/page.test.js src/app/profile/page.test.js --runInBand`

Expected: all focused web tests PASS.

- [ ] **Step 3: Build the web app**

Run: `npm run build`

Expected: Next.js completes successfully with no missing translation, import, or CSS-module errors.

- [ ] **Step 4: Perform mobile visual verification**

Open `/my-stories` at a 390×844 viewport and verify:

- Credit pill fits beside the title.
- Shelves appear in Favorites, Characters, Voices order.
- The next card peeks into view and each shelf scrolls horizontally.
- Locked previews are visibly unavailable.
- Each action and locked card opens and closes the correct dialog.
- Favorites remain playable and the empty route opens `/before-bed`.

- [ ] **Step 5: Perform Profile visual verification**

Open `/profile` at a 390×844 viewport and verify the radio banner appears beneath identity, above settings, with no horizontal clipping.

- [ ] **Step 6: Inspect repository scope**

Run in each repository:

```bash
git status --short
git diff --check
```

Expected: only the planned files and pre-existing user changes are present; no whitespace errors are reported.
