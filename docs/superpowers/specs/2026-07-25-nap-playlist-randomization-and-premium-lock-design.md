# Nap Playlist Randomization and Premium Lock Design

## Scope

Modernize the nap playlist player controls, expose a locked fourth track to free users with an upgrade action, and generate a fresh per-user playlist on every entry without repeating a content item within its type until that type's eligible pool is exhausted.

The bedtime playlist and its counts are unchanged. Existing nap autoplay remains enabled for the first track and continues through the three free tracks without interruption.

## Playlist Contract

The nap playlist retains four ordered slots:

1. Lullaby
2. Poem
3. Story
4. Lullaby

Premium users receive four playable items. Free users also receive four items, but the fourth item is marked `is_locked: true` and has no playable audio URL. Its title and cover remain visible so the row can present an `Unlock with Premium` action.

The response continues to identify each slot and content item. Lock state comes from the backend response rather than client-side tier inference.

## Per-User Shuffle Bags

Every request is keyed by the authenticated user's canonical username. The route must reject an absent identity instead of sharing playlist state across users.

Selection maintains an independent placed-item history for each tuple:

`(username, language, nap content type)`

The content types are `lullaby`, `poem`, and `story`. Both lullaby slots draw from the same shuffle bag and must be distinct when at least two eligible lullabies remain.

For each slot, the backend:

1. Builds the eligible pool using the existing language, subtype, audio-availability, content-safety, and entitlement rules.
2. Removes IDs already placed for that user and type.
3. Chooses randomly from the remaining IDs.
4. If no IDs remain, clears only that user's history for that type and chooses from the full eligible pool.
5. Records the selected ID as placed before returning the playlist.

All four returned items count as placed, including the locked fourth item for a free user. A new request generates a new selection; the existing day-and-tier nap cache is not used.

If a type has fewer distinct eligible items than required slots, repetition is allowed only after that type is exhausted. Other types retain their histories.

## Persistence

Nap placement records use the existing playlist-history storage and persistence mechanism, extended with the canonical username and normalized nap content type. Historical bedtime records remain readable and unchanged.

History reads tolerate older records without user information by ignoring them for per-user shuffle bags. Writes remain atomic through the existing local-store persistence path.

## Playback and Upgrade Behavior

The client treats `is_locked` as authoritative:

- Locked rows cannot call `playTrack`.
- Previous and next controls cannot enter a locked track.
- When track 3 ends for a free user, playback stops normally.
- Existing autoplay startup and track-to-track progression remain otherwise unchanged.
- Selecting the locked row or its `Unlock with Premium` button opens the existing pricing route.

No audio URL is returned for a locked item, preventing playback through client manipulation while preserving its visible metadata.

## Player Controls

Replace emoji transport controls with inline SVG icons:

- Previous and next use matching circular glass buttons with disabled states at queue boundaries.
- Play/pause uses a larger primary circular button with the existing blue gradient, a restrained shadow, and a clear pressed state.
- All controls include accessible labels, minimum touch targets, and visible keyboard focus.

The visual change is limited to controls and locked-row treatment; artwork, safety text, playlist structure, and premium theme remain unchanged.

## Failure Handling

If a content type has no eligible audio, the route omits that slot and reports it through the existing missing-slot behavior rather than returning an unplayable unlocked item.

If history persistence fails, the request fails rather than silently returning selections that may repeat. The UI retains its existing loading and request-failure behavior.

## Verification

Backend tests must prove:

- Different users maintain independent histories.
- Consecutive requests for one user do not repeat within a type before exhaustion.
- Exhausting one type resets only that type.
- Two lullaby slots are distinct when the pool permits.
- Free and premium responses both contain four rows, with only the free fourth row locked.
- The locked free item has no audio URL.

Frontend tests must prove:

- Locked rows and next navigation cannot start playback.
- Free autoplay stops after track 3.
- The upgrade action routes to pricing.
- Premium track 4 remains playable.
- Transport controls expose accessible labels and boundary states.

Deployment verification must cover a free and premium account, two consecutive nap-playlist entries for each, HTTPS health, playlist count, lock state, and playable media URLs.
