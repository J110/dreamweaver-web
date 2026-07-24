# Emberlight Firefly Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace premium-theme twinkling stars with 24 gently drifting amber fireflies while preserving the free theme and every layout.

**Architecture:** Keep `StarField` as the shared ambient layer and enrich each existing particle with CSS custom properties for two-axis drift. Theme-gated global CSS preserves the current free star animation and converts only premium particles into fireflies, hiding particles 25–60.

**Tech Stack:** React 18, Next.js 14, CSS custom properties and keyframes, Jest with JSDOM.

## Global Constraints

- The free theme keeps 60 existing yellow opacity-twinkling stars.
- The premium theme displays exactly 24 warm amber fireflies with independent two-axis drift and glow pulses.
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
- Produces: 60 `.star` elements with `--firefly-drift-x`, `--firefly-drift-y`, `--firefly-mid-x`, and `--firefly-mid-y` inline custom properties; premium CSS displays and animates the first 24.

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

  test('provides motion paths for premium fireflies while retaining 60 shared particles', () => {
    act(() => root.render(<StarField />))

    const particles = container.querySelectorAll('.star')
    expect(particles).toHaveLength(60)
    expect(particles[0].style.getPropertyValue('--firefly-drift-x')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-drift-y')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-mid-x')).not.toBe('')
    expect(particles[0].style.getPropertyValue('--firefly-mid-y')).not.toBe('')
  })
})
```

- [ ] **Step 2: Run the regression test and verify RED**

Run:

```bash
npx jest src/components/StarField.test.js --runInBand
```

Expected: FAIL because `.star` elements do not define `--firefly-drift-x`.

- [ ] **Step 3: Add firefly path variables to each shared particle**

Extend each generated particle in `src/components/StarField.js`:

```javascript
driftX: Math.round(Math.random() * 80 - 40),
driftY: Math.round(Math.random() * 70 - 35),
midX: Math.round(Math.random() * 50 - 25),
midY: Math.round(Math.random() * 50 - 25),
```

Add these inline custom properties to each `.star`:

```javascript
'--firefly-drift-x': `${star.driftX}px`,
'--firefly-drift-y': `${star.driftY}px`,
'--firefly-mid-x': `${star.midX}px`,
'--firefly-mid-y': `${star.midY}px`,
```

- [ ] **Step 4: Add premium firefly motion without changing free stars**

Add premium selectors and keyframes to `src/app/globals.css`:

```css
@keyframes fireflyDrift {
  0%, 100% {
    transform: translate3d(0, 0, 0);
    opacity: 0.35;
  }
  35% {
    transform: translate3d(var(--firefly-mid-x), var(--firefly-mid-y), 0);
    opacity: 1;
  }
  70% {
    transform: translate3d(var(--firefly-drift-x), var(--firefly-drift-y), 0);
    opacity: 0.55;
  }
}

:root[data-theme='premium'] .star {
  width: 3px !important;
  height: 3px !important;
  background: #f6c76f;
  box-shadow: 0 0 5px 2px rgba(246, 199, 111, 0.65), 0 0 14px 5px rgba(233, 164, 94, 0.24);
  animation-name: fireflyDrift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

:root[data-theme='premium'] .star:nth-child(n + 25) {
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
24 particles are visible
at least one particle changes its transform over 500ms
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
