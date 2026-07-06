# RevenueCat Webhook — Gated Backend Deploy Runbook

The end-to-end BLOCKING gate: until this is live, a native purchase charges the
card but `subscription_tier` never flips → paid-but-locked. Deploy it with the
same rigor as the long-story redesign (it's a change to the same prod that
serves the app). **Do NOT point RevenueCat at the endpoint until Step 6 confirms
401-live.** Serial, foreground, observed — one build, snapshot before / verify
after.

Backend prod is pull-only: merge on a clone → push to J110 `main` → prod pulls.
Never `git reset --hard` on prod (wipes parked files). Compose: `down && up
--build`, never bare `up --build`.

---

## Step 0 — Grep-first: what does merging `iap-revenuecat` actually touch?
The spec invariant is RevenueCat is WRITE-ONLY, off the read/gating path. Prove
the merge honors it before deploying.

- [ ] `git diff main..iap-revenuecat --stat` — enumerate every changed file.
- [ ] Confirm ADDITIONS only on the write side: `app/api/v1/revenuecat.py`, `app/utils/revenuecat_mapping.py`, the `revenuecat_webhook_events` table/DDL, the `router.include_router(revenuecat_router, prefix="/billing/revenuecat", …)` line, and any `billing.py` helpers it reuses (`_apply_tier`, `_open_billing_db`, `_persist_user_update`).
- [ ] Confirm ZERO changes to the READ/serving path: `app/utils/gating.py`, `app/utils/entitlements.py` (already on main), content/player/serve routes. If the diff touches a serving route, STOP — that's beyond "add a webhook" and needs its own review.
- [ ] `grep -rn "import.*revenuecat\|revenuecat_mapping" app/` on the read path (gating/compute_tier) → expect NONE (the A4 import-guard invariant).

## Step 1 — Footgun check
- [ ] Route collision: nothing else mounts `/billing/revenuecat` (the include prefix is new).
- [ ] `REVENUECAT_WEBHOOK_SECRET` is set in prod `/opt/dreamweaver-backend/.env` BEFORE the container restarts (the endpoint fails-closed 401 without it — safe, but RevenueCat can't authenticate until it's set + matching).
- [ ] Idempotency table `revenuecat_webhook_events` is created on boot/migration (not assumed pre-existing).
- [ ] `chown anmolmohan:anmolmohan` any file touched by `sudo cp/mv` into pipeline-write paths (cron EACCES guard).

## Step 2 — Snapshot (before)
- [ ] `python3 scripts/deploy_guard.py snapshot`

## Step 3 — Merge + push (on a clone, not prod)
- [ ] Merge `iap-revenuecat` → `main` on a clone; resolve against current `main` (entitlement projection already landed).
- [ ] Push to J110 `main` (use the J110 gh account if the repo requires it).
- [ ] Record the merge SHA = `DEPLOY_SHA`.

## Step 4 — Deploy on prod (serial, foreground)
- [ ] `gcloud compute ssh dreamvalley-prod …`; `cd /opt/dreamweaver-backend && git pull`.
- [ ] Confirm `.env` has `REVENUECAT_WEBHOOK_SECRET` (Step 1).
- [ ] `docker-compose down && docker-compose up --build -d` (NEVER bare `up --build`).

## Step 5 — STOP-A: deployed HEAD == intended SHA
- [ ] `git rev-parse HEAD` on prod == `DEPLOY_SHA`. If not, stop and reconcile — do not proceed on a mismatch.

## Step 6 — Verify (after)
- [ ] `python3 scripts/deploy_guard.py verify` → clean EXCEPT the 3 known standing reds (long_story radio cosmetic + ~94 missing covers + gen-b70846 orphan). **Any NEW red = a regression from this deploy → fix before continuing.**
- [ ] **Webhook reachable (the gate):** `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dreamvalley.app/api/v1/billing/revenuecat/webhook` → **401** (mounted + auth-first fail-closed = live). 404 = not mounted → deploy didn't take.
- [ ] Authorized smoke (optional): POST with the correct `Authorization: <secret>` + a RevenueCat TEST event body → **200 ack**; backend log shows received + `ack-only (not entitlement-affecting)`.

## Step 7 — ONLY NOW point RevenueCat at it
- [ ] Owner checklist Phase 5: RevenueCat → Webhooks → URL = the verified endpoint, Authorization = the same secret. Send a RC test event → backend logs confirm receipt.

Rollback: the webhook is additive + off the read path — if verify shows a NEW red, redeploy the prior SHA (`git checkout <prev> && down && up --build`); no data migration to unwind (the events table is append-only/idempotent).
