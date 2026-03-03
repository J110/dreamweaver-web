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

**Rendering**: Hand-crafted SVG covers (Sections 1-11) use CSS `@keyframes` and render via both `<img>` and `<object>` tags. Experimental covers (Section 12) use SMIL animations and **require `<object>` tags** — the frontend automatically uses `<object>` for all `.svg` covers and `<img>` for non-SVG formats (WebP, PNG). CSS animations are GPU-accelerated, self-contained, and work universally.

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

## 12. Experimental Cover System (FLUX AI + SVG Overlay)

Starting March 2026, new covers are generated using a **2-layer architecture** instead of hand-crafted SVGs:

### Architecture

| Layer | Source | Format | Purpose |
|-------|--------|--------|---------|
| Layer 1 | FLUX.1 Schnell (Hugging Face, free tier) | WebP (15-40 KB) | AI-generated illustration background |
| Layer 2 | Programmatic SVG generator | SVG animations | Particles, glows, mist, stars, vignette |
| Combined | Script-generated | SVG with embedded base64 WebP | Single file served to frontend |

The combined SVG embeds the WebP as a base64 `<image>` element with all animated overlay elements on top, producing a single `.svg` file that renders with animations.

### Rendering Requirement

Experimental covers **MUST** be rendered via `<object>` tags (not `<img>` tags) in the frontend:

```jsx
// ContentCard.js / player page
{content.cover.endsWith('.svg') ? (
  <object
    data={content.cover}
    type="image/svg+xml"
    className={styles.coverImage}
    style={coverDimStyle}   // Progressive dimming during playback
    aria-label={content.title || 'Cover art'}
  />
) : (
  <img src={content.cover} alt={content.title} className={styles.coverImage} />
)}
```

**Why `<object>` instead of `<img>`?** The `<img>` tag blocks all SVG animations (CSS and SMIL). The `<object>` tag allows animations to render. The CSS for `.coverImage` includes `pointer-events: none; border: none; transition: filter 1s ease-in-out;` for smooth animation and dimming support.

### 7 Diversity Axes

Each cover is auto-selected from the story's metadata across 7 axes to ensure visual uniqueness:

| Axis | Options |
|------|---------|
| **World Setting** | deep_ocean, cloud_kingdom, enchanted_forest, snow_landscape, desert_night, cozy_interior, mountain_meadow, space_cosmos, tropical_lagoon, underground_cave, ancient_library, floating_islands |
| **Color Palette** | ember_warm, twilight_cool, forest_deep, golden_hour, moonstone, berry_dusk |
| **Composition** | vast_landscape, intimate_closeup, overhead_canopy, winding_path, circular_nest |
| **Character Visual** | human_child, small_mammal, aquatic_creature, bird, insect, plant, celestial, atmospheric, mythical_gentle, object, robot_mech, nature_spirit, no_character |
| **Light Source** | above (moonlight), backlit (rim light), below (bioluminescence), ambient (diffused) |
| **Texture** | watercolor_soft, soft_pastel, digital_painterly, paper_cutout |
| **Time Marker** | early_night, deep_night, eternal_dusk, timeless_indoor |

Story metadata (theme, age group, title keywords, `lead_character_type`) auto-maps to appropriate axes.

### Character Visual System (13 Types)

The character visual axis maps all 12 `lead_character_type` values from content generation to FLUX-friendly descriptions:

| Visual Key | FLUX Description | Mapped From |
|-----------|------------------|-------------|
| `human_child` | A young child with soft rounded features and bright curious eyes | `human` |
| `small_mammal` | A small cute animal with soft round body and gentle expression | `animal` |
| `aquatic_creature` | A gentle sea creature with flowing form and luminous eyes | `sea_creature` |
| `bird` | A small bird with soft feathers and round body | `bird` |
| `insect` | A tiny insect with delicate features and round friendly face | `insect` |
| `plant` | A sentient plant with gentle glowing organic form | `plant` |
| `celestial` | A glowing celestial being with radiant soft light | `celestial` |
| `atmospheric` | A personified weather element with translucent flowing form | `atmospheric` |
| `mythical_gentle` | A baby mythical creature with soft features | `mythical` |
| `object` | A personified everyday object with gentle expressive features | `object` |
| `robot_mech` | A small round friendly robot with soft edges | `robot` |
| `nature_spirit` | An abstract nature spirit with flowing translucent form | `alien` |
| `no_character` | (empty — pure landscape) | — |

**Compound type matching**: For values like `"jellyfish (sea creature)"`, fuzzy keyword matching finds the correct visual (e.g., "sea" → `aquatic_creature`).

### Character Phrase Extraction

The `_extract_character_phrase()` helper extracts the lead character's identity from the story `description` field for use directly in the FLUX prompt. This ensures covers show the *actual* character — not a generic child.

**Examples:**
- `"A tiny raindrop named Drizzle embarks on..."` → `"a tiny raindrop named Drizzle"`
- `"When seven-year-old Aarohi discovers..."` → `"seven-year-old Aarohi"`
- `"A gentle tortoise named Pebble embarks..."` → `"a gentle tortoise named Pebble"`
- `"In a futuristic city where playgrounds float, Aria discovers..."` → `"Aria"`

**Handled edge cases:**
- "When/As/In..." prefixes stripped; comma-separated clauses parsed
- "A gentle lullaby about..." wrappers removed
- "Join X as..." patterns matched
- Phrases capped at 60 chars with natural break at "who/from/in"

### Human Character Diversity

For `lead_character_type == "human"`, appearance is **deterministically diversified** using MD5 hash of the story ID. This ensures:
- Same story always gets the same appearance (stable across regenerations)
- Different stories get different-looking children
- Gender-appropriate selections

**Diversity pools (gender-aware):**

| Trait | Female Options | Male Options |
|-------|--------------|-------------|
| **Hair** | long straight black, braided with ribbons, curly dark, pigtails, bob cut, afro, long flowing red, two buns, ponytail with bangs, wavy brown with flowers | short curly dark, messy wavy brown, short spiky, short afro, buzz cut, shaggy brown, neat black, short with headband, tousled red, close-cropped |
| **Skin** | warm brown, light olive, dark brown, fair rosy, tan, deep ebony, golden tan, pale with freckles | (same pool) |
| **Clothing** | cozy knitted sweater, flowing colorful dress, overalls + striped shirt, hooded cape, hoodie, traditional embroidered, puffy jacket + scarf, simple tunic | cozy knitted sweater, vest + rolled sleeves, overalls + striped shirt, hooded cape, hoodie + sneakers, traditional embroidered, puffy jacket + scarf, tunic + sandals |

**Prompt examples:**
- **Non-human (atmospheric/raindrop):** `"a tiny raindrop named Drizzle, a personified weather element with translucent flowing form, gentle and friendly expression, in a magical world"`
- **Human (diverse girl):** `"seven-year-old Aarohi, a young girl, warm brown skin, braided hair with ribbons, wearing a flowing colorful dress, bright curious eyes wide open, gentle smile, looking with wonder at the magical world"`
- **Object (clock):** `"an old friendly clock named Tick, a personified everyday object with gentle expressive features and warm glow, gentle and friendly expression, in a magical world"`

### SVG Overlay Animation Types

Each cover gets a **world-appropriate vignette** plus 2-3 world-specific animation layers. There are no mandatory layers across all covers — variety comes from the world setting.

**World-specific animations:**
- `particles_*` — bubbles, pollen, snow, dust, fireflies, spores, leaves
- `glow_*` — bioluminescence, firefly, candle, crystals, sunset, lantern, nebula
- `twinkle_*` — stars, distant shimmer
- `drift_*` — clouds, sand, starfield
- `mist_*` — underwater, ground, valley, sea, steam

### SVG Overlay Diversity Rules

Each animation variant uses **radically different SVG primitives** to prevent visual sameness:

**Mist variants (5 distinct styles):**

| Variant | SVG Primitive | Position | Visual Effect |
|---------|--------------|----------|---------------|
| `mist_underwater` | `<path>` cubic bezier curves | Mid-height (y: 160-440) | Wavy horizontal current lines |
| `mist_valley` | `<rect>` with `transform="rotate()"` | Full canvas, diagonal | Sweeping diagonal bands |
| `mist_sea` | Thin `<rect>` lines | Horizon line (y: ~260) | Single sharp horizon mist |
| `mist_steam` | Tall narrow `<rect>` columns | Rising upward | Vertical steam columns |
| `mist_ground` | Small `<circle>` dots (12-20) | Varying heights | Scattered soft fog dots |

**Glow variants (position diversity):**

| Variant | SVG Primitive | Position | Visual Effect |
|---------|--------------|----------|---------------|
| `glow_bioluminescence` | Vertical `<rect>` streaks | Upper 2/3 of canvas | Tall glowing streaks |
| `glow_campfire` | `<polygon>` triangles | Scattered across canvas | Flame-shaped points |
| `glow_sunset` | Horizontal `<rect>` bands | TOP of canvas (y: 20-120) | Sky-level color bands |
| Other glow variants | `<ellipse>` / `<circle>` | Various positions | Standard soft glows |

**Drift variants:**

| Variant | SVG Primitive | Position |
|---------|--------------|----------|
| `drift_clouds` | `<ellipse>` | Upper canvas |
| `drift_sand` | `<line>` diagonal streaks | Full canvas, angled |
| `drift_starfield` | `<circle>` dots | Scattered |

**Key rule:** No two animation variants should use the same combination of SVG primitive + position + size. If everything uses `<ellipse>` at the bottom, the covers look identical regardless of the name.

### Sleep-Safe Animation Rules

| Rule | Value |
|------|-------|
| Minimum cycle duration | 4 seconds |
| Maximum opacity | 60% (particles), 80% (vignette) |
| Particle drift | 15-28s slow downward |
| Star twinkle | 5-10s fade in/out |
| Mist movement | 18-38s gentle sway |
| All animations | SMIL `<animate>` / `<animateTransform>` |
| Easing | ease-in-out for all cycles |

### Progressive Cover Dimming (Playback)

During audio playback, the cover image **progressively dims** to support sleep induction. This is implemented as CSS `filter` changes on the `<object>` element, driven by playback progress (0-100%).

**3-Phase Dimming Model:**

| Phase | Progress | Brightness | Saturation | Sepia | Purpose |
|-------|----------|-----------|------------|-------|---------|
| Capture (Phase 1) | 0-33% | 1.0 | 1.0 | 0.0 | Full vibrant cover to engage child |
| Descent (Phase 2) | 33-66% | 1.0 → 0.85 | 1.0 → 0.8 | 0.0 → 0.1 | Gradual warmth + slight dim |
| Sleep (Phase 3) | 66-100% | 0.85 → 0.5 | 0.8 → 0.5 | 0.1 → 0.2 | Deep dim, warm sepia tone |

**Implementation:**
- `useMemo` in player page computes `coverDimStyle` from `progress` state
- CSS `transition: filter 1s ease-in-out` smooths changes
- Only applies when `isPlaying` and cover is SVG
- Works for ALL content types (stories, poems, lullabies) — progress is always 0-100%

### Character Expression Rules

Characters in FLUX-generated backgrounds must:
- Look **happy, curious, and adventurous** (bright eyes, gentle smile)
- Never appear **sad, distressed, or crying**
- Eyes should be **wide open** (not closed/sleepy — the overlay handles the sleep mood)
- Expressions should convey **wonder and exploration**

### Pipeline Integration

The automated daily pipeline (`pipeline_run.py`) generates experimental covers via:
```bash
python3 scripts/generate_cover_experimental.py --story-json <path>
```

This produces:
1. `{id}_background.webp` — FLUX AI background
2. `{id}_overlay.svg` — Animated SVG overlay
3. `{id}_combined.svg` — Combined file (copied to `public/covers/`)

**FLUX is the only cover system for the pipeline.** The `HF_API_TOKEN` env var must be set. If FLUX fails for a story, that story gets no cover (it will use `default.svg`) rather than falling back to a different generation method. This ensures visual consistency across all covers.

### Generation Script

**File**: `dreamweaver-backend/scripts/generate_cover_experimental.py`

**Required env var**: `HF_API_TOKEN` (Hugging Face Read token, free tier)

**Required packages**: `pip install httpx Pillow`

```bash
# Generate cover for a specific story
python3 scripts/generate_cover_experimental.py \
    --story-json seed_output/experimental_6_8_gen-XXXX.json

# Override diversity axes
python3 scripts/generate_cover_experimental.py \
    --story-json seed_output/experimental_6_8_gen-XXXX.json \
    --world-setting enchanted_forest \
    --palette golden_hour

# Dry run (show prompt only)
python3 scripts/generate_cover_experimental.py \
    --story-json seed_output/experimental_6_8_gen-XXXX.json \
    --dry-run
```

---

*This guide is maintained alongside the codebase. Last updated: March 2026 — overlay diversity, character diversity, progressive dimming.*
