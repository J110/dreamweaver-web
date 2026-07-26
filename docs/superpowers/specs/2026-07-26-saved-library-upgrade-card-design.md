# Saved Library Upgrade Card

## Scope

Update the My Stories favorites view without changing save limits or entitlement rules.

## Free experience

- Replace the current save-count message with: `{saved}/5 saved. Upgrade to Premium for more slots and offline downloads`.
- Make the complete message clickable and route it to `/upgrade`.
- Append a permanent promotional card after saved content.
- Style the card as locked premium content using the existing premium artwork.
- Label the card `Upgrade to Premium` and route it to `/upgrade`.
- The card does not count toward the five save slots.

## Premium experience

- Append a permanent informational card after saved content.
- Use the message: `You have 30 slots. Save more favorites that you can listen to offline.`
- The card does not count toward the thirty save slots.
- Do not show the free upgrade banner or locked treatment.

## Behavior

The trailing card remains visible at every saved-item count, including zero and the plan limit. Existing save, unsave, filtering, offline download, and reconciliation behavior remains unchanged.

## Testing

Add page-level tests that verify the free banner and locked card link to `/upgrade`, verify neither consumes a save slot, and verify premium users receive the informational card without an upgrade link.
