export const routeDailyV1 = `Daily prediction route.

Use only the supplied transit context and natal D1 overlay. Do not calculate or add planets, houses, aspects, or dates.

Output requirements:
- verdict: one plain-language sentence for this date.
- favorable: practical openings supported by the transit rules.
- caution: friction points supported by the transit rules.
- technical_basis.triggered_houses: exactly the triggered_houses from context.
- technical_basis.planets_used: only planets listed in allowed_citations.planets.
- technical_basis.transit_rules: only rule names listed in allowed_citations.transit_rules.
- tone and answer_schema_version must match the requested values.

Return ONLY JSON matching DailyPrediction schema.`;
