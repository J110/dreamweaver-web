# Nap Playlist Randomization and Premium Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a modern nap player with a visible premium-locked fourth item for free users and non-repeating random playlists keyed to each signed-in username.

**Architecture:** The backend owns entitlement, random selection, and persisted per-user/type shuffle-bag history. The frontend renders backend lock state, prevents locked playback, and routes the upgrade action to pricing while retaining the existing autoplay sequence.

**Tech Stack:** FastAPI, Pydantic, Python local-store persistence, Next.js 14, React 18, Jest, pytest.

## Global Constraints

- Nap slots remain lullaby, poem, story, lullaby.
- All four placed items are recorded, including the locked free item.
- Existing autoplay starts track 1 and progresses through the three free tracks without interruption.
- The bedtime playlist is unchanged.
- Selection preserves existing language, subtype, audio-availability, content-safety, and entitlement rules.
- No new dependencies.

---

### Task 1: Backend per-user shuffle bags and lock contract

**Files:**
- Modify: `dreamweaver-backend/scripts/test_nap_playlist_contract.py`
- Modify: `dreamweaver-backend/app/api/v1/playlist.py`

**Interfaces:**
- Consumes: authenticated `current_user["username"]`, `NAP_SLOTS`, `_load_dir`, `_audio_info`, `_cover_info`, and local-store `playlist_history`.
- Produces: `get_nap_playlist()` responses with four items and `is_locked: bool`; persisted records with `username`, `nap_type`, and `item_ids`.

- [ ] **Step 1: Write failing backend contract tests**

```python
def test_free_response_has_locked_fourth_item_without_audio(monkeypatch):
    prepare_route(monkeypatch)
    response = run_nap({"username": "free-a", "subscription_tier": "free"})
    assert len(response.data["items"]) == 4
    assert [item["is_locked"] for item in response.data["items"]] == [False, False, False, True]
    assert response.data["items"][3]["audio_url"] is None

def test_user_shuffle_bags_do_not_repeat_before_type_exhaustion(monkeypatch):
    store = Store()
    first = run_nap_for(store, {"username": "child-a", "subscription_tier": "premium"})
    second = run_nap_for(store, {"username": "child-a", "subscription_tier": "premium"})
    assert ids_by_type(first).get("poem").isdisjoint(ids_by_type(second).get("poem"))
    assert ids_by_type(first).get("story").isdisjoint(ids_by_type(second).get("story"))

def test_shuffle_history_isolated_by_username(monkeypatch):
    store = Store()
    first_a = run_nap_for(store, {"username": "child-a", "subscription_tier": "premium"})
    first_b = run_nap_for(store, {"username": "child-b", "subscription_tier": "premium"})
    assert first_a.data["items"] == first_b.data["items"]
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `dreamweaver-backend/.venv-test/bin/python -m pytest dreamweaver-backend/scripts/test_nap_playlist_contract.py -q`

Expected: failures because free responses contain three items, `is_locked` is absent, and nap selection is cached by day/tier.

- [ ] **Step 3: Implement minimal backend behavior**

Add `is_locked: bool = False` to `PlaylistItem`. Add focused helpers:

```python
def _nap_type(slot_name: str) -> str:
    return "lullaby" if slot_name.startswith("nap_lullaby") else slot_name.removeprefix("nap_")

def _nap_seen_ids(store, username: str, lang: str, nap_type: str) -> set[str]:
    return {
        cid
        for record in store.collections.get("playlist_history", {}).values()
        if record.get("kind") == "nap"
        and record.get("username") == username
        and record.get("lang") == lang
        and record.get("nap_type") == nap_type
        for cid in record.get("item_ids", [])
    }
```

Select randomly from the full eligible pool after removing the user's seen IDs. If empty, reset only that type by ignoring its seen set for this request. Record one persisted `kind="nap"` history record per type, including username and selected IDs. Remove the shared `_nap_cache` read/write path.

Build all four slots for both tiers. For free users, set `is_locked=True` and `audio_url=None` only on index 3 after selection; premium users receive four playable rows.

- [ ] **Step 4: Run backend tests and confirm GREEN**

Run: `dreamweaver-backend/.venv-test/bin/python -m pytest dreamweaver-backend/scripts/test_nap_playlist_contract.py -q`

Expected: all nap contract tests pass.

- [ ] **Step 5: Commit backend task**

```bash
git -C dreamweaver-backend add app/api/v1/playlist.py scripts/test_nap_playlist_contract.py
git -C dreamweaver-backend commit -m "feat: rotate nap playlists per user"
```

### Task 2: Frontend locked track behavior and modern controls

**Files:**
- Create: `dreamweaver-web/.worktrees/emberlight-production/src/app/nap-playlist/playlistState.js`
- Create: `dreamweaver-web/.worktrees/emberlight-production/src/app/nap-playlist/playlistState.test.js`
- Modify: `dreamweaver-web/.worktrees/emberlight-production/src/app/nap-playlist/page.js`

**Interfaces:**
- Consumes: backend playlist items with `is_locked`.
- Produces: `canPlayTrack(items, index): boolean` and `nextPlayableIndex(items, index): number | null`.

- [ ] **Step 1: Write failing frontend state tests**

```javascript
import { canPlayTrack, nextPlayableIndex } from './playlistState';

test('locked fourth track cannot play', () => {
  const items = [{}, {}, {}, { is_locked: true }];
  expect(canPlayTrack(items, 3)).toBe(false);
  expect(nextPlayableIndex(items, 2)).toBeNull();
});

test('premium fourth track remains next and playable', () => {
  const items = [{}, {}, {}, { is_locked: false }];
  expect(canPlayTrack(items, 3)).toBe(true);
  expect(nextPlayableIndex(items, 2)).toBe(3);
});
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/app/nap-playlist/playlistState.test.js --runInBand`

Expected: failure because `playlistState.js` does not exist.

- [ ] **Step 3: Implement state helpers and UI**

```javascript
export const canPlayTrack = (items, index) =>
  Boolean(items[index] && !items[index].is_locked && items[index].audio_url);

export const nextPlayableIndex = (items, index) =>
  canPlayTrack(items, index + 1) ? index + 1 : null;
```

Use these helpers in `playTrack`, ended progression, media-session next, and next-button state. A locked row calls `router.push('/pricing')` and renders a lock icon plus localized `Unlock with Premium` copy instead of `HeartButton`.

Replace transport emoji with inline SVG previous, play, pause, and next icons. Use 48px glass side controls, a 68px blue-gradient primary control, `aria-label`, `disabled`, `:focus-visible`, and pressed states without changing artwork or autoplay initialization.

- [ ] **Step 4: Run frontend tests and confirm GREEN**

Run: `npm test -- src/app/nap-playlist/playlistState.test.js --runInBand`

Expected: all playlist-state tests pass.

- [ ] **Step 5: Build production frontend**

Run: `npm run build`

Expected: Next.js compilation, type checking, and static generation succeed.

- [ ] **Step 6: Commit frontend task**

```bash
git add src/app/nap-playlist/page.js src/app/nap-playlist/playlistState.js src/app/nap-playlist/playlistState.test.js
git commit -m "feat: modernize locked nap playlist player"
```

### Task 3: Deploy and verify

**Files:**
- Modify: production backend service files through the established deploy workflow.
- Modify: production web standalone build through the established deploy workflow.

**Interfaces:**
- Consumes: committed backend and frontend revisions.
- Produces: healthy production API and web application.

- [ ] **Step 1: Run final focused verification**

```bash
dreamweaver-backend/.venv-test/bin/python -m pytest dreamweaver-backend/scripts/test_nap_playlist_contract.py -q
npm --prefix dreamweaver-web/.worktrees/emberlight-production test -- src/app/nap-playlist/playlistState.test.js --runInBand
npm --prefix dreamweaver-web/.worktrees/emberlight-production run build
```

- [ ] **Step 2: Push committed revisions**

Push the backend deployment branch and `deploy/emberlight-production` without including unrelated dirty files.

- [ ] **Step 3: Snapshot, deploy, and restart**

Run the production deployment guard snapshot, deploy the two backend files and three frontend files, rebuild the web standalone output without duplicating nginx-served audio/covers, then restart backend and `dreamweaver-web`.

- [ ] **Step 4: Verify production**

Confirm HTTPS 200, healthy process status, four free API rows with only index 3 locked and without audio, four playable premium rows, different selections on two consecutive requests for the same username, and no per-type repeats before exhaustion.
