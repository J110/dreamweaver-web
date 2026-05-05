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

- **Note for commit 1.2 backend event emitter:** PostHog server-side key
  (`POSTHOG_PROJECT_API_KEY`, no `NEXT_PUBLIC_` prefix) IS a secret. Goes in
  `/opt/dreamweaver-backend/.env`, not `.env.production.local`. Different
  file, different security model. The `NEXT_PUBLIC_POSTHOG_KEY` shipped in
  commit 1.1 is intentionally public — inlined into the client JS bundle,
  served to every browser.
