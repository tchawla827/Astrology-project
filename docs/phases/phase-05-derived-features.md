# Phase 05 — Derived Features

**Status:** Done
**Depends on:** 01, 02
**Scope:** M
**Recommended model:** `claude-opus-4-7` — complex domain logic: mapping Vedic chart signals to topic bundles, house strength heuristics, headline signal extraction. Business logic errors silently degrade Ask quality; get it right first time.

## Goal

Precompute the topic bundles and dashboard summary that downstream features (life areas, Ask, daily, export) all consume — so those features never recompute from raw chart data.

## Deliverables

- `web/lib/derived/computeBundles.ts` — pure function: `ChartSnapshot → DerivedFeatureSnapshot.payload`.
- `web/lib/derived/topics/personality.ts`
- `web/lib/derived/topics/career.ts`
- `web/lib/derived/topics/wealth.ts`
- `web/lib/derived/topics/relationships.ts`
- `web/lib/derived/topics/marriage.ts`
- `web/lib/derived/topics/family.ts`
- `web/lib/derived/topics/health.ts`
- `web/lib/derived/topics/education.ts`
- `web/lib/derived/topics/spirituality.ts`
- `web/lib/derived/topics/relocation.ts`
- `web/lib/derived/dashboardSummary.ts`
- `web/lib/derived/timeSensitivity.ts`
- `web/lib/server/generateDerivedFeatures.ts` — loads chart snapshot, runs `computeBundles`, writes `derived_feature_snapshots`.
- `web/app/api/profile/[id]/derived/route.ts` — GET derived snapshot for current user.
- Hook into `generateProfile.ts` (from phase 02): after writing `chart_snapshots`, immediately call `generateDerivedFeatures`. Profile isn't `ready` until both exist.
- `web/tests/derived/computeBundles.test.ts` — golden test: given the golden chart snapshot, produce a stable bundle payload.

## Specification

All bundle shapes are defined in [../data-model.md](../data-model.md) as `TopicBundle`. Per-topic ownership (which charts, houses, planets) is listed in [../llm-layer.md](../llm-layer.md) § Context bundles.

### Bundle build rules

For each topic:

1. Start with `charts_used`, `houses_used`, `planets_used` from the topic's ownership table.
2. For each house:
   - `summary`: one-sentence natural-language description built from template + substituted values (e.g. "10th house in Capricorn, ruled by Saturn placed in the 6th — slow visibility, strong work ethic").
   - `strength`: derived from occupants + aspects + lord placement. Simple heuristic:
     - high: benefic occupant OR lord in own/exaltation + no malefic aspect
     - low: malefic occupant + lord in enemy sign OR 6/8/12
     - medium: otherwise
3. For each planet in the topic's planet list:
   - `role`: classical role label (e.g. "10th lord", "Karaka of career").
   - `summary`: one-sentence interpretation combining sign + house + dignity.
4. `timing`:
   - Current mahadasha lord + antardasha lord from snapshot.
   - `current_trigger_notes`: filter `transits.highlights` to those involving houses/planets in this topic.
5. `headline_signals`: 2–3 short strings — the "bottom line" of this topic.
6. `confidence_note`: string combining bundle-internal confidence (are signals consistent?) with `birth_time_confidence`.

### Dashboard summary

`dashboardSummary.ts` picks:

- `top_themes`: 3 one-line strings. Prefer: (a) one from current dasha, (b) one from a strong natural yoga, (c) one from the user's `onboarding_intent` topic's `headline_signals`.
- `focus_cards`: up to 3 `FocusCard` entries. Each card pairs a strong (or stressed) signal with its `why` metadata — which charts/houses/planets back the card.

### Time sensitivity

`timeSensitivity.ts` returns:

- `overall`: `low | medium | high`.
- Based on Lagna-dependent content share in the bundles (houses 1/4/7/10, lagna lord placements) times `birth_time_confidence`.
- Stored once on the derived snapshot for fast UI checks.

### Versioning

`schema_version = 'derived_v1'`. When the shape or rules change, add `v2` and keep `v1` generators available — recomputation for old users happens lazily on next read.

### Performance

- Bundle computation is pure + fast (ms-range). No engine calls.
- Store as one `jsonb` payload. Do not split into many rows.

## Acceptance criteria

- [x] `generateDerivedFeatures(chart_snapshot_id)` writes a well-formed row in < 200ms.
- [x] Profile generation (phase 02) now produces both `chart_snapshots` AND `derived_feature_snapshots` before flipping to `ready`.
- [x] Dashboard (phase 03) swapped from inline theme logic to reading from derived snapshot. Visual output equivalent or better.
- [x] Golden test snapshot serializes to stable JSON (snapshot test).
- [x] Every topic bundle validates against its Zod schema.
- [x] Typecheck + lint + tests pass.

## Out of scope

- Using bundles in Ask (phase 07).
- Life-area pages (phase 06).
- Regenerating bundles on engine-version bump (that's a phase 14 concern).

## Verification

1. Run onboarding from scratch — confirm both snapshot rows exist at end.
2. `select payload->'topic_bundles'->'career' from derived_feature_snapshots limit 1;` — inspect shape.
3. Dashboard cards now read from the derived snapshot — pull the DB row and confirm it drives what the UI shows.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
