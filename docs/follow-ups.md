# Follow-ups

Tracked items not blocking the current commit but owed back to the codebase / docs.

## Deployment

- **Document `.env.production.local` as the canonical prod env file for `dreamweaver-web`.**
  Update `CLAUDE.md` deploy snippets to verify it exists with current values
  before `sudo npm run build`. Required `NEXT_PUBLIC_` vars as of Phase 0:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`
  - `NEXT_PUBLIC_GA4_ID`

  More vars land in subsequent commits (commit 1.2 backend keys, etc.). Keep
  `.env.production.local` as the single source of prod env truth — no other
  `.env*` file on prod should hold these. Highest precedence in Next.js env
  resolution and gitignored by default.

- **Backend PostHog ingestion** uses the **same project API key** as the
  client (`phc_` prefix). Lives in `/opt/dreamweaver-backend/.env` as
  `POSTHOG_PROJECT_API_KEY` (no `NEXT_PUBLIC_` prefix since it's
  backend-only). Project keys are public-by-design — server-side placement
  is for env hygiene, not secret protection. Earlier note describing it as
  a secret was incorrect.

## Cron / host environment (surfaced during commit 1.2 deploy)

- **Cron env divergence**: scripts run on the host (outside Docker) by
  default and don't auto-load `/opt/dreamweaver-backend/.env`. The pattern
  that works:

  ```cron
  cd /opt/dreamweaver-backend && set -a && . ./.env && set +a && \
    /usr/bin/python3 scripts/<script>.py >> logs/<log>.log 2>&1
  ```

  Applies to any cron whose script needs env vars (`POSTHOG_*`, TTS keys
  via `os.getenv`, etc.). Worth bubbling to `CLAUDE.md` as the canonical
  pattern.

- **Host Python vs Docker Python deps**: Docker container has its own
  site-packages from `requirements.txt`. Host `/usr/bin/python3` has a
  separate environment. Anything a host cron needs must be `pip3`-installed
  on the host. Existing pipeline crons already import host packages
  (`httpx`, `Pillow`, etc.); `posthog>=3.0` joins this set as of commit
  `ef6e67a`.

  Adding new dependencies needs **both**:
  - `requirements.txt` update (for Docker rebuild).
  - `pip3 install --user <pkg>` on host (for cron).

  Worth bubbling to `CLAUDE.md`.

## Hygiene

- **Username case-sensitivity**: the SQLite events table treats `meethi`
  and `Meethi` as distinct usernames (surfaced during the first
  activation script run on prod — both appeared in the candidate list,
  only one had a matching user record). Worth checking whether signup
  should canonicalize to lowercase, or if these are genuinely two
  separate accounts. Separate hygiene question — not a Phase 0 concern.

## Operational tightness (2026-05-08 deploy)

Three incidents surfaced during the Phase 0 step 1.4b deploy. None
caused data loss; all caused brief HTTP 502 windows on prod.

- **VM disk tightness** — production deploy hit "no space left on
  device" during Docker build. Backend container had been removed by
  `docker-compose down` but the new image couldn't build → 3 min of
  HTTP 502 on `api.dreamvalley.app` while recovering.
  `docker system prune -af --volumes` reclaimed 4.4G (87% → 78% disk).

  Real fixes: (a) increase VM disk size (~$5/mo more), or (b) weekly
  cron running `docker system prune` to keep dangling layers cleaned,
  or (c) audit what's eating disk (likely model files + old log files
  + content covers/audio duplicates between `/opt/cover-store` and
  `/opt/dreamweaver-web/public/covers`).

  Recommendation: do (b) immediately as cheap mitigation, plan (a)
  before next major deploy that adds dependencies. Cron line:

  ```cron
  0 5 * * 0 docker system prune -af --filter 'until=168h' >> /opt/dreamweaver-backend/logs/docker_prune.log 2>&1
  ```

  Runs weekly at 05:00 UTC Sunday, prunes only items > 7 days old.

- **`docker-compose restart` does NOT reload `env_file` changes.** The
  `restart` command keeps the existing container with its original env
  captured at create time. To reload env, must use
  `docker-compose down && docker-compose up -d` to recreate the container.

  Add to `CLAUDE.md` deploy patterns:
  - For **code changes** (rebuild image):
    `docker-compose down && docker-compose up -d --build`
  - For **env-only changes**:
    `docker-compose down && docker-compose up -d` (no `--build` needed)
  - `docker-compose restart` is for resetting a container that's in a
    bad state, NOT for picking up config changes.

- **`docker-compose up -d` (without preceding `down`)** can crash with
  `KeyError: 'ContainerConfig'` — a known incompatibility between
  `docker-compose` v1 and newer Docker image formats. Workaround:
  always pair with a preceding `down`. Real fix: upgrade prod to
  docker-compose v2 (Docker Compose plugin, invoked as `docker compose`
  with a space, no hyphen).

  Migration path:
  1. `apt-get install docker-compose-plugin` (or equivalent).
  2. Replace `docker-compose` with `docker compose` in deploy scripts
     and `CLAUDE.md`.
  3. Test with a non-critical service first.
  4. Both v1 and v2 can coexist if needed during transition.

  Worth doing soon — every future deploy with env or compose config
  changes risks hitting this bug.

## Auth migration UX (post-window cleanup)

- **Claim-existing-by-email-then-username UX** (post-migration window
  cleanup, target: after 2026-06-08). When a `signup_new` user picks a
  username that already exists on a different record (the data-loss
  race surfaced during the cold migration trigger of 7 unreached
  monthly actives), the collision check returns 409. The user must
  pick a different name. Their original record orphans. Recovery via
  `merge_username_collisions.py` works post-hoc but isn't ideal UX.

  Better UX: at signup time, detect "this username + this email might
  be the same person" and prompt *"Are you the original owner of this
  account? Verify your existing username."* Implement after the
  migration window closes (2026-06-08), informed by what the
  verbose-logging gate captured during the 30-day window. For now:
  the verbose-logging gate (logged WARNING on `login_existing` email
  mismatches inside the window) gives operations visibility into
  stuck users; manual recovery via the merge script covers data
  preservation.

- **Auth polling cache pattern (post-bug-fix refactor).** The polling
  success handlers in `/login` and `/auth/claim` use explicit field
  lists when calling `setUser`. This is fragile — every new user
  field added (`onboarding_complete`, `child_age`, `preferred_lang`
  were the third bug surface in the deploy chain that stabilized the
  magic-link auth flow) requires updating both polling sites plus the
  backend response. Better: spread the response object, let the
  backend be source of truth on which fields exist on a user record.
  Refactor when the next user-field addition prompts touching the
  polling code, OR proactively post-Phase 0 stabilization.

- **Test data hygiene.** Tonight's verification cycles created 4 user
  records with email-derived usernames that polluted the namespace
  and required manual archive cleanup
  (`scripts/archive_user.py` × 4, archived as `test_artifact_2026_05_09`).
  Future testing approach options:

  - Use ephemeral test emails (`+test_<timestamp>@`) with auto-archival
    policy (archive any user record where email matches `+test_`
    substring after 24h).
  - Test in a separate environment with disposable LocalStore.
  - Add a `TEST_MODE` env var that auto-tags created records with
    `archived_reason='test_session'` and a TTL.

  Priority: low until test cycles become more frequent or user volume
  grows. For now, manual cleanup via `archive_user.py` is acceptable.

## Mobile playback & deep-link gaps (surfaced 2026-05-13 owner device testing)

- **Android lock-screen player flakiness (Issue 1).** MediaSession
  API implemented at `src/utils/mediaSessionManager.js` (284 lines),
  wired in player at `src/app/player/[id]/page.js`. Native bridge to
  `window.DreamValleyMedia` posts to a Kotlin layer, but the current
  Flutter wrapper at `dreamweaver/lib/main.dart` is plain
  `webview_flutter` with no such channel — bridge is dead code today.
  Flakiness is likely PWA service-worker lifecycle (Chrome killing
  SW/audio when the device is locked); `public/sw.js` is a 16-line
  install-prompt stub with no caching or media handling. Real fix
  needs SW investigation + likely a native Android wrapper with
  `MediaSessionCompat`. Multi-session work.

- **iOS lock-screen artwork fallback (Issue 2).** MediaSession
  artwork IS being set — `mediaSessionManager.js` rasterizes SVG/PNG
  covers to PNG data URLs at 512/256/128 before assigning to
  `MediaMetadata.artwork`. Two probable causes for the favicon
  fallback:
  1. Mobile Safari `<canvas>` taint dropping artwork silently
     (cross-origin / SVG-via-`<object>` issue) when rasterizing.
  2. WKWebView wrapper not surfacing MediaSession to iOS Now Playing
     — needs a native `MPNowPlayingInfoCenter` bridge.

  Owner to clarify whether the symptom appears in mobile Safari or in
  the installed Flutter wrapper. Each has a different fix shape.

- **Universal Links / App Links missing (Issue 4).** Magic links
  currently open in the system browser instead of the installed app.
  Four pieces required, all missing:
  - `public/.well-known/assetlinks.json` (Android App Links).
  - `public/.well-known/apple-app-site-association` (iOS Universal
    Links).
  - `associatedDomains` entitlement in `dreamweaver/ios/Runner/`
    (no `.entitlements` file present today).
  - Intent filters in
    `dreamweaver/android/app/src/main/AndroidManifest.xml`
    (currently only MAIN/LAUNCHER).

  Magic link pattern: `https://dreamvalley.app/auth/verify?code={code}`.
  Plus the Flutter wrapper currently hardcodes
  `kAppUrl = 'https://dreamvalley.app'` — needs URL extraction so the
  incoming `?code=` is passed through to the WebView's initial URL.
  Requires: Apple team ID, Android keystore SHA-256, wrapper code
  changes. Native work session.

## Bedtime ritual feature workstream (Issues 5, 6, 7)

Three issues share infrastructure and should be designed together,
not piecemeal:

5. Auto-generated daily bedtime playlist of today's content.
6. Push notification when daily content is ready.
7. Per-day-of-week bedtime reminder scheduling.

Shared dependencies:

- Web Push API + service worker push handler (current `sw.js` has
  none).
- Notification permission grant flow.
- Backend cron firing scheduled pushes.
- User schedule storage (Mon–Sun times).
- Daily playlist endpoint backed by `content.json` date-filtering.
- Player UI: continuous playback mode (autoplay next).
- Notification scheduling UI (settings page).

Design pass needed before implementation — coherent feature, not
piecemeal.
