# Topic Evidence Layer

## Understanding Summary

- Astri should improve next through power-user depth and usability polish.
- The first product slice is deeper career analysis and more grounded career Ask answers.
- The product should lead with a direct verdict, then show moderately technical evidence.
- Evidence should cite houses, lords, planets, dashas, transits, chart support, confidence, and caveats.
- The LLM should explain supplied evidence, not infer freely from full chart data.
- The implementation should reuse existing derived-feature snapshots and life-area/Ask flows.

## Assumptions

- Performance stays within the current derived-feature pattern: compute once, store structurally, render/read cheaply.
- Early product scale is the target; no new service or asynchronous job system is required for this slice.
- Birth data remains private and full profiles should not be sent to the LLM.
- Missing or mixed evidence should be surfaced as lower confidence instead of hidden by prose.
- Career becomes the reference vertical before expanding the same model to marriage, wealth, health, relocation, and spirituality.

## Final Design

Add a versioned topic evidence structure to the derived payload. The first version focuses on career and is consumed by both the career life-area page and Ask context.

The career evidence model should include:

- `verdict`: a direct career reading.
- `primary_factors`: houses, lords, planets, dignity, aspects, yogas, D10 relevance.
- `timing_factors`: active mahadasha, antardasha, transit triggers, upcoming shift.
- `supporting_factors`: signals that support growth, authority, skill, visibility, stability.
- `friction_factors`: blockers, afflictions, delays, contradictions, weak links.
- `confidence`: high/medium/low with reasons.
- `birth_time_sensitivity`: caveat when D10, houses, or Lagna-sensitive factors are unstable.
- `citations`: compact chart, house, and planet references usable by UI and LLM validation.

## UX Direction

The career page should use this structure as:

1. Verdict header.
2. Why this verdict.
3. Strengths vs frictions.
4. Current timing.
5. Ask-from-this-evidence prompts.
6. Expandable technical detail.

Ask should include the same evidence in career contexts and instruct the provider to answer from it.

## Decision Log

- Chosen approach: shared evidence model.
- First vertical: career.
- Evidence owner: derived-feature layer.
- LLM role: explain and answer from supplied evidence.
- Default answer style: verdict first, moderately technical support in the main body.
- Expansion path: apply this evidence shape to other life areas after career is validated.
