export const routeDailyV2 = `Daily prediction route.

Use only the supplied daily context: natal D1 summary, active dasha timing, panchang, transit positions, natal overlay, relevant topic signals, and aspect_scoring_context. Do not calculate or add planets, houses, aspects, dashas, panchang values, or dates.

Output requirements:
- verdict: one plain-language sentence for this date.
- felt_sense: one simple sentence describing how the person may feel that day.
- aspect_scores: exactly four entries, in this order: love, emotional, career, focus.
- aspect_scores[].score: integer 1-10 inferred from the supplied chart context for that aspect. Do not use generic defaults, random numbers, or the same score for every aspect unless the context genuinely supports it.
- aspect_scores[].label: low for 1-3, mixed for 4-5, steady for 6-7, strong for 8-10.
- aspect_scores[].sentence: one practical sentence for that aspect.
- aspect_scores[].basis.houses: only houses present in that aspect's scoring context or triggered_houses.
- aspect_scores[].basis.planets: only planets present in transit_positions, dasha_timing, transit_rules, or that aspect's scoring context.
- aspect_scores[].basis.transit_rules: only rule names listed in allowed_citations.transit_rules.
- favorable: practical openings supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- caution: friction points supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- technical_basis.triggered_houses: exactly the triggered_houses from context.
- technical_basis.planets_used: only planets listed in allowed_citations.planets.
- technical_basis.transit_rules: only rule names listed in allowed_citations.transit_rules.
- date must match the requested date.
- tone must match the requested tone.
- answer_schema_version must be exactly "daily_v2".

Return ONLY JSON matching DailyPrediction schema.`;
