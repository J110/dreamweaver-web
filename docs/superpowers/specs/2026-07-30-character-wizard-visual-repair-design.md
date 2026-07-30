# Character Wizard Visual Repair

## Goal

Restore a polished, compact character wizard on mobile and desktop without changing its three-step flow, wording, validation, generation behavior, or credit rules.

## Root Cause

The wizard stylesheet references `--color-border`, `--color-bg-card`, and `--color-accent`, which are not defined by the application theme. Browsers discard the affected declarations, leaving controls transparent and borderless.

## Design

- Keep the existing Identity, Personality, and Review structure.
- Scope all changes to the character create and edit surfaces.
- Replace undefined variables with the existing theme contracts:
  - `--dv-hairline` for borders.
  - `--dv-surface` and `--dv-surface-raised` for fields and buttons.
  - `--dv-accent` and `--dv-soft-accent` for active states.
  - `--dv-focus` for keyboard focus.
- Preserve free and premium theme behavior through the shared `--dv-*` tokens.
- Tighten field, button, and section spacing at the existing mobile breakpoint.
- Give primary navigation actions a clear filled treatment while keeping surprise and trait controls secondary.
- Preserve minimum 44-pixel touch targets and existing accessibility attributes.

## Scope

The implementation changes only character wizard styling and focused visual regression coverage. It does not change component state, translations, API calls, authentication, slot rules, credits, or generation jobs.

## Verification

- Add a regression test that fails when undefined wizard theme variables return.
- Run the focused character create and edit tests.
- Run the Emberlight theme audit.
- Build the production web bundle.
- Verify the live mobile create page shows visible fields, buttons, focus states, and compact spacing in both free and premium themes.
