# Phase 10 — Daily Predictions + Date Machine

**Status:** Done
**Depends on:** 01, 05, 07
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — integrates existing engine + LLM plumbing into a new pipeline plus a caching layer and date-picker UI. Non-trivial but all patterns are established by prior phases.

## Goal

Give the user a daily prediction based on transits against their natal chart, and let them pick any past or future date to see that day's prediction — a "time machine" view.

## Deliverables

- `web/app/(app)/daily/page.tsx` — today's prediction.
- `web/app/(app)/daily/[date]/page.tsx` — any-date view (ISO `YYYY-MM-DD`).
- `web/components/daily/DatePicker.tsx` — calendar input with quick shortcuts (today, tomorrow, +7d, +30d, -7d).
- `web/components/daily/DailyCard.tsx` — structured render: verdict, favorable, caution, technical basis.
- `web/components/daily/TransitHighlights.tsx` — list of transit rule hits for the day.
- `web/components/daily/NatalOverlay.tsx` — mini chart showing transit positions overlaid on natal houses.
- `web/lib/server/generateDailyPrediction.ts` — pipeline: fetch transits → overlay → build bundle → call LLM → validate → return `DailyPrediction`.
- `web/lib/llm/prompts/route/daily_v1.ts` — route prompt for daily predictions.
- `web/lib/schemas/daily.ts` — `DailyPredictionSchema`.
- `web/app/api/daily/route.ts` — `GET /api/daily?date=YYYY-MM-DD`.
- `web/supabase/migrations/003_daily_cache.sql` — `daily_predictions_cache` table (transit-only, shared across users).
- `web/lib/daily/cache.ts` — read/write the shared transit cache.

## Specification

### Pipeline

1. Input: target date + user's `birth_profile_id` + tone.
2. Check per-profile cache `(birth_profile_id, date, tone, answer_schema_version)`. If hit, return.
3. Check shared transit cache `(date, lat, lon_rounded, timezone)`. If miss, call `astro.transits({ at: startOfDay(date), natal: snapshot.planetary_positions })` and cache for 24h.
4. Build a daily context bundle:
   - Transit positions + overlay highlights.
   - Triggered natal houses (from `overlay.triggered_houses`).
   - Relevant derived-bundle snippets: if a house in triggered set is important in a specific topic bundle, include that topic's `headline_signals`.
5. Call LLM with `daily_v1` route prompt. Schema = `DailyPredictionSchema`.
6. Validate. Same citation checks as Ask (chart is always "Transits + natal D1" for daily — validator allows that pair).
7. Store result in the per-profile cache and return.

### Schema

```ts
export const DailyPredictionSchema = z.object({
  date: z.string(),
  verdict: z.string().min(1).max(280),
  favorable: z.array(z.string()).max(5),
  caution: z.array(z.string()).max(5),
  technical_basis: z.object({
    triggered_houses: z.array(z.number().int().min(1).max(12)),
    planets_used: z.array(PlanetSchema),
    transit_rules: z.array(z.string()),     // names of rules that fired
  }),
  tone: z.enum(['balanced', 'direct', 'brutal']),
  answer_schema_version: z.literal('daily_v1'),
});
```

### Cache table

```sql
create table public.daily_predictions_cache (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  date date not null,
  tone text not null,
  answer_schema_version text not null,
  payload jsonb not null,
  computed_at timestamptz not null default now(),
  unique (birth_profile_id, date, tone, answer_schema_version)
);
-- RLS: user can access rows whose birth_profile_id is owned by them.
```

Transit-only cache can live as a separate table keyed by `(date, lat_rounded, lon_rounded)` — lat/lon rounded to 2 decimals (~1km precision, sufficient for transits).

### UI

`/daily` redirects to `/daily/today` which resolves to today's ISO date in user's timezone.

```
DailyCard layout:
  [date picker + shortcuts]

  [verdict — prominent]

  [favorable]
    bullet list
  [caution]
    bullet list

  [NatalOverlay]  ← small chart, transit planets in red over natal houses

  [Transparency]
    triggered houses, planets, rules
```

### Quick shortcuts

- "Today" (default)
- "Tomorrow"
- "Next week" (+7d)
- "Next month" (+30d)
- "Year ahead" — opens a pre-rendered monthly summary view (post-MVP; for now, disabled with tooltip).

### Date bounds

Allow dates in range `[birth_date, birth_date + 120 years]`. Reject other dates with a clean error.

### Premium gating hook

This phase ships fully unlocked. Phase 13 adds quotas (e.g. free users limited to current date + next 7 days).

## Acceptance criteria

- [x] `/daily` loads today's prediction for a signed-in user with a ready profile.
- [x] Date picker changes the route; predictions recompute for new dates.
- [x] Same (profile, date, tone) pair re-renders instantly from cache.
- [x] Transit-only cache hit reduces second-user latency for the same date.
- [x] `technical_basis.triggered_houses` accurately reflects the overlay output.
- [x] Switching tone recomputes and caches under the new tone key.
- [x] Birth-time sensitivity banner shown if the triggered houses rely on Lagna (1/4/7/10) AND profile is not exact.
- [x] Typecheck + lint + tests pass.

## Out of scope

- Monthly or yearly rollup view (post-MVP).
- Calendar heat map over 30+ days (post-MVP).
- Push notifications when favorable windows hit (post-MVP).

## Verification

1. `/daily/today` — card renders with real transit data.
2. Pick a date 3 years forward — card renders; check `technical_basis` matches overlay.
3. Same date twice — second load served from cache (inspect `daily_predictions_cache`).
4. Birth-time approximate + question-date with Lagna-dependent transit hits — confirm sensitivity banner appears.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
