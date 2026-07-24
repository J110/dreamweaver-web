# Emberlight Native Upgrade Recovery

## Goal

Every locked premium item opens the single `/upgrade` experience. The page uses Emberlight on web and in the native app, while iOS offers StoreKit subscription plans through the existing RevenueCat bridge.

## User flow

1. A free user opens locked premium content.
2. The player stores `/player/<id>?autoplay=1` as the return intent and replaces the player route with `/upgrade`.
3. Web users see the existing guarded Stripe checkout.
4. Native users see RevenueCat annual and monthly offerings, purchase through StoreKit, or restore an App Store subscription.
5. After backend entitlement confirmation, the user returns to the original player intent.

## Boundaries

- Remove the embedded locked-story preview and its duplicated checkout UI.
- Keep `/pricing` unavailable inside the native shell.
- Allow `/upgrade` inside the native shell.
- Keep the current Emberlight layout, fireflies, typography, colors, benefits, and web checkout safeguards.
- Reuse the existing Flutter `DreamValleyPurchase` bridge; no app-binary change is required.

## Failure handling

- Missing native offerings shows the existing safe web-subscription recovery message.
- Cancelled StoreKit purchases remain on the upgrade page without an error.
- Successful purchases wait for backend entitlement confirmation before returning to locked content.
- Restore supports StoreKit first and offers email recovery only when no App Store subscription exists.

## Verification

- Regression tests cover locked-player redirect, native route access, native plan rendering, purchase/restore helpers, and Emberlight route behavior.
- Full Jest, Emberlight verification, and production build must pass before deployment.
- GCP deployment uses an isolated release, private preflight, atomic activation, rollback, browser verification, and Deploy Guard.
