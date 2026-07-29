# Emberlight Firefly Background Design

## Goal

Replace the purple theme's twinkling-star treatment with moving fireflies whenever Emberlight is active. Preserve every existing layout and keep the free theme unchanged.

## Design

`StarField` remains the shared ambient-background component. It continues rendering the existing 60 twinkling stars for the free theme. When the document root has `data-theme="premium"`, CSS switches the same background layer to 40 warm amber fireflies and hides the remaining particles.

The first 40 particles receive premium-only positions from an 8×5 grid with randomized placement inside every cell. This keeps coverage even without making the pattern look rigid and leaves the free theme's random star positions unchanged.

Each premium particle receives five independent two-axis waypoints, an 18–32 second wandering duration, and a separate 3–7 second glow duration. The multi-waypoint loop changes direction throughout its path instead of reversing along one line, while the independent glow cycle avoids synchronized pulsing. The effect remains behind content, clips inside the viewport, ignores pointer input, and introduces no layout changes.

## Visual Behavior

- Free theme: existing small yellow stars with opacity-only twinkling.
- Premium theme: 40 larger warm amber points with soft halos, slow multi-waypoint wandering, and restrained independent brightness pulsing.
- Fireflies remain sparse enough to avoid distracting from purchase controls and story content.
- The 8×5 distribution prevents large empty background regions.
- Particle paths are clipped to the viewport without creating horizontal overflow.
- Under `prefers-reduced-motion: reduce`, fireflies remain visible but stop drifting and pulsing.

## Implementation Boundaries

- Update only the shared ambient particle component, its global styles, and focused tests.
- Do not change page structure, spacing, typography, cards, buttons, or entitlement resolution.
- Do not add canvas, image assets, timers, or third-party animation libraries.

## Verification

- A regression test must fail against the current star-only premium behavior.
- Focused tests must verify 40 premium particles, 8×5 premium distribution variables, five waypoint pairs, 18–32 second wandering, independent glow timing, and theme-gated selectors while preserving free-theme twinkle behavior.
- Browser QA must confirm moving fireflies on `/upgrade`, unchanged stars on a free-themed route, no overflow, and reduced-motion behavior.
