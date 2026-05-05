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
