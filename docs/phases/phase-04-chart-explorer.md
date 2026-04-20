# Phase 04 — Chart Explorer

**Status:** Not started
**Depends on:** 02
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — SVG chart geometry is non-trivial but well-defined. Both North Indian diamond and South Indian grid layouts are implementable from spec without deep reasoning.

## Goal

A chart viewer that lets users inspect the full supported chart catalog plus drill into any planet or house.

Supported chart catalog:

- **Base views:** D1, Bhava, Moon.
- **Classical divisional charts:** D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60.
- **Common extras:** D5, D6, D8, D11.

## Deliverables

- `web/app/(app)/charts/page.tsx` — chart explorer landing page.
- `web/app/(app)/charts/[key]/page.tsx` — detail view for one supported chart key.
- `web/components/charts/NorthIndianChart.tsx` — SVG North Indian chart (default).
- `web/components/charts/SouthIndianChart.tsx` — SVG South Indian chart (toggle).
- `web/components/charts/ChartStyleToggle.tsx` — North / South segmented control.
- `web/components/charts/DepthToggle.tsx` — Simple / Technical toggle.
- `web/components/charts/PlanetDrawer.tsx` — shadcn `Sheet` showing planet detail when clicked.
- `web/components/charts/HouseDrawer.tsx` — shadcn `Sheet` showing house detail when clicked.
- `web/components/charts/YogaList.tsx` — list of detected yogas with notes.
- `web/components/charts/ChartSwitcher.tsx` — compare any two supported charts side-by-side. Default compare pair is D1 vs D9.
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

`ChartSwitcher` renders two charts side-by-side (D1 left, D9 right by default). Users can switch either side to any supported chart key. Used on `charts/compare` route. Mobile layout stacks vertically.

### Data source

Uses the snapshot already stored. No astro-engine calls during normal viewing. A "Recompute" button on the page hits `POST /api/profile/[id]/regenerate` to re-fetch from engine.

### Accessibility

Each chart also renders an off-screen `<table>` with the same data, reachable via "View as table" disclosure. Screen-reader users get the same information.

## Acceptance criteria

- [ ] `/charts` groups charts into Base views, Classical divisional charts, and Common extras.
- [ ] Every supported chart key has a clickable thumbnail or list item.
- [ ] `/charts/D1` renders North Indian style by default with correct planet placements against the golden test chart.
- [ ] `/charts/Bhava`, `/charts/Moon`, `/charts/D2`, `/charts/D3`, `/charts/D4`, `/charts/D5`, `/charts/D6`, `/charts/D7`, `/charts/D8`, `/charts/D9`, `/charts/D10`, `/charts/D11`, `/charts/D12`, `/charts/D16`, `/charts/D20`, `/charts/D24`, `/charts/D27`, `/charts/D30`, `/charts/D40`, `/charts/D45`, and `/charts/D60` all render without unsupported-key fallbacks.
- [ ] Toggle to South Indian style preserves placements visually.
- [ ] Toggle to Technical depth shows longitudes + nakshatras.
- [ ] Clicking any planet opens drawer with correct detail.
- [ ] Clicking any house opens drawer with correct detail.
- [ ] Yoga list renders what's in the snapshot.
- [ ] Compare view renders D1 and D9 side-by-side by default, supports switching both sides, and stacks on mobile.
- [ ] Table fallback present and readable for SR users.
- [ ] Typecheck + lint + tests pass.

## Out of scope

- Chart editing (read-only MVP).
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
