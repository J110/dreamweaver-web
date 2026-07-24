# Emberlight Premium Theme Design

## Purpose

Premium users should immediately feel that Dream Valley has entered a warmer, quieter, more refined nighttime mode. Emberlight applies that distinction across the complete product while preserving every existing screen layout and product flow.

The premium upgrade page uses the same visual language for free users so it acts as a truthful preview of the experience they are purchasing.

## Scope

This change covers the Next.js web application and the Flutter mobile shell in the same release.

- Apply Emberlight to every screen when premium entitlement is confirmed.
- Apply Emberlight to the upgrade page for free and premium users.
- Preserve existing layouts, information hierarchy, navigation, content, and interactions.
- Preserve existing billing, checkout, restore, authentication, and entitlement behavior.
- Apply matching premium colors to Flutter-owned system chrome and native surfaces.
- Include the one-time upgrade transition and accessible motion fallbacks.

## Non-goals

- Redesigning existing page layouts.
- Creating the card-shelf home, library, or player layouts shown in the reference prototype.
- Changing premium features, pricing, trial rules, or entitlement logic.
- Replacing story artwork or introducing striped placeholder artwork.
- Adding new player controls, filters, navigation destinations, or content states.

## Design Principle

Premium feels like the lamp turned low: the room becomes warmer, not louder.

The distinction comes from a coordinated visual system rather than premium badges or structural differences. Animation remains slow, subtle, and sleep-safe.

## Theme Architecture

### Shared semantic contract

The web application defines semantic theme properties at the application shell:

- page background
- primary and raised surfaces
- primary, secondary, and faint text
- accent and accent-pressed states
- hairlines and control borders
- focus rings
- card and modal shadows
- navigation and system chrome
- ambient glow and decorative motion

Existing components consume semantic properties rather than checking entitlement or selecting literal colors individually.

### Theme selection

The application shell selects one of two theme modes:

- `free`: the existing indigo/violet visual system
- `premium`: Emberlight

Confirmed entitlement is the source of truth. Loading, unknown, expired, and failed entitlement states retain the free theme until premium is confirmed. Theme selection does not change route access or billing behavior.

The upgrade route explicitly selects the Emberlight preview independent of entitlement. This exception is limited to presentation; it does not grant access to premium content or controls.

### Mobile integration

The Flutter application continues to host the web experience. It mirrors the effective theme into Flutter-owned areas such as the launch background, status/navigation bar colors, WebView surround, and any native loading or error surfaces.

The web application remains the source of truth for page and component styling. Flutter does not duplicate per-screen theme rules.

## Emberlight Visual Contract

### Colors

- Ink: `#201418`
- Surface: `#2C1D20`
- Raised surface: `#3A262A`
- Ember: `#D9A05F`
- Deep ember: `#A8743F`
- Cream: `#F2E6D8`
- Dim text: `#B39A86`
- Faint text: `#8D7568`
- Soft accent surface: `rgba(217, 160, 95, 0.10)`
- Hairlines: `rgba(217, 160, 95, 0.14)` through `rgba(217, 160, 95, 0.30)`

Existing semantic states such as success, warning, error, disabled, selected, and focus retain their meaning and meet accessible contrast against Emberlight surfaces.

### Typography

Existing display headings use Fraunces at restrained weights. Interface text retains the established platform sans-serif treatment. Hindi display text uses a warm Devanagari serif with matched visual weight, while Hindi interface text retains the existing readable sans-serif.

Typography changes must not alter content hierarchy, wrapping constraints, or layout structure. Font loading must include a stable fallback to avoid invisible text or disruptive layout shifts.

### Components

Existing cards, buttons, chips, inputs, dialogs, navigation, banners, progress controls, media controls, empty states, and settings rows keep their dimensions and placement. Emberlight changes their fills, borders, text colors, shadows, focus treatment, and pressed or selected states.

Primary actions use ember with ink text. Secondary controls use ember-tinted borders or surfaces. Cards use warm dark surfaces with low-contrast hairlines. Destructive actions remain clearly destructive and are not recolored as ordinary ember actions.

### Motion

Normal transitions use 300–600 ms ease-out timing with no bounce.

- Breathing emphasis uses a 5.5-second cycle.
- Ambient lamp glow uses a 7-second cycle.
- Ember motes drift for 14–26 seconds with low density and no pointer interaction.
- Decorative motion is absent when reduced motion or battery-saving mode is active.

Motion never blocks navigation, checkout, playback, or content interaction.

## Upgrade Experience

### Upgrade page preview

The existing upgrade page retains its current structure, pricing, trial copy, terms, restore action, and checkout flow. Its page background, cards, controls, typography, and supporting decoration render in Emberlight for all visitors.

The page must continue to communicate locked and purchasable states clearly. Previewing the theme never implies that premium entitlement is already active.

### One-time transition

After confirmed conversion from free to premium, the first eligible app view crossfades from the free theme into Emberlight over six seconds. A warm bottom-centered radial wash rises through the screen while the line “the lamp turns down…” fades in and out.

The transition:

- runs only after premium entitlement is confirmed
- is persisted per account/device as seen
- does not replay on ordinary launches or entitlement refreshes
- can be configured between two and ten seconds
- cuts directly to Emberlight when reduced motion is active
- cannot interrupt checkout recovery, navigation, or accessibility focus

If persistence fails, the app settles into Emberlight without repeatedly replaying the transition during the same session.

## State and Data Flow

1. Existing entitlement logic resolves the effective tier.
2. The application shell maps the effective tier to the theme mode.
3. The theme mode is exposed through a root attribute or equivalent theme provider.
4. Semantic properties cascade to all existing routes and components.
5. The web layer communicates the effective theme to Flutter-owned chrome.
6. A confirmed free-to-premium transition checks the persisted upgrade-transition flag.
7. The transition runs once when eligible, then records completion.

The upgrade page overrides only step 2 for its own presentation.

## Failure Handling

- Entitlement uncertainty uses the free theme until confirmation.
- Theme-message failure between web and Flutter must not prevent the web UI from loading.
- Font failure falls back to readable local fonts.
- Animation or persistence failure falls back to the settled premium theme.
- Unsupported motion or battery APIs default to reduced decorative activity.
- Existing network, playback, checkout, and restore error states retain their behavior and receive Emberlight styling only.

## Accessibility

- Text and interactive states meet WCAG AA contrast.
- Focus indicators remain visible against every Emberlight surface.
- Touch targets and control dimensions remain unchanged and at least as accessible as the current product.
- Decorative motes are hidden from assistive technology.
- The transition respects reduced motion and preserves focus.
- Theme selection does not rely on color alone to communicate billing, error, selected, or disabled states.
- English and Hindi interfaces are checked for clipping, fallback behavior, and readability.

## Verification

### Theme isolation

- Free users retain the current theme on every route except upgrade.
- Premium users receive Emberlight on every route.
- The upgrade page previews Emberlight without granting entitlement.
- Logging out, expiration, and account switching resolve to the correct theme.

### Route coverage

Verify home, explore, player, playlists, story creation, generated stories, favorites, settings, authentication, pricing, upgrade, checkout outcomes, restore, legal pages, loading states, empty states, errors, and dialogs on web and mobile.

### Responsive and platform coverage

Verify supported phone, tablet, and desktop widths; Flutter system chrome; WebView loading and failure states; English and Hindi; portrait and landscape where currently supported.

### Motion and persistence

Verify the upgrade transition runs once after confirmed conversion, remains skipped after persistence, does not run for existing premium users, and cuts directly to Emberlight under reduced motion. Verify motes and glows remain non-interactive and do not degrade scrolling or playback.

### Regression protection

Automated checks should cover tier-to-theme mapping, the upgrade-route preview override, transition eligibility and persistence, reduced-motion behavior, and entitlement fallback. Visual regression snapshots should cover representative shared components and critical routes in free, premium, and upgrade-preview states.

## Rollout

Web and Flutter changes ship together. The theme activation may be guarded by a release flag so production can disable the visual rollout without changing entitlement or billing behavior.

Release acceptance requires complete route coverage on both surfaces, no unresolved contrast failures, no layout changes attributable to the theme, and verified checkout and restore flows.
