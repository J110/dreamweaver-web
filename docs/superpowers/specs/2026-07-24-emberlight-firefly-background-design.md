# Emberlight Firefly Background Design

## Goal

Replace the purple theme's twinkling-star treatment with moving fireflies whenever Emberlight is active. Preserve every existing layout and keep the free theme unchanged.

## Design

`StarField` remains the shared ambient-background component. It continues rendering the existing 60 twinkling stars for the free theme. When the document root has `data-theme="premium"`, CSS switches the same background layer to 24 warm amber fireflies and hides the remaining particles.

Each particle receives deterministic CSS custom properties for horizontal drift, vertical drift, duration, and delay. Premium particles move along independent gentle paths while their glow pulses asynchronously. The effect remains behind content, ignores pointer input, and introduces no layout changes.

## Visual Behavior

- Free theme: existing small yellow stars with opacity-only twinkling.
- Premium theme: larger warm amber points with soft halos, slow two-axis drifting, and restrained brightness pulsing.
- Fireflies remain sparse enough to avoid distracting from purchase controls and story content.
- Particle paths stay within the viewport without creating horizontal overflow.
- Under `prefers-reduced-motion: reduce`, fireflies remain visible but stop drifting and pulsing.

## Implementation Boundaries

- Update only the shared ambient particle component, its global styles, and focused tests.
- Do not change page structure, spacing, typography, cards, buttons, or entitlement resolution.
- Do not add canvas, image assets, timers, or third-party animation libraries.

## Verification

- A regression test must fail against the current star-only premium behavior.
- Focused tests must verify premium firefly variables and theme-gated selectors while preserving free-theme twinkle behavior.
- Browser QA must confirm moving fireflies on `/upgrade`, unchanged stars on a free-themed route, no overflow, and reduced-motion behavior.
