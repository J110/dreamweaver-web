# Dream Valley - UI Display Guidelines for New & Old Stories

This document defines how content is surfaced, tagged, and ordered in the Dream Valley frontend. Follow these rules when adding new stories, poems, or songs to ensure they appear correctly in the app.

---

## 1. The "NEW" Badge

### What It Means
The **NEW** badge indicates content the user has not yet listened to. It is personal per device — a story is "new" until the user engages with it.

### How It Works

| Component | File |
|-----------|------|
| Badge render | `src/components/ContentCard.js` |
| History tracking | `src/utils/listeningHistory.js` |
| Storage | `localStorage` key `dreamvalley_listening_history` |

**Logic:**
```
isNew = !isListened(content.id)
isListened = history[id].completionPercent >= 20
```

A story loses its NEW badge once the user has listened to at least **20% of the audio**. This threshold is intentional — it prevents accidental taps from removing the badge while still recognizing genuine engagement.

### Badge Styling
The NEW badge renders as a pill overlay in the top-left corner of the cover art area. It uses the `.newBadge` CSS class in `ContentCard.module.css`.

### Important Notes
- NEW is **per-device**, not per-account. Clearing localStorage resets all stories to NEW.
- The backend does not track "new" status. It is entirely a frontend concern.
- Every story starts as NEW on a fresh device/browser.

---

## 2. Discovery Ordering (sortByDiscovery)

### Purpose
The discovery engine ensures users always see fresh content first and already-heard content last.

### Algorithm

```
Input: array of stories

1. Split into two groups:
   - UNLISTENED: stories with no history or completionPercent < 20
   - LISTENED: stories with completionPercent >= 20

2. Sort UNLISTENED:
   - By addedAt date DESCENDING (newest first)
   - Stories without addedAt go to the end of the unlistened group

3. Sort LISTENED:
   - By lastPlayedAt ASCENDING (oldest listen first)
   - This pushes the most recently heard story to the very bottom

4. Return: [...unlistened, ...listened]
```

### Where It Runs

| Page | What Gets Sorted |
|------|-----------------|
| Home (`/`) | Stories, Poems, and Songs are each sorted independently via `sortByDiscovery` |
| Explore (`/explore`) | The full content grid is sorted via `sortByDiscovery` |

### The `addedAt` Field
- Format: `"YYYY-MM-DD"` date string
- Added to seed data entries to indicate when the content was introduced
- Stories without `addedAt` are treated as older content (they sort after dated entries)
- **When adding new stories, always include `addedAt` with the current date**

---

## 3. Content Card Display

### Cover Art Priority
The ContentCard displays cover art using this fallback chain:

```
1. content.cover (SVG path like "/covers/whispering-lighthouse.svg")
   -> Renders as <img> tag with lazy loading

2. If no cover: type-based gradient background
   -> Story: warm gradient + sparkle emoji
   -> Poem: cool gradient + book emoji
   -> Song: vibrant gradient + music note emoji
```

### Badges Shown on Cards

| Badge | Position | Condition |
|-------|----------|-----------|
| **NEW** | Top-left of cover art | `!isListened(content.id)` |
| **Age** | Top-right of cover art | `target_age` or `age_group` present |
| **Type** | Below cover art, in header | Always shown (`story`, `poem`, `song`) |

### Card Metadata
- **Title**: Shown prominently below the type badge
- **Duration**: Shown in footer as `X min`
- **Likes**: Shown in footer with heart emoji

---

## 4. API + Seed Data Merge (Enrichment)

### The Problem
The backend API returns story metadata (title, text, theme, etc.) but does **not** return frontend-only fields:
- `cover` (SVG illustration path)
- `audio_variants` (pre-generated audio files)
- `musicParams` (ambient music parameters)
- `musicProfile` (music profile name)
- `addedAt` (content freshness date)

### The Solution: Seed Data Enrichment
When the frontend fetches stories from the API, it enriches each API item with matching seed data fields:

```javascript
// Lookup seed data by id or title
const seed = seedById[item.id] || seedByTitle[item.title];

// Overlay seed-only fields onto API item
return {
  ...item,                                    // API data takes priority
  cover: item.cover || seed.cover,            // Seed fills in gaps
  audio_variants: item.audio_variants || seed.audio_variants,
  musicParams: item.musicParams || seed.musicParams,
  musicProfile: item.musicProfile || seed.musicProfile,
  addedAt: item.addedAt || seed.addedAt,
};
```

### Fallback
If the API is unreachable, the app falls back to `getStories(lang)` which returns the full seed data with all fields intact.

### Why This Matters for New Stories
When you add a new story:
1. It gets added to `content.json` (backend) and `seedData.js` (frontend)
2. The backend serves it via `/api/v1/trending` but **without** cover/audio/music
3. The frontend enrichment layer adds those fields back from seedData
4. Without enrichment, new stories would show gradient placeholders instead of covers

---

## 5. Checklist: Adding a New Story to the UI

When adding new content, ensure all these steps are completed:

### Required Fields in `seedData.js`
- [ ] `id` - Unique identifier (matches `content.json`)
- [ ] `type` - `"story"`, `"poem"`, or `"song"`
- [ ] `title` - Display title
- [ ] `description` - Short description for the card
- [ ] `cover` - Path to SVG cover illustration (e.g., `"/covers/my-cover.svg"`)
- [ ] `text` - Full story text with emotion markers
- [ ] `target_age` - Target age for age badge
- [ ] `theme` - Theme tag for filtering (must match a THEMES entry)
- [ ] `musicProfile` - Music profile name
- [ ] `musicParams` - Generated ambient music parameters (via `generate_music_params.py`)
- [ ] `audio_variants` - Array of pre-generated audio files
- [ ] `addedAt` - Date string `"YYYY-MM-DD"` for discovery ordering

### Required Registrations
- [ ] Cover SVG file placed in `public/covers/`
- [ ] Cover registered in the `COVERS` constant in `seedData.js`
- [ ] Audio MP3 files placed in `public/audio/pre-gen/`
- [ ] Theme exists in THEMES array on both home page and explore page
- [ ] Story exists in both `content.json` (backend) and `seedData.js` (frontend)

### Verification
- [ ] Build succeeds (`npm run build`)
- [ ] Cover renders at thumbnail size (120px) and full size (512px)
- [ ] NEW badge appears on the card
- [ ] Story appears first in its section (newest-first ordering)
- [ ] Theme filter correctly includes the story
- [ ] Audio plays correctly on the player page
- [ ] Ambient music plays with the generated params

---

## 6. Theme Filter System

### Available Themes

| Theme ID | Emoji | English | Hindi |
|----------|-------|---------|-------|
| `all` | sparkle | All | Sabhi |
| `dreamy` | moon | Dreamy | Sapne |
| `adventure` | sword | Adventure | Sahas |
| `animals` | lion | Animals | Janwar |
| `space` | rocket | Space | Antariksh |
| `fantasy` | wizard | Fantasy | Kalpana |
| `fairy_tale` | fairy | Fairy Tales | Pari Kathayein |
| `nature` | leaf | Nature | Prakriti |
| `ocean` | wave | Ocean | Samudra |
| `bedtime` | bed | Bedtime | Sone ka Samay |
| `friendship` | handshake | Friendship | Dosti |
| `family` | family | Family | Parivar |
| `mystery` | magnifier | Mystery | Rahasya |
| `science` | microscope | Science | Vigyan |

### Adding a New Theme
If your story uses a theme not in the list above:

1. Add the theme to `THEMES` array in `src/app/page.js` (home page)
2. Add the theme to `THEME_LABELS` object in `src/app/page.js`
3. Add the theme to `THEMES` array in `src/app/explore/page.js` (explore page)
4. Choose an appropriate emoji
5. Provide both English and Hindi labels

### Theme Matching
Filtering uses exact match on `story.theme`. The explore page also checks `story.categories` as a secondary match:
```javascript
s.theme === theme || s.categories?.some(c => c.toLowerCase() === theme)
```

---

## 7. Listening History Shape

```javascript
{
  [storyId]: {
    lastPlayedAt: number,        // Unix timestamp (Date.now())
    completionPercent: number,   // 0-100
    playCount: number            // Incremented when completionPercent crosses 20%
  }
}
```

### Thresholds

| Threshold | Meaning |
|-----------|---------|
| **< 20%** | Not considered "listened" - still shows NEW badge |
| **>= 20%** | Considered "listened" - NEW badge removed, story sinks in discovery |
| **100%** | Fully completed - set by `markCompleted()` on audio `ended` event |

### Functions

| Function | Purpose |
|----------|---------|
| `recordListen(id, pct)` | Update listening progress during playback |
| `markCompleted(id)` | Mark story as 100% complete |
| `isListened(id)` | Check if story has been listened to (>= 20%) |
| `getLastPlayedAt(id)` | Get last play timestamp |
| `getHistoryEntry(id)` | Get full history entry |
| `sortByDiscovery(stories)` | Sort array: unlistened newest-first, then listened oldest-first |

---

## 8. Visual Summary

```
HOME PAGE LAYOUT (horizontal scroll per section):
+--------------------------------------------------+
|  Stories (sorted by discovery)                     |
|  [NEW Pina Lighthouse] [NEW Story B] [Old Story C]|
+--------------------------------------------------+
|  Poems (sorted by discovery)                       |
|  [NEW Pina Blanket] [Old Poem A] [Old Poem B]     |
+--------------------------------------------------+
|  Songs (sorted by discovery)                       |
|  ...                                               |
+--------------------------------------------------+

EXPLORE PAGE (grid, all types mixed, sorted by discovery):
+--------------------------------------------------+
| [NEW items first, newest at top]                  |
| [Listened items last, oldest-listened first]      |
+--------------------------------------------------+
```

---

*This guide is maintained alongside the codebase. Update it when changing card display logic, discovery ordering, or badge behavior.*
