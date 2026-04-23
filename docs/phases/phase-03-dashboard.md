# Phase 03 — Dashboard

**Status:** Done
**Depends on:** 02
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — Server Components, data fetching, card layout. Standard Next.js frontend work.

## Goal

Home screen that makes the user think "this app actually looked at my chart" in the first 3 seconds.

## Deliverables

- `web/app/(app)/dashboard/page.tsx` — dashboard page (Server Component, fetches data).
- `web/components/insights/ProfileSummaryCard.tsx` — Lagna, Moon, Nakshatra+pada.
- `web/components/insights/DashaCard.tsx` — current Mahadasha + Antardasha with remaining time.
- `web/components/insights/TransitCard.tsx` — top 2 transit highlights from the snapshot.
- `web/components/insights/ThemesCard.tsx` — 3 dominant themes (hand-tuned rules in phase 03, upgraded to derived bundle in phase 05).
- `web/components/insights/FocusCard.tsx` — a single insight card with a "Why?" disclosure.
- `web/components/insights/AskCtaCard.tsx` — CTA to `/ask` with 3 rotating starter questions.
- `web/components/common/BirthTimeBanner.tsx` — shown when `birth_time_confidence != 'exact'`.
- `web/lib/server/loadDashboard.ts` — reads `chart_snapshots` + any derived snapshot, returns a typed `DashboardViewModel`.
- `web/app/api/profile/[id]/summary/route.ts` — GET endpoint returning the dashboard view model.

## Specification

### Data flow

1. Server Component calls `loadDashboard(user_id)`:
   - Finds the user's `birth_profiles` (pick the most recent for now — multi-profile is post-MVP).
   - Loads the latest `chart_snapshots` row.
   - If `derived_feature_snapshots` exists (phase 05 onwards), use it; else fall back to inline computation from the chart snapshot.
2. Builds a `DashboardViewModel` matching [../data-model.md](../data-model.md) `DashboardSummary` + extra fields (dasha, transit highlights).
3. Renders Server Components that receive the view model as props.

### Theme extraction (phase 03 fallback, replaced by phase 05)

Until derived bundles exist, compute 3 themes cheaply from the snapshot:

- **Theme 1 — tempo** — based on current Mahadasha lord: Saturn → "Work over recognition"; Jupiter → "Growth and expansion"; Sun → "Visibility, ego tests"; etc. Simple lookup table in `web/lib/insights/themes.ts`.
- **Theme 2 — emotional weather** — Moon sign element (fire/earth/air/water) + any current transit aspecting natal Moon.
- **Theme 3 — personality edge** — Lagna sign's classic one-liner.

Replace with derived bundles once phase 05 ships; keep the function signature stable.

### Focus card

Picks one item from the `transits.highlights` array and renders it with a "Why?" button that opens a shadcn `Dialog` showing the chart/house/planet involved. This prototypes the full transparency panel that phase 09 will generalize.

### Onboarding intent

If `user_profiles.onboarding_intent` is set, shuffle the cards so the intent-relevant one (career / marriage / etc.) appears first under the top row.

### Loading + empty states

- If profile status is `processing`, render a shell with shadcn `Skeleton`s and poll `/api/profile/[id]` until ready.
- If `error`, offer a "regenerate" button that hits `POST /api/profile/[id]/regenerate` (simple endpoint that resets status and re-runs `generateProfile`).

### Birth-time banner

If `birth_time_confidence != 'exact'`, render a muted banner at the top of the dashboard:

> Time-sensitive insights (Lagna, Navamsa, dasha) use your stated confidence. Edit your birth details to recompute.

## Acceptance criteria

- [x] `/dashboard` loads in under 1 second for a profile with a ready snapshot.
- [x] Every card renders real data from `chart_snapshots.payload`.
- [x] "Why?" on Focus Card shows chart/house/planet names pulled from the snapshot (not hardcoded).
- [x] Birth-time banner appears for non-exact profiles and hides for exact ones.
- [x] Loading state is never blank — always skeleton + status text.
- [x] Ask CTA card rotates 3 starter questions server-side based on the chart (e.g. if 10th house is stressed, show "Why has my career felt stuck?").
- [x] Typecheck + lint + component tests pass.

## Out of scope

- Chart viewer (phase 04).
- Life-area detail pages (phase 06).
- Ask functionality (phases 07–08).
- Daily prediction strip (phase 10).
- Panchang strip (phase 11).

## Verification

1. Sign up → finish onboarding → land on `/dashboard` showing 6 cards populated with real chart data.
2. Manually set `birth_time_confidence = 'approximate'` in DB — refresh, banner appears.
3. Set `birth_profiles.status = 'error'` — refresh, regenerate path works.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).

