# Dream Valley — Cover Illustration Design Guide

This guide defines the design system for all story cover illustrations in Dream Valley (Sapno ki Duniya). Every new story must include a cover SVG that follows these specifications to maintain visual consistency, quality, and the app's signature dreamy aesthetic.

---

## 1. File Specifications

| Property | Value |
|----------|-------|
| Format | SVG (`.svg`) |
| viewBox | `0 0 512 512` |
| Namespace | `xmlns="http://www.w3.org/2000/svg"` |
| Target size | 18–35 KB |
| Target lines | 400–800 lines of SVG markup |
| Naming | `kebab-case.svg` (e.g., `brave-firefly.svg`) |
| Location | `/public/covers/` |
| Animation type | Embedded CSS `@keyframes` inside `<style>` block |

Why CSS-in-SVG (not GSAP/JS): The covers render via `<img>` tags, which block JavaScript execution. CSS animations embedded in SVG `<style>` blocks are GPU-accelerated, self-contained, and work universally in `<img>`, `<object>`, and inline SVG rendering.

---

## 2. SVG Document Structure

Every cover SVG must follow this exact structure:

```xml
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradients (linear, radial) -->
    <!-- Filters (glow, blur, shadow) -->
  </defs>

  <style>
    /* All CSS @keyframes and animation class definitions */
  </style>

  <!-- LAYER 1: Background sky/atmosphere -->
  <!-- LAYER 2: Far background (distant scenery, low opacity) -->
  <!-- LAYER 3: Mid background (trees, water, structures) -->
  <!-- LAYER 4: Middle ground (secondary characters, ground elements) -->
  <!-- LAYER 5: Primary character (center of scene) -->
  <!-- LAYER 6: Foreground (sparkles, particles, nearest elements) -->
  <!-- LAYER 7: Vignette/overlay (edge darkening) -->
</svg>
```

### ID Prefix Convention

Each SVG uses a unique 2-letter prefix for all gradient/filter IDs to avoid collisions if SVGs are ever inlined together:

| Cover | Prefix | Example |
|-------|--------|---------|
| sleepy-cloud | `sc-` | `sc-skyGradient` |
| brave-firefly | `bf-` | `bf-glowFilter` |
| moon-lullaby | `ml-` | `ml-moonGlow` |
| captain-stardust | `cs-` | `cs-nebulaBlur` |
| garden-whispers | `gw-` | `gw-roseGlow` |
| twinkle-dream | `td-` | `td-starGlow` |
| owl-goodnight | `og-` | `og-irisGradient` |
| sailing-dreamland | `sd-` | `sd-moonGlow` |

New covers should pick a unique 2-letter prefix not already in use.

---

## 3. Color System

### 3.1 Scene Color Palettes

Each cover uses a distinct palette. New covers must choose a palette that contrasts with existing ones. Here are the established palettes and scene types — avoid duplicating these exact combinations:

| Scene Type | Primary Colors | Used By |
|------------|---------------|---------|
| Warm Sunset | `#FF6B35`, `#FFB347`, `#FF69B4`, `#DDA0DD`, `#8A60A0`, `#2C3E6E` | sleepy-cloud, twinkle-dream |
| Deep Forest | `#0d3a2e`, `#1a5a3f`, `#2d6a4a`, `#ffd700`, `#8b5a3c` | brave-firefly |
| Silver Night | `#1a2a4a`, `#0f1f3f`, `#fef5d9`, `#f4e4b0`, `#c85a3a` | moon-lullaby |
| Cosmic Space | `#2d1b4e`, `#1a0f2e`, `#0a0515`, `#00ffff`, `#ff3300` | captain-stardust |
| Twilight Garden | `#1A2E4A`, `#3B5998`, `#D4B896`, `#FF69B4`, `#9370DB`, `#FFD700` | garden-whispers |
| Autumn Dusk | `#f4a460`, `#d2691e`, `#8b5a2b`, `#ffd700`, `#cd853f` | owl-goodnight |
| Ocean Night | `#0a0a1a`, `#1a2a5e`, `#2a4a8e`, `#fffef0`, `#8b6f47` | sailing-dreamland |

### 3.2 Universal Accent Colors

These can be used across any cover for consistency:

| Purpose | Color | Hex |
|---------|-------|-----|
| Warm glow/gold | Golden | `#FFD700` |
| Magical sparkle | Pale gold | `#FFE4B5` |
| Cheek blush | Soft pink | `#FFB6C1` |
| Eye shine | Pure white | `#FFFFFF` |
| Deep pupil | Dark navy | `#2C3E6E` or `#000000` |
| Skin tone range | Warm peach | `#f4b5a0` to `#D4A574` |

### 3.3 Palette Diversity Requirements

When creating a new cover, check it against these diversity axes:

- **Time of day**: dawn, morning, afternoon, sunset, dusk, night, midnight, cosmic
- **Weather/atmosphere**: clear, cloudy, starry, snowy, rainy, misty, aurora
- **Setting**: forest, ocean, space, garden, village, mountain, cave, sky, underwater
- **Season**: spring, summer, autumn, winter
- **Color temperature**: warm (oranges/reds), cool (blues/teals), mixed, neutral

The new cover must differ from all existing covers in at least 3 of these 5 axes.

---

## 4. Gradient Specifications

### 4.1 Required Gradient Types

Every cover must have at minimum:

1. **Sky/Background gradient** (linear, vertical) — sets the scene atmosphere
2. **Character glow gradient** (radial) — warmth around the main character
3. **Accent glow gradient** (radial) — for magical/glowing elements

### 4.2 Gradient Construction Rules

- Use 3–5 color stops per gradient (not more, to avoid banding)
- Include `stop-opacity` for fade-to-transparent effects
- Radial gradients for glow: center at `50% 50%`, radius covers the glow area
- Linear gradients for sky: `x1="0" y1="0" x2="0" y2="1"` (top to bottom)

### 4.3 Example Gradient Pattern

```xml
<defs>
  <!-- Sky gradient (always first) -->
  <linearGradient id="xx-skyGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#TOPCOLOR"/>
    <stop offset="40%" stop-color="#MIDCOLOR"/>
    <stop offset="100%" stop-color="#HORIZONCOLOR"/>
  </linearGradient>

  <!-- Character glow (radial, centered on character) -->
  <radialGradient id="xx-charGlow" cx="50%" cy="50%">
    <stop offset="0%" stop-color="#GLOWCOLOR" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#GLOWCOLOR" stop-opacity="0"/>
  </radialGradient>
</defs>
```

---

## 5. Filter Definitions

### 5.1 Standard Filter Library

Every cover should define these filters in its `<defs>`:

```xml
<!-- Soft glow (for faces, subtle elements) -->
<filter id="xx-softGlow">
  <feGaussianBlur stdDeviation="2" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>

<!-- Medium glow (for atmospheric effects) -->
<filter id="xx-mediumGlow">
  <feGaussianBlur stdDeviation="4" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>

<!-- Strong glow (for magical light sources) -->
<filter id="xx-strongGlow">
  <feGaussianBlur stdDeviation="6" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>

<!-- Drop shadow (for character grounding) -->
<filter id="xx-shadow">
  <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
  <feOffset in="blur" dy="2" result="offset"/>
  <feMerge>
    <feMergeNode in="offset"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

### 5.2 Glow Intensity Scale

| Filter | stdDeviation | Use For |
|--------|-------------|---------|
| `softGlow` | 2 | Face highlights, subtle accents |
| `mediumGlow` | 3–4 | Atmospheric effects, foliage depth |
| `strongGlow` | 5–6 | Firefly light, moon aura, magic effects |
| `heavyBlur` | 8–12 | Background clouds, nebulae, distance |

---

## 6. Character Design System

### 6.1 Eye Construction (The Most Important Detail)

Eyes are the emotional anchor of every character. Follow this layered construction:

```
Layer 1: Sclera (white circle/ellipse, r=12-16px)
Layer 2: Iris (colored circle with gradient, r=8-11px)
Layer 3: Pupil (dark circle, r=5-7px)
Layer 4: Primary highlight (white circle, r=2-2.5px, upper-right of iris)
Layer 5: Secondary highlight (white circle, r=1-1.5px, offset from primary)
Layer 6: Eyelid (ellipse matching skin/fur color, animated for blinking)
```

Example SVG:
```xml
<!-- Left eye -->
<circle cx="240" cy="235" r="14" fill="#FFFFFF"/>              <!-- sclera -->
<circle cx="240" cy="237" r="10" fill="url(#xx-irisGradient)"/> <!-- iris -->
<circle cx="240" cy="238" r="6" fill="#2C3E6E"/>                <!-- pupil -->
<circle cx="243" cy="234" r="2.5" fill="#FFFFFF" opacity="0.9"/> <!-- highlight 1 -->
<circle cx="237" cy="240" r="1.2" fill="#FFFFFF" opacity="0.6"/> <!-- highlight 2 -->
<ellipse cx="240" cy="233" rx="14" ry="5" fill="#SKINCOLOR" class="eyelid-left"/>
```

### 6.2 Expression Library

| Expression | Eyes | Mouth | Extras |
|-----------|------|-------|--------|
| **Sleeping** | Closed arcs (`path Q` curves) | Gentle upward curve | Rosy cheeks, slow breathing |
| **Happy** | Wide open, large highlights | Wide upward `Q` curve | Raised cheeks |
| **Wondering** | Extra-wide, prominent highlights | Small `O` shape or parted | Slightly raised brows |
| **Sleepy** | Half-closed (eyelid covers top half) | Gentle small curve | Blush, slow blink animation |
| **Content** | Soft closed arcs | Subtle curve | Relaxed cheeks |

### 6.3 Character Body Templates

**Animals** (fox, owl, rabbit, deer, squirrel):
- Head: circle (r=20-35px depending on importance)
- Body: ellipse (horizontal for quadrupeds, vertical for birds)
- Ears: ellipses or pointed paths, species-appropriate
- Tail: path curve or ellipse, characteristic shape
- Paws/feet: small circles or ellipses
- Fur texture: overlapping ellipses at slightly different opacities

**Children/Humans**:
- Head: circle (r=18-25px)
- Body: ellipse or rounded rect
- Limbs: stroke lines (width 6-8px) or thin ellipses
- Hair: overlapping ellipses/paths in hair color
- Clothing: simple filled shapes with occasional pattern dots

**Fantasy creatures** (clouds, moon faces, fireflies):
- Cloud: 5-9 overlapping white ellipses of varying sizes
- Moon face: crescent created by overlapping circles, features drawn directly
- Firefly: small ellipse body + large radial glow abdomen

### 6.4 Size Guidelines

- Main character: occupies 25-40% of the viewBox
- Secondary characters: 10-20% of viewBox
- Background characters: 5-10% of viewBox
- Character center position: near viewBox center (220-290, 200-280)

---

## 7. Animation Specifications

### 7.1 Core Animation Rules

1. **All animations must be infinite**: `animation: name Xs ease-in-out infinite`
2. **All easing must be ease-in-out** (never linear except for continuous rotation like Saturn's rings)
3. **Duration ranges are strict**: see table below
4. **Stagger delays for natural feel**: elements of the same type should have 0.2-0.5s offsets
5. **No animation should feel jarring**: this is a bedtime app for children

### 7.2 Animation Duration Standards

| Animation Type | Duration Range | Example |
|---------------|---------------|---------|
| Wing flutter / rapid twitch | 0.4–0.8s | butterfly wings, ear flick |
| Pulse / shimmer | 2–3.5s | glow effects, window flicker |
| Breathing / gentle pulse | 4–6s | character body, cheek blush |
| Bobbing / floating | 3–6s | clouds, floating characters |
| Swaying / rotation | 4–7s | trees, flowers, head tilt |
| Falling / drifting particles | 6–9s | sparkle dust, snow, leaves |
| Cloud drift / slow movement | 12–18s | background clouds, bird flight |
| Full rotation | 20–30s | planets, spinning objects |

### 7.3 Animation Value Standards

| Animation | Property | Value Range |
|-----------|----------|-------------|
| Bobbing | `translateY` | ±5 to ±10px |
| Horizontal drift | `translateX` | ±15 to ±40px |
| Gentle rotation | `rotate` | ±2 to ±5 degrees |
| Breathing scale | `scale` | 1.0 to 1.02–1.04 |
| Flower pulse | `scale` | 1.0 to 1.06–1.10 |
| Twinkle opacity | `opacity` | 0.2–0.4 to 0.8–1.0 |
| Blink (scaleY) | `scaleY` | 1.0 to 0.05 (brief close) |
| Wing flutter | `scaleX` | 1.0 to 0.5–0.7 |

### 7.4 Minimum Animation Count

Each cover must have at least **6 distinct animations** from at least **4 categories**:

Required categories (pick at least 4):
- **Character movement** (bobbing, breathing, blinking, head turn)
- **Environmental movement** (swaying foliage, drifting clouds, undulating waves)
- **Light effects** (twinkling stars, glowing elements, shimmer)
- **Particle movement** (falling sparkles, drifting fireflies, rising smoke)
- **Creature behavior** (wing flutter, tail swish, ear twitch)

### 7.5 Eye Blink Animation Pattern

The blink must keep eyes open ~80% of the time with a quick close-open:

```css
@keyframes eyeBlink {
  0%, 42%, 48%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(0.05); }
}
.eyelid { animation: eyeBlink 5s ease-in-out infinite; }
```

### 7.6 Stagger Pattern Example

For groups of similar elements (stars, fireflies, flowers):

```css
.star-1 { animation: twinkle 3s ease-in-out infinite; }
.star-2 { animation: twinkle 2.8s ease-in-out infinite 0.4s; }
.star-3 { animation: twinkle 3.2s ease-in-out infinite 0.9s; }
.star-4 { animation: twinkle 2.6s ease-in-out infinite 1.5s; }
```

Note: vary both duration AND delay for maximum naturalism. Never use identical durations for same-type elements.

### 7.7 Critical: CSS Transform vs SVG Transform

**CSS `transform` completely overrides SVG `transform` attributes.** If an element uses `transform="translate(x,y)"` (or `rotate()`, `scale()`, etc.) for positioning AND has a CSS animation that sets `transform: translateY(...)`, the CSS animation will REPLACE the positioning, snapping the element to (0,0).

**ALWAYS use nested groups** — outer `<g>` for positioning, inner `<g>` for animation:

```xml
<!-- CORRECT: nested groups separate positioning from animation -->
<g transform="translate(256, 240)">
  <g class="my-character-bob">
    <!-- character elements -->
  </g>
</g>

<!-- WRONG: CSS animation will override translate, snapping to (0,0)! -->
<g class="my-character-bob" transform="translate(256, 240)">
  <!-- character elements -->
</g>
```

This also applies to non-`<g>` elements like `<ellipse>` or `<use>`:

```xml
<!-- CORRECT: wrap in a positioned parent -->
<g transform="rotate(15 120 80)">
  <ellipse class="petal-fall" cx="120" cy="80" rx="8" ry="3" fill="#ffb6c1"/>
</g>

<!-- WRONG: CSS animation will lose the rotation -->
<ellipse class="petal-fall" transform="rotate(15 120 80)" cx="120" cy="80" rx="8" ry="3" fill="#ffb6c1"/>
```

This rule applies to ALL elements that use CSS `transform` animations (bobbing, breathing, drifting, floating, swaying, etc.) AND are positioned/rotated/scaled via SVG `transform`.

---

## 8. Layer Composition Guide

### 8.1 Depth Through Opacity

| Layer | Opacity Range | Purpose |
|-------|-------------|---------|
| Far background scenery | 0.15–0.35 | Distant hills, trees, buildings |
| Mid background | 0.5–0.7 | Secondary scenery, water |
| Middle ground | 0.7–0.9 | Supporting characters, platforms |
| Primary character | 1.0 | Main focal point |
| Foreground particles | 0.4–0.9 | Sparkles, dust, closest elements |
| Vignette overlay | 0.3–0.5 | Edge darkening for focus |

### 8.2 Vignette (Required)

Every cover must end with a subtle edge-darkening vignette for visual focus:

```xml
<!-- Vignette (always last element) -->
<rect width="512" height="512" fill="url(#xx-vignette)" opacity="0.4"/>
```

Where the gradient is:
```xml
<radialGradient id="xx-vignette">
  <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
</radialGradient>
```

### 8.3 Composition Center

- The main character/focal point should be near the center of the viewBox (x: 220–290, y: 200–280)
- Supporting elements frame the character (foliage on sides, sky above, ground below)
- The scene should read clearly even at small sizes (thumbnail on a phone card)

---

## 9. Adding a New Cover — Step by Step

### Step 1: Choose a unique theme
Check the diversity axes (Section 3.3) against all existing covers. Your new cover must differ in at least 3 of the 5 axes.

### Step 2: Define your palette
Choose 5-7 primary colors. Include at minimum:
- 2 background/sky colors
- 1 character accent color
- 1 glow/magical color (typically gold or cyan)
- 1 warm accent (pink, orange, or amber)

### Step 3: Create the SVG skeleton
```xml
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Your gradients with XX- prefix -->
    <!-- Your filters (copy standard set from Section 5) -->
  </defs>
  <style>
    /* Your animation keyframes */
    /* Your animation class assignments */
  </style>
  <!-- Your scene layers (7 layers, back to front) -->
</svg>
```

### Step 4: Build layers back-to-front
Follow the 7-layer structure from Section 2. Start with the sky gradient, add scenery, then characters, then particles, then vignette.

### Step 5: Design the main character
Follow the character templates in Section 6. Pay special attention to eyes (Section 6.1) — they are what makes kids feel connected.

### Step 6: Add animations
Embed at least 6 animations from at least 4 categories (Section 7.4). Follow the duration and value standards strictly.

### Step 7: Register in seedData.js
Add the new cover path to the `COVERS` object:
```javascript
const COVERS = {
  // ... existing covers
  newCoverName: '/covers/new-cover-name.svg',
};
```

Then assign it to the appropriate story's `cover` property.

### Step 8: Validate
- XML validity: parse with `xml.etree.ElementTree` or any XML validator
- File size: 18–35 KB
- Line count: 400–800 lines
- Animation count: 6+ animations, 4+ categories
- Renders correctly in `<img>` tag at small (120px) and large (512px) sizes

---

## 10. Quality Checklist

Before merging a new cover, verify:

- [ ] viewBox is exactly `0 0 512 512`
- [ ] Uses unique 2-letter ID prefix (not used by other covers)
- [ ] Has `<defs>` with gradients and filters
- [ ] Has `<style>` block with CSS animations (not SMIL)
- [ ] At least 6 distinct `@keyframes` definitions
- [ ] Animations from at least 4 categories
- [ ] All durations within specified ranges (0.4s–30s)
- [ ] All easing is `ease-in-out` (except continuous rotation)
- [ ] Main character has proper eye construction (5+ layers)
- [ ] Scene has 7-layer depth structure
- [ ] Ends with vignette overlay
- [ ] Color palette differs from existing covers in 3+ diversity axes
- [ ] File size 18–35 KB
- [ ] Valid XML (no parse errors)
- [ ] Renders correctly at thumbnail size (120×120px)
- [ ] Animations are gentle and calming (not fast or jarring)
- [ ] No element has BOTH a CSS animation class (that animates `transform`) AND an SVG `transform` attribute — use nested groups instead (see Section 7.7)
- [ ] Registered in seedData.js COVERS object

---

## 11. Existing Cover Reference

| # | File | Scene | Time | Setting | Season | Temperature | Animations |
|---|------|-------|------|---------|--------|-------------|-----------|
| 1 | sleepy-cloud.svg | Sunset village | Sunset | Village/sky | Any | Warm | 10 |
| 2 | brave-firefly.svg | Deep forest | Dusk | Forest | Summer | Warm-cool | 19 |
| 3 | moon-lullaby.svg | Moonlit meadow | Night | Meadow | Spring | Cool | 19 |
| 4 | captain-stardust.svg | Outer space | N/A | Space | N/A | Cool | 17 |
| 5 | garden-whispers.svg | Twilight garden | Twilight | Garden | Spring | Warm | 30 |
| 6 | twinkle-dream.svg | Dreamy skyscape | Night | Sky/clouds | Any | Cool | 29 |
| 7 | owl-goodnight.svg | Autumn forest | Dusk | Forest | Autumn | Warm | 19 |
| 8 | sailing-dreamland.svg | Ocean voyage | Night | Ocean | Any | Cool | 27 |

### Open Slots for New Covers

Themes NOT yet covered that would add diversity:
- **Snowy winter** wonderland (cold palette, snow particles)
- **Underwater** ocean scene (aqua/teal, fish, bubbles)
- **Rainy day** cozy scene (gray-blue, rain drops, warm interior)
- **Mountain dawn** sunrise (pink-gold, mountain silhouettes)
- **Cave of crystals** (purple-blue, crystal reflections)
- **Desert oasis** night (sand gold, palm silhouettes, warm)
- **Treehouse** at twilight (greens, warm window light)
- **Northern lights** arctic scene (greens-purples over snow)

---

*This guide is maintained alongside the codebase. Update it when adding new covers or changing the design system.*
