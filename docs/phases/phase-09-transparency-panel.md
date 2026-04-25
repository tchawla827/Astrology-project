# Phase 09 — Transparency Panel

**Status:** Done
**Depends on:** 08
**Scope:** S
**Recommended model:** `claude-haiku-4-5-20251001` — reads existing `technical_basis` data and renders it into a disclosure panel. Well-defined inputs and outputs, small scope.

## Goal

"Why this answer?" — a dedicated panel that shows the charts, houses, planets, timing, and birth-time sensitivity that backed every Ask answer. This is the feature that makes the app feel like a serious system rather than a chatbot.

## Deliverables

- `web/components/ask/TransparencyPanel.tsx` — expandable panel below each `AnswerCard`.
- `web/components/ask/FactorChip.tsx` — reusable chip showing a chart/house/planet with hover tooltip.
- `web/components/ask/MiniChartThumbnail.tsx` — small SVG chart thumbnail reused from phase 04 rendering.
- `web/components/ask/BirthTimeSensitivityNote.tsx` — warning block when birth-time sensitivity is high.
- `web/lib/ask/transparency.ts` — builds transparency view model from `AskAnswer.technical_basis` + the context bundle that produced the answer.
- `web/app/api/ask/messages/[id]/transparency/route.ts` — GET full transparency view model for a stored message.

## Specification

### Source of truth

Transparency is already inside `AskAnswer.technical_basis` and the `context_bundle` that was used. This phase only surfaces that data. No new LLM calls.

To rebuild a view model from a stored answer:

1. Load `ask_messages` row (includes `content_structured` with `technical_basis`, and `llm_metadata.context_bundle_type`).
2. Load the `derived_feature_snapshots` row that was current at the time (match by `schema_version` in metadata — if no match, surface a "bundle outdated" note).
3. For each item in `technical_basis.charts_used`: look up chart from `chart_snapshots.payload.charts[key]` and build a thumbnail.
4. For each house in `technical_basis.houses_used`: look up that house's summary from the bundle.
5. For each planet in `technical_basis.planets_used`: look up its role + summary from the bundle.
6. Compute birth-time sensitivity: if `classification.birth_time_sensitive` (store this during phase 07 on the message) AND `birth_profiles.birth_time_confidence != 'exact'`, render the sensitivity note.

### Panel layout

```
[Show reasoning]  ← closed, muted
────────────────────────────────────────
▼ Why this answer

Based on:

[Charts]
  D1  D10                           ← FactorChip row (clickable → /charts/D1)

[Houses]
  10th: work / career               ← FactorChip with tooltip = bundle.houses[10].summary
  11th: gains / networks

[Planets]
  Saturn — 10th lord: slow but durable results
  Sun — karaka of role & visibility: stressed but grounded

[Timing]
  Current: Saturn Mahadasha + Mercury Antardasha
  Transit: Saturn over natal 10th house

[Birth-time sensitivity]
  This answer depends on your ascendant. Your birth time is "approximate" —
  treat timing with caution. Edit your profile to recompute.

[Provider]
  gemini • model • prompt_v1
```

The Provider row is subtle, one line, bottom-muted. Good for trust + debugging.

### Chart thumbnail click

Clicking a chart chip navigates to `/charts/{key}`. A subtle transition is fine; don't overbuild.

### Visual weight

Panel stays collapsed by default. Expanded panel is visually distinct (muted background, monospace for factor names) to signal "this is the machinery, not the answer."

### Integrate into AnswerCard

`AnswerCard` from phase 08 renders `TransparencyPanel` inside its disclosure slot. If user toggles "Show reasoning" on/off globally in `/profile` settings later, that's a post-MVP preference — for MVP the panel is always available, collapsed by default.

## Acceptance criteria

- [x] Every AnswerCard has a working "Show reasoning" toggle.
- [x] Expanded panel lists every chart/house/planet in `technical_basis` with chip styling.
- [x] Clicking a chart chip navigates to that chart's explorer page.
- [x] House tooltips display the bundle's house summary text.
- [x] Planet rows show role + bundle summary (not raw AskAnswer text).
- [x] Birth-time sensitivity note appears for sensitive questions with non-exact times, and only then.
- [x] For a message whose bundle is on an older `schema_version`, a muted "analysis is based on an older bundle — recompute profile to refresh" is shown.
- [x] Typecheck + lint + component tests pass.

## Out of scope

- Rendering full charts inline (thumbnails only — detail is on `/charts/{key}`).
- Editing or re-asking from within the panel.
- Sharing the transparency panel as part of a share card (phase 12 decides whether to include).

## Verification

1. Ask a career question. Expand transparency. Click D10 chip → lands on `/charts/D10` (if key exists; otherwise gracefully falls back).
2. On an approximate-birth-time profile, ask a Lagna-dependent question. Confirm birth-time sensitivity note is visible.
3. On an exact-birth-time profile, ask the same question. Note is hidden.
4. Inspect stored `ask_messages.content_structured.technical_basis` — confirm the panel's data exactly mirrors it.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
