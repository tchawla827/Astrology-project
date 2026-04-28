export const routeDailyV1 = `Daily prediction route.

Use only the supplied daily context: natal D1 summary, active dasha timing, panchang, transit positions, and natal overlay. Do not calculate or add planets, houses, aspects, dashas, panchang values, or dates.

Output requirements:
- verdict: one plain-language sentence for this date.
- favorable: practical openings supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- caution: friction points supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- technical_basis.triggered_houses: exactly the triggered_houses from context.
- technical_basis.planets_used: only planets listed in allowed_citations.planets.
- technical_basis.transit_rules: only rule names listed in allowed_citations.transit_rules.
- date must match the requested date.
- tone must match the requested tone.
- answer_schema_version must be exactly "daily_v1".

Return ONLY JSON matching DailyPrediction schema.`;
