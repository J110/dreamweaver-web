# Saved Library Golden Ticket

## Scope

Update the My Stories favorites view without changing save limits or entitlement rules.

## Free experience

- Replace the plain save-count line with a gold-gradient banner.
- Show `{saved} of 5 saved` as the primary text.
- Show `More slots + offline downloads` as supporting text.
- Show `Get Premium →` as the visible action.
- Make the complete banner clickable and route it to `/upgrade`.
- Append a permanent promotional card after saved content.
- Style the card as a compact split Golden Ticket with the existing `/upgrade-showcase.webp` artwork in the upper 45% and a warm gold-gradient ticket body below.
- Keep the card within the same visual dimensions as saved content cards.
- Show `Premium pass`, `Unlock your full library`, and `30 favorites + offline downloads`.
- Make the complete card clickable and route it to `/upgrade`.
- The card does not count toward the five save slots.

## Premium experience

- Append a permanent informational card after saved content.
- Use the same compact split Golden Ticket proportions and artwork without a lock or upgrade treatment.
- Show `Premium library`, `30 saves included`, and `Save favorites and listen offline`.
- The card does not count toward the thirty save slots.
- Do not show the free upgrade banner, lock, or upgrade action.

## Behavior

The trailing card remains visible at every saved-item count, including zero and the plan limit. The artwork uses `object-fit: cover`, the text remains in the lower 55%, and the card retains its fixed compact aspect ratio. It must not become taller than neighboring saved-content cards because of narrow mobile widths or entitlement theme typography. Existing save, unsave, filtering, offline download, and reconciliation behavior remains unchanged.

## Testing

Add page-level tests that verify the free banner and Golden Ticket route to `/upgrade`, verify neither consumes a save slot, verify both entitlement cards use `/upgrade-showcase.webp`, and verify premium users receive the informational card without an upgrade action.
