# Phase 02 — Profile Intake

**Status:** Done
**Depends on:** 00, 01
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — standard web dev: form validation, geocoding, Supabase writes, polling flow.

## Goal

User signs up, enters birth details, and lands on a placeholder dashboard with a ready `ChartSnapshot` stored in Supabase.

## Deliverables

- `web/app/(onboarding)/welcome/page.tsx` — intro screen.
- `web/app/(onboarding)/intent/page.tsx` — intent selection (know-self / career / marriage / health / spirituality / full-chart).
- `web/app/(onboarding)/birth-details/page.tsx` — intake form.
- `web/app/(onboarding)/confidence/page.tsx` — exact / approximate / unknown.
- `web/app/(onboarding)/generating/page.tsx` — animated loading screen that polls `birth_profiles.status` every 750ms.
- `web/components/onboarding/PlaceAutocomplete.tsx` — Mapbox-backed place picker with timezone resolution.
- `web/components/onboarding/TimeInput.tsx` — 12h/24h toggle, seconds optional.
- `web/app/api/profile/route.ts` — `POST /api/profile`: validate, insert row, enqueue generation.
- `web/app/api/profile/[id]/route.ts` — `GET /api/profile/[id]` for status polling.
- `web/lib/server/generateProfile.ts` — server function that calls `astro.profile(...)`, stores `chart_snapshots` row, flips `birth_profiles.status` to `ready` or `error`.
- `web/lib/server/resolvePlace.ts` — Mapbox place → `{ lat, lon, timezone }`. Uses `tz-lookup` or Mapbox tz API for IANA timezone from coordinates.
- `web/tests/api/profile.test.ts` — integration test against a test Supabase project.
- `web/tests/components/PlaceAutocomplete.test.tsx` — component test with mocked Mapbox responses.

## Specification

### Form fields

Per [../data-model.md](../data-model.md) `BirthProfile`:

- `name` (required, 1–80 chars)
- `birth_date` (required, ISO date, not in future)
- `birth_time` (required if confidence != 'unknown', HH:mm:ss)
- `birth_time_confidence` (required enum)
- `birth_place_text` (required, resolves via Mapbox)
- `ayanamsha` (select, default lahiri)

Time input supports both 12h (with AM/PM) and 24h; store as 24h.

If confidence = unknown, skip the time field but force `birth_time = '12:00:00'` server-side and mark the chart snapshot with `birth_time_confidence = 'unknown'`. All time-sensitive downstream features (Lagna, Bhava, divisional charts, dasha) render with a "low confidence" banner (phases 03, 09).

### Place autocomplete

Mapbox Geocoding API. Store:

- `birth_place_text` — user-selected label (e.g. "Panipat, Haryana, India").
- `latitude`, `longitude` — from result.
- `timezone` — resolved from coordinates using `tz-lookup` (pure JS, no API call).

Show a confidence warning if Mapbox returns only a country-level match.

### Generation flow

1. User submits. Server Action validates with Zod.
2. Insert `birth_profiles` row, `status = 'processing'`.
3. Enqueue generation: for MVP, run inline in the route handler inside a non-blocking promise. Return `{ birth_profile_id }` immediately.
4. `generateProfile.ts` calls `astro.profile(input)`, writes `chart_snapshots` row (full payload as `jsonb`), updates `birth_profiles.status = 'ready'`.
5. On error: `status = 'error'`, log to analytics.

Client polls `GET /api/profile/[id]` on `/generating` every 750ms. On `ready`, router.push to `/dashboard`. On `error`, show retry.

### Intent

Store intent on `user_profiles` as a new column `onboarding_intent text` (add via migration in this phase). Dashboard uses it to order focus cards.

### Migration

`web/supabase/migrations/002_intake.sql`:

- Add `onboarding_intent text` to `user_profiles`.
- No other schema changes — tables already exist from phase 00.

## Acceptance criteria

- [ ] A signed-in user can complete the full onboarding flow and land on `/dashboard` with a `chart_snapshots` row persisted.
- [ ] Invalid submissions (future birth date, missing place) show inline validation errors.
- [ ] "Unknown birth time" path works end-to-end and the resulting chart is flagged appropriately.
- [ ] Place autocomplete resolves lat/lon/timezone correctly for: Panipat (India), New York (US), London (UK), Sydney (Australia).
- [ ] `GET /api/profile/[id]` returns 404 for profiles not owned by the caller.
- [ ] `pnpm test` passes, including the API integration test.
- [ ] Typecheck + lint pass.

## Out of scope

- Dashboard content (phase 03).
- Chart viewing (phase 04).
- Multi-profile (partner/family) — save for post-MVP. Schema supports it already.
- Editing an existing profile (post-MVP; easy to add later).

## Verification

1. Sign up fresh. Walk through onboarding. Confirm redirected to `/dashboard`.
2. Check Supabase: `select * from birth_profiles`, `select payload->'summary' from chart_snapshots`.
3. Try intentionally bad place ("asdfasdf") — graceful error.
4. Try unknown-birth-time path — chart generated, status = ready, confidence flag stored.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
