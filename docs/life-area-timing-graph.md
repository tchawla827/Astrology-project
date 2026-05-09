# Life-Area Timing Graph

## Understanding Summary

- Build a deterministic timing dashboard for life areas.
- Cover career, wealth, relationships, marriage, family, health, education, spirituality, and relocation.
- Show a monthly year overview first, with daily drilldown for a selected month.
- Plot support, pressure, volatility, and confidence as separate 0-100 lines.
- Monthly values must aggregate deterministic daily values.
- The feature is for planning first, with evidence available for understanding.
- Accuracy is the highest priority; LLMs must not generate scores.

## Assumptions

- Timing scores are conditions, not guaranteed events.
- Server-side computation may be expensive, so score versions and cache keys are required before production scale.
- Existing chart snapshots, derived topic bundles/evidence, dasha timelines, and transit calls are the source inputs.
- Birth data and chart payloads stay server-side.
- Initial implementation can reuse existing transit caching and add persisted timing-series caching later if needed.

## Final Design

Add a deterministic life-area timing series pipeline in `web/`.

Each life-area day point has:

- `support`
- `pressure`
- `volatility`
- `confidence`
- `phase`
- `top_factors`

Each monthly point aggregates daily points:

- support: mean
- pressure: mean
- volatility: max-weighted mean
- confidence: mean capped by birth-time confidence
- top factors: highest-impact deterministic factors for that month

The UI should show one life area by default, allow metric toggles, and let the user drill from a month into day-level detail.

## Decision Log

- Chosen approach: deterministic life-area timing engine.
- Rejected approach: LLM-generated graph scores.
- Resolution: monthly year overview plus daily month drilldown.
- Scope: nine life areas, excluding personality from the first graph.
- Accuracy rule: every high support/pressure/volatility score needs deterministic top factors.
- UX rule: label the graph as timing conditions, not guaranteed outcomes.
