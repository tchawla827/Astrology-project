# Phase 04 — Chart Explorer

**Status:** Not started
**Depends on:** 02
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — SVG chart geometry is non-trivial but well-defined. Both North Indian diamond and South Indian grid layouts are implementable from spec without deep reasoning.

## Goal

A chart viewer that lets users inspect their D1, D9, and Moon charts plus drill into any planet or house.

## Deliverables

- `web/app/(app)/charts/page.tsx` — chart explorer landing page.
- `web/app/(app)/charts/[key]/page.tsx` — detail view for one chart (key in `D1 | D9 | Moon`).
- `web/components/charts/NorthIndianChart.tsx` — SVG North Indian chart (default).
- `web/components/charts/SouthIndianChart.tsx` — SVG South Indian chart (toggle).
- `web/components/charts/ChartStyleToggle.tsx` — North / South segmented control.
- `web/components/charts/DepthToggle.tsx` — Simple / Technical toggle.
- `web/components/charts/PlanetDrawer.tsx` — shadcn `Sheet` showing planet detail when clicked.
- `web/components/charts/HouseDrawer.tsx` — shadcn `Sheet` showing house detail when clicked.
- `web/components/charts/YogaList.tsx` — list of detected yogas with notes.
- `web/components/charts/ChartSwitcher.tsx` — compare D1 vs D9 side-by-side.
- `web/lib/charts/renderChart.ts` — pure function: `ChartSnapshot` + key → SVG coordinates map.
- `web/app/api/profile/[id]/charts/[key]/route.ts` — GET one chart from stored snapshot.

## Specification

### Chart rendering

SVG-based. Two styles:

- **North Indian (default)**: diamond with 4 corner triangles + 4 side triangles + central diamond. Fixed houses (1 top-middle, counterclockwise).
- **South Indian**: 4x4 grid, fixed signs (Aries top-left), planets placed in their sign cells.

`renderChart(snapshot, key)` returns a position map: `{ houseIndex: Position, planetPlacements: Array<{planet, position}> }`. Components render that map into SVG.

Sign and house labels always visible. Planet abbreviations standard: Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke. Retrograde shown with `Me(R)`. Combustion shown with a small red dot.

### Depth toggle

- **Simple**: signs, house numbers, planets.
- **Technical**: add longitudes, nakshatra+pada, dignity, retrograde/combustion, house lord.

Pure presentation — both views read the same snapshot.

### Drawers

Clicking a planet opens `PlanetDrawer`:

- Placement (sign, house, longitude, nakshatra+pada).
- Dignity.
- Retrograde, combust flags.
- Aspects cast + aspects received.
- Which yogas involve this planet.

Clicking a house opens `HouseDrawer`:

- Sign, lord, lord's placement (sign + house).
- Planets occupying the house.
- Aspects into the house.
- Classical house significations (one-line per house, from a lookup table `web/lib/charts/houseMeanings.ts`).

### Compare view

`ChartSwitcher` renders two charts side-by-side (D1 left, D9 right by default). Used on `charts/compare` route. Mobile layout stacks vertically.

### Data source

Uses the snapshot already stored. No astro-engine calls during normal viewing. A "Recompute" button on the page hits `POST /api/profile/[id]/regenerate` to re-fetch from engine.

### Accessibility

Each chart also renders an off-screen `<table>` with the same data, reachable via "View as table" disclosure. Screen-reader users get the same information.

## Acceptance criteria

- [ ] `/charts` shows 3 chart thumbnails (D1, D9, Moon) each clickable.
- [ ] `/charts/D1` renders North Indian style by default with correct planet placements against the golden test chart.
- [ ] Toggle to South Indian style preserves placements visually.
- [ ] Toggle to Technical depth shows longitudes + nakshatras.
- [ ] Clicking any planet opens drawer with correct detail.
- [ ] Clicking any house opens drawer with correct detail.
- [ ] Yoga list renders what's in the snapshot.
- [ ] Compare view renders D1 and D9 side-by-side on desktop, stacked on mobile.
- [ ] Table fallback present and readable for SR users.
- [ ] Typecheck + lint + tests pass.

## Out of scope

- D10, D7, D12, D60 — post-MVP (engine already supports adding, but UI doesn't surface).
- Editing a chart (read-only MVP).
- Transit overlays on charts (phase 10 handles via a different lens).
- Aspect grid visualization (post-MVP — drawer copy is enough).

## Verification

1. Navigate to `/charts/D1` for the golden test profile. Eyeball placements against JHora output.
2. Toggle chart style + depth — rerender stays correct.
3. Click a planet, click a house — drawers populate correctly.
4. Mobile view: charts still legible at 360px width; drawer becomes full-height.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
