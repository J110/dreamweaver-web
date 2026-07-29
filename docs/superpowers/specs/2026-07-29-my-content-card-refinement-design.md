# My Content Card Refinement Design

## Scope

Refine the deployed My Content shelves without changing their order, labels, locked behavior, or coming-soon interactions.

## Favorites

Favorites continue to use the shared `ContentCard`, but My Content passes a compact presentation option. Compact cards omit the duration and mood footer only on this page. Titles, cover images, age badges, saved state, navigation, and accessibility remain unchanged.

The compact card height matches the existing creation and locked-preview cards. Other pages retain the full `ContentCard` metadata.

## Characters and Voices

The four locked-preview cards use fixed URLs for existing production story covers:

- Two distinct covers for Characters.
- Two distinct covers for Voices.

The current localized labels, locked badges, dialog behavior, and card sizing remain unchanged. Fixed URLs keep the artwork stable across sessions and avoid coupling previews to a user's saved library.

## Verification

Component tests prove that compact cards omit duration and mood while ordinary cards retain them. Page tests prove the four locked previews reference fixed `/covers/` assets. The Emberlight audit and production build must pass before deployment.
