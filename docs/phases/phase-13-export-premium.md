# Phase 13 — Export + Premium

**Status:** Not started
**Depends on:** 02, 08
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — Stripe webhook handling, quota logic, PDF generation, and account deletion are all well-documented patterns. Security-sensitive but not novel in reasoning.

## Goal

Ship the money layer: Stripe subscription, free-tier quotas enforced, basic PDF profile export, analytics, account deletion.

## Deliverables

- `web/app/(app)/profile/page.tsx` — settings page (tone default, ayanamsha, linked email, manage subscription, delete account).
- `web/app/(app)/pricing/page.tsx` — pricing and Stripe checkout entry.
- `web/app/api/stripe/checkout/route.ts` — create Stripe Checkout session.
- `web/app/api/stripe/webhook/route.ts` — Stripe webhook: updates `user_profiles.subscription_tier` + `stripe_customer_id`.
- `web/app/api/account/delete/route.ts` — hard-delete the user + cascade rows + scrub Storage.
- `web/app/api/export/route.ts` — `POST /api/export { kind }`. MVP supports `basic_report_pdf`.
- `web/lib/server/exportBasicReport.ts` — renders a PDF from chart snapshot + derived bundles + latest dashboard themes.
- `web/lib/quotas/askQuota.ts` — track + enforce Ask quota for free users.
- `web/lib/analytics/events.ts` — `track(event_name, properties, user_id)`; writes to `analytics_events`.
- `web/middleware.ts` — patch: quota check on `/api/ask` and `/api/daily`.
- `web/supabase/migrations/005_premium.sql` — adds `stripe_customer_id`, `stripe_subscription_id`, `subscription_current_period_end` to `user_profiles`; adds `ask_usage` counter table.

## Specification

### Free / premium matrix

| Feature | Free | Premium |
|---|---|---|
| Profile generation | Yes | Yes |
| Dashboard | Yes | Yes |
| Base chart views (D1 / Bhava / Moon) | Yes | Yes |
| Classical divisional charts + common extras | No | Yes |
| Life areas (4) | Yes | Yes |
| Ask questions | 5 per month | Unlimited |
| Daily prediction | Today + next 7 days | Any date |
| Panchang | Any date | Any date |
| Share cards | Unlimited | Unlimited |
| PDF export | 1 lifetime | Unlimited |
| Tone modes | All three | All three |

Quotas enforced server-side. Client UI reflects remaining count in the top nav.

### Stripe

- Single product: `Astri Premium` monthly + yearly.
- `checkout.session.completed` webhook sets tier + ids.
- `customer.subscription.deleted` / `updated` sync tier + period end.
- Gracefully downgrade to free when period ends; do not block immediately if webhook lag.

### Quota enforcement

`askQuota.check(user_id)`:

- Premium → return `{ allowed: true }`.
- Free → count `ask_messages` where role='user' in the current calendar month; if >= 5, return `{ allowed: false, reason: 'quota_exceeded', upgrade_url: '/pricing' }`.

Middleware wraps `/api/ask` to short-circuit with 402 when quota is hit. UI shows an upgrade prompt in the Ask input area when within 1 question of the limit.

Same pattern for `/api/daily` when user requests a date outside the free window.

### PDF export

Basic report PDF contents:

- Cover: name, birth details (date, time, place, timezone, confidence).
- Summary: Lagna, Moon, Nakshatra, current dasha.
- Base charts: D1, Bhava, Moon (SVGs rendered to bitmap).
- Premium appendix: selected divisional charts used by the user's strongest topic bundles.
- Planetary positions table.
- Current period + transit highlights.
- Top themes and one focus insight.
- 4 life-area headlines (personality, career, wealth, relationships).

Use a React-PDF-based pipeline. One template component. Output to Supabase Storage at `exports/{user_id}/{timestamp}.pdf`. Return signed URL valid for 7 days.

### Account deletion

Hard path. Deletes:

- All rows keyed by `user_id` via cascade.
- Supabase Storage: `exports/{user_id}/*` and any `share-cards/` uploaded by user.
- Auth record (`auth.admin.deleteUser(user_id)` via service role).

Confirm dialog with typed "DELETE" to proceed.

### Analytics events (MVP list)

- `signup`
- `profile_generated` (props: birth_time_confidence)
- `dashboard_viewed`
- `chart_viewed` (props: chart_key)
- `life_area_viewed` (props: topic)
- `ask_submitted` (props: topic, tone, depth)
- `ask_quota_hit`
- `daily_viewed` (props: date_offset_days, tone)
- `panchang_viewed`
- `share_card_created`
- `pricing_viewed`
- `checkout_started`
- `subscription_started`
- `subscription_cancelled`
- `export_downloaded`
- `account_deleted`

Properties never include PII or raw birth data.

### Profile settings page

- Default tone mode (dropdown)
- Default ayanamsha (dropdown — warn that changing recomputes the chart)
- Display name
- Email (read-only, reflects auth)
- Subscription status + "Manage" → Stripe portal link
- Export PDF button
- Danger zone: delete account

## Acceptance criteria

- [ ] Stripe test-mode checkout creates a subscription and flips the user to premium in Supabase via webhook.
- [ ] Free user's 6th Ask in a month is blocked with a 402 and the UI shows upgrade.
- [ ] Free user's attempt to pick a date >7d in future on `/daily` shows upgrade prompt.
- [ ] PDF export produces a readable file with D1, Bhava, and Moon visible.
- [ ] Account deletion removes every row + auth user + storage artifacts for that user.
- [ ] Every MVP analytics event fires on the expected action (verify via `select event_name, count(*) from analytics_events group by event_name`).
- [ ] Typecheck + lint + tests pass.

## Out of scope

- Family plan / multi-seat (post-MVP).
- Refund logic (handle via Stripe dashboard manually).
- One-time report purchases — post-MVP.
- Compatibility / rectification / annual reports — post-MVP.
- Granular per-feature flags (just tier-based gating).

## Verification

1. Stripe test card flow: buy → webhook fires → user becomes premium → Ask is unlimited.
2. Let webhook be delayed 30s — app must not incorrectly block during the delay (treat as premium if `subscription_current_period_end` is in future even before webhook).
3. Delete account — everything gone, can re-signup with same email cleanly.
4. Export PDF for golden profile, confirm D1, Bhava, and Moon render with correct placements.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
