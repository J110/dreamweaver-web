# Premium Saved Slots and Offline Playback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce 5 free and 30 premium saved-content slots, prompt free users to upgrade on save 6, and automatically make premium saves playable offline in browsers and the native WebView.

**Architecture:** The backend is authoritative for save limits and effective premium status. The shared Next.js client stores user-scoped metadata, cover blobs, and the current/default audio blob in IndexedDB and uses the same code in browsers and the persistent Flutter WebView. Flutter only aligns duplicated constants and preserves the existing resume signal.

**Tech Stack:** FastAPI, Pydantic, Firestore, Next.js 14, React 18, Jest 30 with jsdom, IndexedDB, Flutter/Dart, `webview_flutter`.

## Global Constraints

- Free users have exactly 5 saved-content slots and no offline packages.
- Premium users have exactly 30 saved-content slots.
- A free user's sixth save opens an upgrade modal linking to `/upgrade?intent=<current-path-and-query>`.
- Reaching a save cap creates neither a save nor a fallback like.
- A confirmed premium save automatically stores metadata, cover, and the current/default voice audio.
- Unsave, logout, or confirmed downgrade removes the user's affected offline packages.
- A last-confirmed premium entitlement remains valid while offline; a later confirmed downgrade purges packages.
- Browser and native WebView use one IndexedDB package format; no Flutter file-URI bridge is added.
- Backend and web production changes require Deploy Guard snapshot before mutation and Deploy Guard verify afterward.

---

### Task 1: Backend Save Entitlement Contract

**Repository:** `dreamweaver-backend`

**Files:**
- Modify: `app/utils/gating.py`
- Modify: `app/api/v1/interactions.py`
- Modify: `app/models/subscription.py`
- Modify: `app/api/v1/subscriptions.py`
- Create: `scripts/test_save_offline_entitlements.py`

**Interfaces:**
- Produces: `FREE_SAVE_CAP = 5`, `PREMIUM_SAVE_CAP = 30`
- Produces: `offline_allowed(user: Optional[dict]) -> bool`
- Produces: save response fields `saved`, `liked`, `cap_reached`, `saved_count`, `save_cap`, `offline_allowed`
- Consumes: existing `is_premium(user)` effective-entitlement policy

- [ ] **Step 1: Create an isolated backend worktree**

```bash
git -C dreamweaver-backend worktree add /private/tmp/dreamweaver-backend-premium-offline -b feature/premium-offline-saves origin/main
```

- [ ] **Step 2: Write failing entitlement and cap-response tests**

```python
def test_authoritative_save_caps():
    assert gating.FREE_SAVE_CAP == 5
    assert gating.PREMIUM_SAVE_CAP == 30

def test_offline_requires_effective_premium(monkeypatch):
    monkeypatch.setattr(gating, "is_premium", lambda user: user["tier"] == "premium")
    assert gating.offline_allowed({"tier": "premium"}) is True
    assert gating.offline_allowed({"tier": "free"}) is False

def test_free_sixth_save_creates_no_save_or_like(fake_db, free_user):
    seed_content(fake_db, "story-1")
    seed_saves(fake_db, free_user["uid"], count=5)
    response = run_save("story-1", free_user, fake_db)
    assert response.data == {
        "content_id": "story-1",
        "saved": False,
        "liked": False,
        "cap_reached": True,
        "saved_count": 5,
        "save_cap": 5,
        "offline_allowed": False,
    }
    assert interaction_types(fake_db, free_user["uid"], "story-1") == []

def test_premium_save_30_succeeds_and_31_is_rejected(fake_db, premium_user):
    seed_saves(fake_db, premium_user["uid"], count=29)
    assert run_save("story-30", premium_user, fake_db).data["saved"] is True
    rejected = run_save("story-31", premium_user, fake_db).data
    assert rejected["cap_reached"] is True
    assert rejected["save_cap"] == 30
    assert rejected["offline_allowed"] is True

def test_resave_at_cap_is_idempotent(fake_db, premium_user):
    seed_saves(fake_db, premium_user["uid"], count=30, include="story-1")
    result = run_save("story-1", premium_user, fake_db).data
    assert result["saved"] is True
    assert result["saved_count"] == 30
```

- [ ] **Step 3: Run the focused tests and verify RED**

```bash
python3 -m pytest -q scripts/test_save_offline_entitlements.py
```

Expected: failures for premium cap `20`, missing `offline_allowed`, and the existing cap fallback creating a like.

- [ ] **Step 4: Implement the authoritative contract**

```python
FREE_SAVE_CAP = 5
PREMIUM_SAVE_CAP = 30

def offline_allowed(user: Optional[dict]) -> bool:
    return is_premium(user)
```

In `save_content`, return the structured cap result without creating a like:

```python
if not already_saved and current_count >= cap:
    return InteractionResponse(
        success=True,
        data={
            "content_id": content_id,
            "saved": False,
            "liked": False,
            "cap_reached": True,
            "saved_count": current_count,
            "save_cap": cap,
            "offline_allowed": offline_allowed(current_user),
        },
        message="Save cap reached",
    )
```

Add `offline_allowed` to successful saves and `/me/saves`, and align subscription-plan metadata to free `5` and premium `30`.

- [ ] **Step 5: Run GREEN and syntax verification**

```bash
python3 -m pytest -q scripts/test_save_offline_entitlements.py
python3 -m py_compile app/utils/gating.py app/api/v1/interactions.py app/models/subscription.py app/api/v1/subscriptions.py scripts/test_save_offline_entitlements.py
git diff --check
```

- [ ] **Step 6: Commit the backend contract**

```bash
git add app/utils/gating.py app/api/v1/interactions.py app/models/subscription.py app/api/v1/subscriptions.py scripts/test_save_offline_entitlements.py
git commit -m "feat: enforce premium saved library limits"
```

---

### Task 2: User-Scoped IndexedDB Store

**Repository:** `dreamweaver-web`

**Files:**
- Create: `src/utils/offlineStore.js`
- Create: `src/utils/offlineStore.test.js`

**Interfaces:**
- Produces: `openOfflineStore(indexedDBImpl = indexedDB)`
- Produces: `putPackage(record)`, `getPackage(userId, contentId)`, `listReadyPackages(userId)`, `deletePackage(userId, contentId)`, `purgeUser(userId)`
- Produces: `setEntitlementLease(userId, effectivePremium, confirmedAt)`, `getEntitlementLease(userId)`
- Record key: ``${userId}:${contentId}``

- [ ] **Step 1: Write failing storage contract tests with an injected memory adapter**

```javascript
test('isolates packages by user and returns only ready records', async () => {
  const store = createOfflineStore(createMemoryDb())
  await store.putPackage({ key: 'u1:s1', userId: 'u1', contentId: 's1', state: 'ready' })
  await store.putPackage({ key: 'u2:s1', userId: 'u2', contentId: 's1', state: 'ready' })
  await store.putPackage({ key: 'u1:s2', userId: 'u1', contentId: 's2', state: 'failed' })
  expect((await store.listReadyPackages('u1')).map((x) => x.contentId)).toEqual(['s1'])
})

test('purges packages and entitlement lease for one user only', async () => {
  const store = createOfflineStore(createMemoryDb())
  await store.setEntitlementLease('u1', true, 100)
  await store.setEntitlementLease('u2', true, 100)
  await store.purgeUser('u1')
  expect(await store.getEntitlementLease('u1')).toBeNull()
  expect(await store.getEntitlementLease('u2')).toMatchObject({ effectivePremium: true })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

```bash
npm test -- src/utils/offlineStore.test.js --runInBand
```

Expected: module-not-found failure for `offlineStore`.

- [ ] **Step 3: Implement the IndexedDB adapter**

Use database `dv-offline-library`, version `1`, with `packages` and `entitlements` object stores. Keep all browser globals behind the exported factory so Jest can inject the memory adapter.

```javascript
export const packageKey = (userId, contentId) => `${userId}:${contentId}`

export function createOfflineStore(dbAdapter) {
  return {
    putPackage: (record) => dbAdapter.put('packages', record),
    getPackage: (userId, contentId) => dbAdapter.get('packages', packageKey(userId, contentId)),
    listReadyPackages: async (userId) =>
      (await dbAdapter.getAll('packages')).filter((x) => x.userId === userId && x.state === 'ready'),
    deletePackage: (userId, contentId) => dbAdapter.delete('packages', packageKey(userId, contentId)),
    purgeUser: async (userId) => {
      const records = await dbAdapter.getAll('packages')
      await Promise.all(records.filter((x) => x.userId === userId).map((x) => dbAdapter.delete('packages', x.key)))
      await dbAdapter.delete('entitlements', userId)
    },
    setEntitlementLease: (userId, effectivePremium, confirmedAt = Date.now()) =>
      dbAdapter.put('entitlements', { userId, effectivePremium, confirmedAt }),
    getEntitlementLease: (userId) => dbAdapter.get('entitlements', userId),
  }
}
```

- [ ] **Step 4: Run GREEN and commit**

```bash
npm test -- src/utils/offlineStore.test.js --runInBand
git diff --check
git add src/utils/offlineStore.js src/utils/offlineStore.test.js
git commit -m "feat: add user scoped offline store"
```

---

### Task 3: Offline Package Lifecycle and Playback URLs

**Repository:** `dreamweaver-web`

**Files:**
- Create: `src/utils/offlineLibrary.js`
- Create: `src/utils/offlineLibrary.test.js`
- Modify: `src/app/player/[id]/page.js`
- Create: `src/app/player/OfflinePlayback.test.js`

**Interfaces:**
- Consumes: Task 2 store
- Produces: `queueOfflinePackage({ userId, content, selectedVoice, store, fetchImpl })`
- Produces: `removeOfflinePackage({ userId, contentId, store })`
- Produces: `resolveOfflinePackage({ userId, contentId, store, urlApi })`
- Produces: `{ content, audioUrl, coverUrl, revoke() } | null`

- [ ] **Step 1: Write failing package lifecycle tests**

```javascript
test('downloads current voice, cover, and metadata after premium save', async () => {
  const store = memoryStore()
  const fetchImpl = jest.fn(async (url) => new Response(new Blob([url])))
  await queueOfflinePackage({
    userId: 'u1',
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    store,
    fetchImpl,
  })
  const record = await store.getPackage('u1', 'story-1')
  expect(record.state).toBe('ready')
  expect(record.voiceId).toBe('female_2')
  expect(record.audioBlob).toBeInstanceOf(Blob)
  expect(record.coverBlob).toBeInstanceOf(Blob)
})

test('marks a failed download for retry without deleting the save record', async () => {
  const store = memoryStore()
  await expect(queueOfflinePackage({
    userId: 'u1',
    content: sampleContentWithVoices(),
    selectedVoice: 'female_2',
    store,
    fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
  })).resolves.toMatchObject({ state: 'failed' })
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ state: 'failed' })
})

test('replaces cached audio when the selected voice changes', async () => {
  const store = memoryStore()
  await cacheSample(store, 'female_1')
  await cacheSample(store, 'female_2')
  expect(await store.getPackage('u1', 'story-1')).toMatchObject({ voiceId: 'female_2' })
})

test('creates and revokes object URLs for ready packages', async () => {
  const urlApi = { createObjectURL: jest.fn(() => 'blob:audio'), revokeObjectURL: jest.fn() }
  const resolved = await resolveOfflinePackage({ userId: 'u1', contentId: 'story-1', store: readyStore(), urlApi })
  expect(resolved.audioUrl).toBe('blob:audio')
  resolved.revoke()
  expect(urlApi.revokeObjectURL).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

```bash
npm test -- src/utils/offlineLibrary.test.js src/app/player/OfflinePlayback.test.js --runInBand
```

- [ ] **Step 3: Implement package selection, download, and object-URL cleanup**

```javascript
export function selectOfflineAudio(content, selectedVoice) {
  const variants = content.audio_variants || []
  const selected = variants.find((v) => v.voice === selectedVoice) || variants[0]
  return {
    voiceId: selected?.voice || selectedVoice || 'default',
    audioUrl: selected?.url || content.audio_url || content.audio_file,
  }
}
```

Write `pending` before fetching, `ready` only after both required blobs exist, and `failed` with the source URLs on fetch failure.

- [ ] **Step 4: Resolve ready offline content before network playback**

In `player/[id]/page.js`, resolve the signed-in user's ready package after content and selected voice settle. Use its object URLs for `audioSource.url` and cover rendering, and call `revoke()` on voice change, content change, and unmount.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/utils/offlineStore.test.js src/utils/offlineLibrary.test.js src/app/player/OfflinePlayback.test.js --runInBand
git diff --check
git add src/utils/offlineLibrary.js src/utils/offlineLibrary.test.js src/app/player/[id]/page.js src/app/player/OfflinePlayback.test.js
git commit -m "feat: cache premium saves for offline playback"
```

---

### Task 4: Sixth-Slot Upgrade Modal and Save Lifecycle

**Repository:** `dreamweaver-web`

**Files:**
- Create: `src/components/SaveLimitModal.js`
- Create: `src/components/SaveLimitModal.module.css`
- Create: `src/components/HeartButton.test.js`
- Modify: `src/components/HeartButton.js`
- Modify: `src/utils/i18n.js`
- Modify: `src/app/player/[id]/page.js`
- Modify: `src/app/nap-playlist/page.js`
- Modify: `src/app/before-bed/page.js`
- Modify: `src/app/playlist/page.js`

**Interfaces:**
- Consumes: Task 1 response fields and Task 3 `queueOfflinePackage`/`removeOfflinePackage`
- Adds `HeartButton` props: `content`, `selectedVoice`
- Produces: modal primary action to `/upgrade?intent=<safe-current-location>`

- [ ] **Step 1: Write failing component tests**

```javascript
test('free sixth save reverts the heart and opens the upgrade modal', async () => {
  mockSaveContent.mockResolvedValue({
    saved: false, liked: false, cap_reached: true,
    saved_count: 5, save_cap: 5, offline_allowed: false,
  })
  await clickHeart()
  expect(container.textContent).toContain('30 saved favorites')
  expect(container.textContent).toContain('offline listening')
  expect(heart().getAttribute('aria-pressed')).toBe('false')
})

test('upgrade action preserves the current path and query', async () => {
  await openFreeCapModal()
  await clickUpgrade()
  expect(mockSetUpgradeIntent).toHaveBeenCalledWith('/player/story-1?voice=female_2')
  expect(mockPush).toHaveBeenCalledWith('/upgrade?intent=%2Fplayer%2Fstory-1%3Fvoice%3Dfemale_2')
})

test('premium save queues the current voice only after server confirmation', async () => {
  mockSaveContent.mockResolvedValue({ saved: true, offline_allowed: true })
  await clickHeart({ content: sampleContent, selectedVoice: 'female_2' })
  expect(mockQueueOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({
    content: sampleContent,
    selectedVoice: 'female_2',
  }))
})

test('unsave removes the package only after server success', async () => {
  mockUnsaveContent.mockResolvedValue({ saved: false })
  await clickFilledHeart()
  expect(mockRemoveOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({ contentId: 'story-1' }))
})
```

- [ ] **Step 2: Run the component test and verify RED**

```bash
npm test -- src/components/HeartButton.test.js --runInBand
```

- [ ] **Step 3: Implement accessible localized modal**

Use `role="dialog"`, `aria-modal="true"`, labelled title, dismiss button, Escape handling, and these translation meanings:

```javascript
heartCapTitle: 'Your 5 free saves are full',
heartCapBody: 'Upgrade to Premium for 30 saved favorites and offline listening.',
heartCapUpgrade: 'Upgrade to Premium',
premiumCapBody: 'Your Premium library is full. Remove one saved favorite to add another.',
```

Add equivalent Hindi keys.

- [ ] **Step 4: Replace fallback-like behavior and wire automatic caching**

Remove `HINT_SESSION_KEY`, `mode === 'liked'`, and the cap-triggered `likeContent` teardown. A cap response always reverts `filled` and opens the modal. A successful premium save starts `queueOfflinePackage` without delaying the save confirmation.

Pass `content` and `selectedVoice` from every `HeartButton` call site.

- [ ] **Step 5: Run GREEN and commit**

```bash
npm test -- src/components/HeartButton.test.js src/utils/offlineLibrary.test.js --runInBand
git diff --check
git add src/components/SaveLimitModal.js src/components/SaveLimitModal.module.css src/components/HeartButton.js src/components/HeartButton.test.js src/utils/i18n.js src/app/player/[id]/page.js src/app/nap-playlist/page.js src/app/before-bed/page.js src/app/playlist/page.js
git commit -m "feat: prompt free users at saved slot limit"
```

---

### Task 5: Offline Saved Library and Entitlement Reconciliation

**Repository:** `dreamweaver-web`

**Files:**
- Modify: `src/utils/offlineLibrary.js`
- Modify: `src/utils/offlineLibrary.test.js`
- Modify: `src/app/my-stories/page.js`
- Create: `src/app/my-stories/OfflineSavedLibrary.test.js`
- Modify: `src/components/AppShell.js`
- Create: `src/components/OfflineReconciliation.test.js`
- Modify: `src/utils/auth.js`
- Modify: `src/utils/authThemeLogout.test.js`

**Interfaces:**
- Produces: `reconcileOfflineLibrary({ userId, effectivePremium, savedItems, store })`
- Produces: `getOfflineSavedItems(userId)`
- Consumes: `/me/saves` fields `items`, `effective_premium`, `save_cap`

- [ ] **Step 1: Write failing reconciliation tests**

```javascript
test('uses last confirmed premium lease and ready packages when offline', async () => {
  const store = premiumLeaseWithReadyPackage()
  await expect(loadSavedLibrary({ userId: 'u1', api: rejectingApi(), store }))
    .resolves.toEqual([expect.objectContaining({ id: 'story-1', offlineReady: true })])
})

test('confirmed downgrade purges packages immediately', async () => {
  const store = premiumLeaseWithReadyPackage()
  await reconcileOfflineLibrary({ userId: 'u1', effectivePremium: false, savedItems: [], store })
  expect(await store.listReadyPackages('u1')).toEqual([])
  expect(await store.getEntitlementLease('u1')).toMatchObject({ effectivePremium: false })
})

test('premium reconciliation removes unsaved packages and retries failed saves', async () => {
  const store = storeWithReadyAndFailedPackages()
  await reconcileOfflineLibrary({
    userId: 'u1',
    effectivePremium: true,
    savedItems: [savedItem('retry-me')],
    store,
  })
  expect(await store.getPackage('u1', 'removed-item')).toBeNull()
  expect(queueOfflinePackage).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({ id: 'retry-me' }),
  }))
})

test('logout purges packages before clearing user identity', async () => {
  await logout()
  expect(mockPurgeOfflineUser).toHaveBeenCalledWith('u1')
  expect(localStorage.getItem('dreamweaver_user')).toBeNull()
})
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
npm test -- src/app/my-stories/OfflineSavedLibrary.test.js src/components/OfflineReconciliation.test.js src/utils/authThemeLogout.test.js --runInBand
```

- [ ] **Step 3: Implement online-first saved library with offline fallback**

`my-stories/page.js` uses API results when available, stores the confirmed entitlement lease, reconciles packages, and falls back only when the stored lease is premium and ready packages exist. Update the free banner copy from `20` to `30` and route it through `/upgrade` intent.

- [ ] **Step 4: Reconcile on startup, focus, and native resume**

`AppShell` invokes reconciliation after authenticated entitlement refresh, on `window.__dvAppResumed`, and on `online`. Coalesce concurrent runs with one in-flight promise.

- [ ] **Step 5: Purge before logout identity removal**

Capture the current user ID, call `purgeOfflineUser(userId)`, then clear auth storage. Make logout async-safe while preserving immediate UI logout.

- [ ] **Step 6: Run GREEN and commit**

```bash
npm test -- src/utils/offlineStore.test.js src/utils/offlineLibrary.test.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/OfflineReconciliation.test.js src/utils/authThemeLogout.test.js --runInBand
git diff --check
git add src/utils/offlineLibrary.js src/utils/offlineLibrary.test.js src/app/my-stories/page.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/AppShell.js src/components/OfflineReconciliation.test.js src/utils/auth.js src/utils/authThemeLogout.test.js
git commit -m "feat: reconcile premium offline saved library"
```

---

### Task 6: Native Contract Alignment

**Repository:** `dreamweaver`

**Files:**
- Modify: `lib/config/constants.dart`
- Modify: `lib/models/user/subscription_tier.dart`
- Modify: `lib/main.dart`
- Create: `test/offline_saved_contract_test.dart`

**Interfaces:**
- Consumes: shared web IndexedDB implementation inside persistent WebView
- Produces: free `maxSaves == 5`, premium `maxSaves == 30`
- Preserves: `window.__dvAppResumed()` on native app resume

- [ ] **Step 1: Create an isolated native worktree**

```bash
git -C dreamweaver worktree add /private/tmp/dreamweaver-native-premium-offline -b feature/premium-offline-saves origin/main
```

- [ ] **Step 2: Write failing native contract tests**

```dart
test('native save limits match the backend contract', () {
  expect(AppConstants.freeMaxSaves, 5);
  expect(AppConstants.premiumMaxSaves, 30);
  expect(SubscriptionTier.free.maxSaves, 5);
  expect(SubscriptionTier.premium.maxSaves, 30);
});

test('resume script keeps offline reconciliation callback', () {
  expect(nativeResumeScript, contains('window.__dvAppResumed'));
});
```

- [ ] **Step 3: Run the test and verify RED**

```bash
flutter test test/offline_saved_contract_test.dart
```

Expected: premium limits report `25` and `100`, and the resume script is not exported for direct verification.

- [ ] **Step 4: Align constants and extract the resume script**

```dart
const String nativeResumeScript =
    'window.__dvAppResumed && window.__dvAppResumed();';
```

Set both duplicated limit sources to free `5` and premium `30`; use `nativeResumeScript` in `didChangeAppLifecycleState`.

- [ ] **Step 5: Run GREEN and commit**

```bash
flutter test test/offline_saved_contract_test.dart
dart analyze lib/config/constants.dart lib/models/user/subscription_tier.dart lib/main.dart
git diff --check
git add lib/config/constants.dart lib/models/user/subscription_tier.dart lib/main.dart test/offline_saved_contract_test.dart
git commit -m "feat: align native premium saved slots"
```

---

### Task 7: Cross-Repository Verification and Guarded Rollout

**Repositories:** `dreamweaver-backend`, `dreamweaver-web`, `dreamweaver`

**Files:**
- Modify: `dreamweaver-web/src/app/support/page.js`
- Modify: `dreamweaver-web/src/app/pricing/PricingClient.js`
- Create: `dreamweaver-web/src/components/PremiumOfflineContract.test.js`

**Interfaces:**
- Verifies: free `5`, premium `30`, automatic current-voice offline playback, upgrade routing, and public copy
- Deploy order: backend, web, coordinated native release

- [ ] **Step 1: Write the copy/contract regression**

```javascript
test('premium surfaces promise 30 saves and offline listening', () => {
  expect(read('src/app/pricing/PricingClient.js')).toMatch(/30 saved favorites/i)
  expect(read('src/app/pricing/PricingClient.js')).toMatch(/offline/i)
  expect(read('src/app/support/page.js')).not.toMatch(/exploring offline support/i)
})
```

- [ ] **Step 2: Run RED, update public copy, and run GREEN**

```bash
npm test -- src/components/PremiumOfflineContract.test.js --runInBand
```

Update pricing and support text to match the shipped behavior, then rerun:

```bash
npm test -- src/components/PremiumOfflineContract.test.js --runInBand
```

- [ ] **Step 3: Run focused repository verification**

```bash
python3 -m pytest -q scripts/test_save_offline_entitlements.py
npm test -- src/utils/offlineStore.test.js src/utils/offlineLibrary.test.js src/components/HeartButton.test.js src/app/player/OfflinePlayback.test.js src/app/my-stories/OfflineSavedLibrary.test.js src/components/OfflineReconciliation.test.js src/components/PremiumOfflineContract.test.js --runInBand
flutter test test/offline_saved_contract_test.dart
```

- [ ] **Step 4: Commit web copy**

```bash
git add src/app/support/page.js src/app/pricing/PricingClient.js src/components/PremiumOfflineContract.test.js
git commit -m "docs: publish premium offline saved library"
```

- [ ] **Step 5: Deploy backend through Deploy Guard**

```bash
ssh dreamvalley-prod.asia-south1-c.strong-harbor-472607-n4 \
  'cd /opt/dreamweaver-backend && python3 scripts/deploy_guard.py snapshot'
```

Fast-forward production to the reviewed backend commit while preserving and restoring the dirty runtime worktree, run the focused backend contract test if pytest is available, then:

```bash
ssh dreamvalley-prod.asia-south1-c.strong-harbor-472607-n4 \
  'cd /opt/dreamweaver-backend && python3 scripts/deploy_guard.py verify'
```

Do not waive any new finding. The previously user-waived YouTube-offline finding remains the only permitted exception.

- [ ] **Step 6: Deploy web and run production smoke checks**

Verify:

```text
free saves 1-5 → saved
free save 6 → modal; no save; no like; CTA opens /upgrade with intent
premium saves through 30 → saved
premium save → ready IndexedDB package for current voice
offline reload → saved library and audio play
unsave → package removed
confirmed downgrade/logout → packages purged
```

Run Deploy Guard verification after the web deployment.

- [ ] **Step 7: Park native changes for the next coordinated app release**

Keep the native branch/worktree and bundle the constants/resume verification with the next coordinated App Store/Play Store release. Do not release native independently from its paired web behavior.
