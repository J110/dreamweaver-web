# My Content Redesign and Monthly Credits

## Scope

Redesign the web app's `/my-stories` page as the My Content hub, move the Dream Valley Radio promotional card to Profile, and make monthly generation credits consistent across the web and backend.

This release does not implement content creation, character creation, voice recording, or persisted character and voice libraries. Those entry points and previews communicate the planned product structure and open a shared Coming Soon dialog.

## My Content

The page header shows:

- `My Content`
- A short supporting description
- The authenticated user's spendable credit total, including monthly and top-up credits

If the subscription request fails, the credit value renders as a neutral placeholder and the rest of the page remains usable. Signed-out visitors see the Free monthly allowance as product information but do not receive spendable credits until they sign in.

The existing Favorites and Preferences tabs are removed. Preferences are out of scope.

### Shelves

The page contains three vertically stacked, horizontally scrollable shelves sized for touch interaction:

1. Favorites
2. Characters
3. Voices

Each shelf begins with a visually distinct action card:

- Favorites: Create Content
- Characters: Create Character
- Voices: Record Voice

All three action cards open the shared Coming Soon dialog. Character and Voice shelves also show locked preview cards using existing Dream Valley cover artwork. Tapping a locked preview opens the same dialog. Locked previews must not resemble playable content.

Existing favorite items follow the Create Content card and continue using `ContentCard`. The current All, Short Stories, and Songs filter is removed from the primary layout. If there are no favorites, the shelf still shows the action card and an empty-state message with a route to Explore.

Shelves use horizontal overflow with scroll snapping. Cards expose enough of the next item to signal that the row is swipeable. Desktop users can scroll horizontally with standard pointer and trackpad behavior.

## Coming Soon Dialog

The dialog has context-specific copy for Content, Character, or Voice creation while using one implementation. It:

- Uses dialog semantics and an accessible title
- Traps focus while open
- Closes from its button, the backdrop, or Escape
- Restores focus to the triggering card
- Does not navigate or mutate user data

## Profile

Remove `RadioLiveCard` from My Content and render it beneath the Profile avatar identity block, before settings. Existing Header and landing-page radio links remain unchanged.

## Credit Entitlements

Monthly allocations are:

- Free: 3 credits
- Premium: 30 credits

Monthly credits do not roll over. Purchased top-up credits remain untouched by monthly resets and are included in the spendable balance shown on My Content.

Premium credits continue to reset from Stripe billing-period events. Free credits reset lazily at the start of each calendar month. The backend performs the lazy reset when an authenticated credit-bearing endpoint is read and immediately before any future generation debit, preventing stale balances from being spent.

A single backend credit-period helper owns:

- Tier allocation lookup
- Expired-period detection
- Free calendar-month boundaries
- Monthly pool reset
- Top-up preservation
- Idempotent persistence

Existing Free users currently using lifetime onboarding credits migrate to the monthly model on their first eligible lazy refresh. Existing Premium users retain their current billing-period dates and balance until the next Stripe renewal.

The subscription response continues returning monthly and top-up balances separately and also exposes their sum for display. Credit reset persistence failures are logged and surfaced as an API failure; the backend must not return an invented balance.

## Component Boundaries

The web implementation uses focused components:

- `ContentShelf`: heading, horizontal track, and empty supporting state
- `CreationCard`: action label, icon/art treatment, and Coming Soon trigger
- `LockedPreviewCard`: cover art, lock treatment, and Coming Soon trigger
- `ComingSoonDialog`: shared accessible modal behavior

`MyStoriesPage` owns favorite loading, subscription loading, and dialog context. `ContentCard` remains unchanged and renders only real saved content.

## Localization

New user-facing labels and dialog copy are available in English and the app's existing conversational Hindi mode. Existing translation conventions remain authoritative.

## Error and Loading States

- Favorites and credits load independently.
- Favorite loading retains a lightweight shelf placeholder.
- A Favorites failure produces the empty/supporting state without hiding Characters or Voices.
- A subscription failure displays a placeholder credit value.
- Cover images use existing image fallback behavior.
- Coming Soon interactions never require network access.

## Verification

Focused web tests cover:

- Shelf order and action-card labels
- Favorite rendering and empty state
- Locked Character and Voice previews
- Context-specific Coming Soon dialog behavior
- Credit loading and failure placeholder
- Absence of Preferences and the My Content radio card
- Presence of the radio card on Profile

Focused backend tests cover:

- Free allocation of 3 credits
- Premium allocation of 30 credits
- Free calendar-month reset without rollover
- Premium renewal reset
- Top-up preservation
- Idempotent lazy refresh
- Migration from lifetime Free credits
- Failure behavior when reset persistence fails

## Out of Scope

- Content creation forms
- Character creation and persistence
- Voice recording, cloning, and persistence
- Editing or deleting Characters and Voices
- Changes to existing favorite save limits
- Changes to radio destinations or playback behavior
