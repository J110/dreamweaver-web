# Emberlight Firefly Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace premium-theme twinkling stars with 40 slow, naturally wandering amber fireflies while preserving the free theme and every layout.

**Architecture:** Keep `StarField` as the shared ambient layer and give the first 40 particles premium-only positions from an 8×5 jittered grid. Theme-gated CSS preserves the current free star positions and animation while premium particles follow five independent two-axis waypoints over 18–32 seconds and pulse on a separate 3–7 second rhythm.

**Tech Stack:** React 18, Next.js 14, CSS custom properties and keyframes, Jest with JSDOM.

## Global Constraints

- The free theme keeps 60 existing yellow opacity-twinkling stars.
- The premium theme displays exactly 40 warm amber fireflies distributed through an 8×5 jittered grid.
- Every firefly follows five independent two-axis waypoints over 18–32 seconds and pulses on a separate 3–7 second rhythm.
- Layout, typography, cards, buttons, entitlement resolution, and pointer behavior remain unchanged.
- No canvas, image assets, timers, dependencies, or third-party animation libraries.
- `prefers-reduced-motion: reduce` stops firefly drift and pulsing without hiding the particles.

---

### Task 1: Theme-gated ambient fireflies

**Files:**
- Create: `src/components/StarField.test.js`
- Modify: `src/components/StarField.js:8-36`
- Modify: `src/app/globals.css:159-166`
- Modify: `src/app/globals.css:579-594`
- Modify: `package.json:9`

**Interfaces:**
- Consumes: root `data-theme="premium"` set by `EmberlightThemeController`.
- Produces: 60 `.star` elements; the first 40 expose premium grid positions, five waypoint pairs, wander duration/delay, and glow duration/delay; premium CSS displays and animates those 40.

- [ ] **Step 1: Write the failing regression test**

Create `src/components/StarField.test.js`:

```javascript
import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import StarField from './StarField'

describe('StarField theme particles', () => {
  let container
  let root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  test('provides natural premium firefly paths while retaining 60 shared particles', () => {
    act(() => root.render(<StarField />))

    const particles = container.querySelectorAll('.star')
    expect(particles).toHaveLength(60)
    expect(particles[0].style.getPropertyValue('--firefly-left')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-top')).not.toBe('')
    for (let waypoint = 1; waypoint <= 5; waypoint += 1) {
      expect(particles[0].style.getPropertyValue(`--firefly-x${waypoint}`)).not.toBe('')
      expect(particles[0].style.getPropertyValue(`--firefly-y${waypoint}`)).not.toBe('')
    }
    expect(particles[0].style.getPropertyValue('--firefly-wander-duration')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-glow-duration')).not.toBe('')
  })
})
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
npx jest src/components/StarField.test.js --runInBand
```

Expected: FAIL because `.star` elements do not define `--firefly-left`.

- [ ] **Step 3: Add firefly path variables to each shared particle**

Define the premium grid position and motion data while generating each particle in `src/components/StarField.js`:

```javascript
const fireflyColumn = i % 8
const fireflyRow = Math.floor(i / 8)
const premiumFirefly = i < 40

return {
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 2 + 0.5,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 5,
  fireflyLeft: premiumFirefly
    ? ((fireflyColumn + 0.2 + Math.random() * 0.6) / 8) * 100
    : 0,
  fireflyTop: premiumFirefly
    ? ((fireflyRow + 0.2 + Math.random() * 0.6) / 5) * 100
    : 0,
  waypoints: Array.from({ length: 5 }, () => ({
    x: Math.round(Math.random() * 120 - 60),
    y: Math.round(Math.random() * 100 - 50),
  })),
  wanderDuration: Math.random() * 14 + 18,
  wanderDelay: -(Math.random() * 32),
  glowDuration: Math.random() * 4 + 3,
  glowDelay: -(Math.random() * 7),
}
```

Add these inline custom properties to each premium-capable `.star`:

```javascript
'--firefly-left': `${star.fireflyLeft}%`,
'--firefly-top': `${star.fireflyTop}%`,
...Object.fromEntries(star.waypoints.flatMap((point, index) => [
  [`--firefly-x${index + 1}`, `${point.x}px`],
  [`--firefly-y${index + 1}`, `${point.y}px`],
])),
'--firefly-wander-duration': `${star.wanderDuration}s`,
'--firefly-wander-delay': `${star.wanderDelay}s`,
'--firefly-glow-duration': `${star.glowDuration}s`,
'--firefly-glow-delay': `${star.glowDelay}s`,
```

- [ ] **Step 4: Add premium firefly motion without changing free stars**

Add premium selectors and keyframes to `src/app/globals.css`:

```css
@keyframes fireflyWander {
  0%, 100% { transform: translate3d(0, 0, 0); }
  17% { transform: translate3d(var(--firefly-x1), var(--firefly-y1), 0); }
  34% { transform: translate3d(var(--firefly-x2), var(--firefly-y2), 0); }
  51% { transform: translate3d(var(--firefly-x3), var(--firefly-y3), 0); }
  68% { transform: translate3d(var(--firefly-x4), var(--firefly-y4), 0); }
  85% { transform: translate3d(var(--firefly-x5), var(--firefly-y5), 0); }
}

@keyframes fireflyGlow {
  0%, 100% { opacity: 0.28; }
  45% { opacity: 1; }
  70% { opacity: 0.5; }
}

:root[data-theme='premium'] .star {
  left: var(--firefly-left) !important;
  top: var(--firefly-top) !important;
  width: 3px !important;
  height: 3px !important;
  background: #f6c76f;
  box-shadow: 0 0 5px 2px rgba(246, 199, 111, 0.65), 0 0 14px 5px rgba(233, 164, 94, 0.24);
  animation:
    fireflyWander var(--firefly-wander-duration) var(--firefly-wander-delay) ease-in-out infinite,
    fireflyGlow var(--firefly-glow-duration) var(--firefly-glow-delay) ease-in-out infinite;
}

:root[data-theme='premium'] .star:nth-child(n + 41) {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  :root[data-theme='premium'] .star {
    animation: none !important;
    opacity: 0.65;
  }
}
```

- [ ] **Step 5: Add the regression to the focused Emberlight test command**

Append `src/components/StarField.test.js` to the Jest file list in `package.json` script `test:emberlight`.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
npx jest src/components/StarField.test.js --runInBand
npm run test:emberlight
npx jest --runInBand
npm run verify:emberlight
```

Expected: all commands exit 0.

- [ ] **Step 7: Verify the live visual behavior**

On `http://127.0.0.1:3211/upgrade`, confirm:

```text
data-theme is premium
40 particles are visible across all 8 columns and 5 rows
at least one particle changes direction across three sampled positions
computed wander duration is between 18s and 32s
document width does not exceed viewport width
```

On `http://127.0.0.1:3211/privacy`, confirm:

```text
data-theme is free
60 particles are visible
particles retain the twinkle animation name
document width does not exceed viewport width
```

Emulate `prefers-reduced-motion: reduce` on `/upgrade` and confirm computed `animation-name` is `none`.

- [ ] **Step 8: Commit**

```bash
git add src/components/StarField.test.js src/components/StarField.js src/app/globals.css package.json
git commit -m "feat: animate Emberlight fireflies"
```
