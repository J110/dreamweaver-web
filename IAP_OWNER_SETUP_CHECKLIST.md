# Dream Valley — Native IAP Owner Setup Runbook (iOS-first)

Fill-in-the-blank provisioning runbook for the RevenueCat + App Store Connect
setup. Aligned to `dreamweaver-backend/docs/superpowers/specs/2026-06-25-iap-revenuecat-design.md`.
The **code is built** (backend webhook, Flutter bridge, web paywall consumer) —
this runbook is the external provisioning that turns it on.

**Known constants (already true — do not change):**
- iOS bundle ID: `com.vervetogether.dreamvalley`
- Product IDs: `com.vervetogether.dreamvalley.premium.monthly`, `com.vervetogether.dreamvalley.premium.annual`
- One subscription group; both auto-renewing; **7-day free trial** intro offer on both
- Store localizations: **English + Roman Hindi** (never Devanagari)
- Backend webhook endpoint: `POST https://api.dreamvalley.app/api/v1/billing/revenuecat/webhook`
- RevenueCat entitlement id: `premium`; offering packages MUST be the standard **Monthly** + **Annual** package types (RevenueCat ids `$rc_monthly` / `$rc_annual` — the web paywall keys on these)

**Pricing (CONFIRMED 2026-07-06):** monthly **₹499**, annual **₹3,999** (~33% off 12×₹499), both 7-day trial. USD/other regions = Apple auto-convert tiers (do not hand-set per currency for v1).

**Owner blanks to fill:** `ASC_API_KEY_ID`, `ASC_ISSUER_ID`, `REVENUECAT_IOS_SDK_KEY`, `REVENUECAT_WEBHOOK_SECRET`.

---

## ⛔ BLOCKING GATE — the webhook must be live before ANY purchase unlocks

Today the entitlement chain is **half-live**: the projection (`compute_tier`) is
deployed, but the RevenueCat **webhook is NOT on prod** (still on the
`iap-revenuecat` backend branch). Until Phase 1 lands, a native purchase would
succeed on-device and charge the card but **never flip `subscription_tier`** —
paid-but-locked. **Phase 1 gates the whole flow.** Do it first; do not point
RevenueCat at the endpoint (Phase 5) until Phase 1 verifies live.

---

## Phase 1 — Deploy the backend webhook  ← DO FIRST (blocking)
Owner-side account setup can run in parallel, but the endpoint must be live
before Phase 5.

- [ ] Merge backend `iap-revenuecat` → `main` (adds `app/api/v1/revenuecat.py`, mapping, idempotency table).
- [ ] Set `REVENUECAT_WEBHOOK_SECRET=<REVENUECAT_WEBHOOK_SECRET>` in prod `/opt/dreamweaver-backend/.env` (value comes from Phase 4).
- [ ] Deploy per backend runbook (`docker-compose down && up --build`; `deploy_guard snapshot` before, `verify` after).
- [ ] **Verify live:** `curl -s -o /dev/null -w "%{http_code}" -X POST https://api.dreamvalley.app/api/v1/billing/revenuecat/webhook` → **401** (auth-first fail-closed = deployed). 404 = not deployed.

## Phase 2 — Apple App Store Connect API key (.p8)  [iOS merchant DONE ✅]
- [ ] ASC → Users & Access → Integrations → App Store Connect API → generate a key with an in-app-purchase-capable role.
- [ ] Record `ASC_API_KEY_ID=<ASC_API_KEY_ID>` and `ASC_ISSUER_ID=<ASC_ISSUER_ID>`; download the `.p8` (one-time download — store securely).
- [ ] Note: this is the **ASC API key** for IAP validation — NOT the APNs push `.p8` (push is out of scope).

## Phase 3 — ASC subscription products  [UNBLOCKED 2026-07-06 — create at ₹499 / ₹3,999]
- [ ] Create a subscription group (e.g. "Dream Valley Premium").
- [ ] Product `com.vervetogether.dreamvalley.premium.monthly` — auto-renew, duration 1 month.
- [ ] Product `com.vervetogether.dreamvalley.premium.annual` — auto-renew, duration 1 year.
- [ ] Add a **7-day free trial** introductory offer to BOTH.
- [ ] Localizations EN + Roman Hindi (display name + description) for group and both products.
- [x] **Price — CONFIRMED:** monthly **₹499**, annual **₹3,999**. Snap to the nearest ASC **INR** tier (₹499 / ₹3,999 or closest available); other regions = Apple auto-convert (sanity-check monthly lands near ~$6). No per-currency hand-setting for v1.
- [ ] Add the subscription **review screenshot** (Apple requires one per group).
- [ ] Get both products to **Ready to Submit**.

## Phase 4 — RevenueCat project + linking  → emits the keys
- [ ] Create the RevenueCat project; add the iOS app with bundle `com.vervetogether.dreamvalley`.
- [ ] Upload the ASC API key (`.p8` + `ASC_API_KEY_ID` + `ASC_ISSUER_ID`) from Phase 2.
- [ ] Create entitlement `premium`; attach both products to it.
- [ ] Create an offering with **Monthly** + **Annual** packages (standard package types → `$rc_monthly` / `$rc_annual`).
- [ ] Copy out `REVENUECAT_IOS_SDK_KEY` (public SDK key) and `REVENUECAT_WEBHOOK_SECRET` (webhook Authorization secret).

## Phase 5 — Point RevenueCat at the live webhook  (needs Phase 1 live)
- [ ] RevenueCat → Integrations → Webhooks → URL = `https://api.dreamvalley.app/api/v1/billing/revenuecat/webhook`; Authorization header = `REVENUECAT_WEBHOOK_SECRET` (same value as Phase 1 `.env`).
- [ ] Send a RevenueCat test event → backend logs show it received + acked.

## Phase 6 — Inject keys into the builds
- [ ] Merge Flutter `iap-revenuecat` → app `main`; build iOS with `--dart-define DV_REVENUECAT_KEY_IOS=<REVENUECAT_IOS_SDK_KEY>`.
- [ ] Merge web `iap-web-paywall` → web `main`; deploy (native paywall consumer + `identifyNative` wiring).

## Phase 7 — App Privacy labels  [guaranteed rejection if skipped]
- [ ] Correct the stale "no data collection" declaration → declare email (for restore) + analytics.

## Phase 8 — Sandbox test → submit → flip flag
- [ ] Sandbox e2e per `TESTFLIGHT_2.0_TEST_PLAN.md` on a real device against the test env with `PAYWALL_NATIVE_ENABLED=true`: purchase → webhook → `entitlements[apple]` → `compute_tier` premium → unlock; plus renewal / cancel / billing-issue / refund / restore.
- [ ] Submit the build for review.
- [ ] On approval: **separately and deliberately** flip prod `PAYWALL_NATIVE_ENABLED=true` (deploy_guard snapshot/verify). Reversible.

---

## Android (fast-follow — blocked on Play KYC)
Same runbook, Play side: merchant/KYC (Phase 0), Play service-account JSON + products + RTDN (Phase 4/5 Google equivalents), `DV_REVENUECAT_KEY_ANDROID`. All the code (webhook `PLAY_STORE`→google mapping, Flutter bridge, web paywall) is already cross-platform — no rebuild, just provisioning.
