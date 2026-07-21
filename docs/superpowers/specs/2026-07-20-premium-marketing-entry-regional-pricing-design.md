# Premium Marketing Entry and Regional Web Pricing

## Goal

Make the web Premium purchase path obvious and complete. A visitor should be able to discover Premium near the top of the marketing homepage, compare Monthly and Annual plans, complete onboarding if necessary, and reach Stripe Checkout without looping back to the homepage.

## Scope

- Add a prominent `Get Premium` action near the top of the public marketing homepage.
- Keep the action absent from native iOS and Android webviews.
- Make Monthly and Annual plans equally discoverable on `/pricing`, with Annual visually recommended.
- Present India pricing as ₹500/month and ₹4,000/year.
- Present rest-of-world pricing as $6/month and $40/year.
- Display `10% web discount` on both paid plans.
- Preserve the seven-day trial and existing Stripe entitlement/webhook flow.
- Carry an anonymous visitor's selected plan through onboarding and back to checkout.

## Marketing Homepage

The hero will retain its existing primary free-listening action. A visually prominent secondary `Get Premium` button will appear alongside the hero actions and link to `/pricing`. The existing Premium section near the bottom remains as a second conversion opportunity.

Both Premium entry points render only when `nativeRequest` is false. Native app users continue through RevenueCat and StoreKit/Play Billing rather than an external web-purchase prompt.

## Pricing Page

The page will show two paid plan choices rather than presenting Monthly as a small secondary link:

- Monthly: ₹500/month in India or $6/month elsewhere.
- Annual, recommended: ₹4,000/year in India or $40/year elsewhere.

Both options display a `10% web discount` label. Annual remains the visually recommended default, but neither plan is hidden.

The initial display region is inferred from browser locale and time zone. A visible India/Rest of world switch lets the visitor correct the display. Stripe Checkout remains authoritative for the final currency and amount, using the manually configured INR and USD currency options on the existing recurring Price IDs.

## Authentication and Checkout Flow

For an authenticated visitor, selecting a plan calls the existing Stripe checkout endpoint with `monthly` or `annual` and opens the returned Checkout URL.

For an anonymous visitor, selecting a plan stores a short-lived checkout intent and routes into the existing onboarding flow. After onboarding creates or restores the account, the visitor returns to `/pricing`, the selected plan is restored, and checkout starts only after a deliberate final button press. This avoids surprise redirects and removes the current `/pricing` → `/` loop.

The existing success, cancellation, webhook, entitlement, and customer-portal flows remain unchanged.

## Regional Pricing

The existing Stripe Monthly and Annual Price IDs remain in use. Each Price supports USD as its default currency and the fixed INR amount configured in Stripe. Checkout automatically chooses a supported local currency based on the customer location; the application does not create duplicate products, coupons, or client-controlled charge amounts.

The regional switch changes website presentation only. It never sends an arbitrary amount or currency to the backend, preventing client-side price manipulation.

## Failure Handling

- If region inference is unavailable, default to rest-of-world pricing and keep the manual switch visible.
- If subscription status cannot load, keep plan selection available and surface checkout errors inline.
- If onboarding cannot preserve the plan, return to `/pricing` without auto-purchasing and keep Annual selected.
- If Stripe cannot create a session, preserve the selected plan and show a retry action.

## Analytics

Track the Premium hero click, pricing-page region switch, Monthly selection, Annual selection, onboarding handoff, and checkout start. No payment data is added to analytics events.

## Verification

- Confirm the hero Premium action renders on the public website and is absent from native requests.
- Confirm Monthly and Annual are independently selectable on desktop and mobile.
- Confirm India and rest-of-world displays use the approved amounts and labels.
- Confirm anonymous plan selection survives onboarding without a homepage loop.
- Confirm authenticated Monthly and Annual selections call the correct existing checkout plan.
- Confirm Stripe Checkout presents INR for an India test location and USD for a rest-of-world test location.
- Confirm purchase success still activates Premium through the existing webhook flow.
