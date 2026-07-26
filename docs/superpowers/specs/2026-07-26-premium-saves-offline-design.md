# Premium Saved Slots and Automatic Offline Playback Design

## Goal

Give free users 5 saved-content slots with no offline playback, give premium users 30 saved-content slots with automatic offline playback, and show a clear upgrade path when a free user attempts a sixth save.

## Scope

This contract spans:

- `dreamweaver-backend`: authoritative entitlement and save-limit enforcement.
- `dreamweaver-web`: save-cap prompt, web offline storage, reconciliation, and offline playback.
- `dreamweaver`: native cache bridge and native offline playback.

The cap applies to saved-content interactions only. Likes remain separate, but reaching the save cap must not silently create a like.

## Entitlement and Limits

The backend remains the single source of truth:

- Effective free entitlement: 5 saved items and no offline packages.
- Effective premium entitlement: 30 saved items and offline packages.
- Paywall-disabled and native-paywall-dormant behavior continues to use the existing `effective_premium` policy.
- A premium user's 31st new save is rejected as a full premium library.
- Re-saving an already saved item remains idempotent and does not consume another slot.

All duplicate Flutter constants and subscription-plan metadata must agree with the authoritative values: free 5, premium 30.

## Save API Contract

A successful save returns:

```json
{
  "saved": true,
  "liked": false,
  "cap_reached": false,
  "saved_count": 5,
  "save_cap": 30,
  "offline_allowed": true
}
```

When a new save would exceed the active entitlement, the endpoint preserves its existing successful-response transport shape but returns:

```json
{
  "saved": false,
  "liked": false,
  "cap_reached": true,
  "saved_count": 5,
  "save_cap": 5,
  "offline_allowed": false
}
```

No save or like interaction is created in the cap-reached case. The client constructs the upgrade destination because only the client knows the current page.

## Free Sixth-Slot Experience

When an effective free user attempts a sixth save:

- Revert the optimistic saved state.
- Open an accessible modal, not a transient toast.
- State that Premium includes 30 saved favorites and offline listening.
- Provide a primary `Upgrade to Premium` action.
- Route to `/upgrade?intent=<current-path-and-query>` using the existing upgrade-intent flow.
- Provide a dismiss action that leaves the content unsaved.
- Use localized English and Hindi copy.

The prompt appears on every deliberate over-cap save attempt; it is not limited to once per session.

## Automatic Offline Package

After the server confirms a premium save, the client automatically downloads one offline package containing:

- The content metadata required to render the saved library and player.
- The cover image.
- The current voice's audio, or the default voice when no voice is selected.

Changing the selected voice while the item remains saved replaces the cached audio with the newly selected voice when online. Saving does not wait for the package download to finish.

Unsave removes the server save and the local package. Logout or effective downgrade removes every package belonging to that user.

## Web Storage and Playback

The web app stores:

- Audio and cover responses in a versioned Cache Storage cache.
- A per-user IndexedDB manifest containing content metadata, selected voice, cache keys, state, and retry information.

The service worker intercepts only manifest-owned offline media requests. It remains pass-through for all unrelated traffic.

The saved library uses the live API when available and falls back to complete local packages when offline. The player resolves a complete local package before requesting the network, so cached content plays without connectivity.

## Native Storage and Playback

The native web layer sends cache, remove, purge-user, and status requests through the existing Flutter JavaScript bridge. Flutter extends `AudioCacheService` to store the audio, cover, and metadata package under a user-scoped directory and returns a local playback URI.

The native player bridge resolves the user-scoped local URI before the network URL. Native and web use the same package states and entitlement rules even though their storage implementations differ.

## Package State and Reconciliation

Each package has one of these states:

- `pending`: server save succeeded, download has not completed.
- `ready`: metadata, cover, and selected audio are all present.
- `failed`: the last download attempt failed and may be retried.

A download failure never rolls back the server save. The client retries pending and failed packages on the next authenticated online session.

On startup, login, app resume, and entitlement refresh:

1. Fetch effective entitlement and saved IDs when online.
2. Purge all packages if the user is free or logged out.
3. For premium users, remove packages no longer saved and enqueue missing saved packages.
4. Preserve ready packages during transient network failures.

Incomplete packages are never presented as offline-playable.

## Error Handling

- Save API failure: restore the previous heart state and do not start a download.
- Cap reached: restore the previous heart state and show the applicable free-upgrade or premium-library-full message.
- Storage quota or download failure: keep the save, mark the package failed, and retry later.
- Unsave API failure: keep both the saved state and local package.
- Local deletion failure: hide the package immediately and retry physical cleanup later.
- Entitlement cannot be verified after a cached premium session: preserve files but do not expose offline playback until entitlement is confirmed.

## Security and Privacy

Offline packages are user-scoped. Logout and downgrade trigger purge, and one signed-in user cannot enumerate another user's manifest.

Browser origin storage and native application storage provide platform isolation, not DRM. No new long-lived media credentials are stored.

## Testing

Backend tests cover:

- Free saves 1–5 and rejected save 6.
- Premium saves 1–30 and rejected save 31.
- Idempotent re-save at the cap.
- No fallback like when the cap is reached.
- `offline_allowed` follows effective entitlement.

Web tests cover:

- Sixth-slot modal copy and `/upgrade` intent routing.
- Automatic current/default-voice package creation after a confirmed premium save.
- No download for free or cap-reached responses.
- Offline saved-library rendering and playback without network.
- Retry after download failure.
- Removal on unsave, logout, and downgrade.
- Service-worker pass-through for unrelated requests.

Native tests cover:

- User-scoped package creation and current-voice replacement.
- Local playback resolution without network.
- Removal on unsave, logout, and downgrade.
- Bridge error handling and retry state.

Cross-platform contract tests assert the same free and premium limits in backend, web, and Flutter.

## Release

Backend enforcement deploys before clients so no client can exceed 30 saves. Web offline support and the upgrade modal deploy after the backend contract, followed by a coordinated native release containing the Flutter bridge changes.

Each production deployment uses Deploy Guard snapshot before mutation and Deploy Guard verification afterward. Existing users are reconciled on first authenticated launch; content above the new entitlement remains on the server but cannot gain additional saves until the user drops below the cap.
