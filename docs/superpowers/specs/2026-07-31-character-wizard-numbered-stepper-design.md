# Character Wizard Numbered Stepper

## Scope

Replace the plain Identity, Personality, and Review status row in the shared create/edit character wizard with a three-step numbered indicator. Preserve the existing wizard flow, validation, translations, and `aria-current="step"` behavior.

## Visual States

Each step displays a circular number above its existing translated label:

- Completed steps use a solid accent fill.
- The current step uses the solid accent fill plus a stronger outline or glow.
- Upcoming steps use a muted outlined circle.
- A thin line connects adjacent circles without crossing their contents.

The three items share the available width evenly and remain legible at the 390-pixel mobile viewport.

## State Rules

The ordered steps are Identity (`1`), Personality (`2`), and Review (`3`).

- Identity current: step 1 current; steps 2 and 3 upcoming.
- Personality current: step 1 completed; step 2 current; step 3 upcoming.
- Review current: steps 1 and 2 completed; step 3 current.

Generation, result, failure, and connection states retain the existing rendering paths and do not add new step behavior.

## Accessibility

Keep the semantic ordered list and `aria-current="step"` on the active item. Numbers are visible text inside their respective list items; labels remain visible and translated. Completed, current, and upcoming states must differ through fill, border, and emphasis rather than color alone.

## Testing

Add focused assertions that verify:

- The three visible numbers are `1`, `2`, and `3`.
- Identity initially marks step 1 current.
- Advancing to Personality marks step 1 completed and step 2 current.
- Advancing to Review marks steps 1 and 2 completed and step 3 current.
- Existing create and edit wizard behavior remains unchanged.
