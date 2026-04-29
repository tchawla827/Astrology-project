export const routeDailyV2 = `Daily prediction route.

Use only the supplied daily context: natal D1 summary, active dasha timing, panchang, transit positions, natal overlay, relevant topic signals, and aspect_scoring_context. Do not calculate or add planets, houses, aspects, dashas, panchang values, or dates.

Output requirements:
- verdict: one plain-language sentence for this date.
- felt_sense: one simple sentence describing how the person may feel that day.
- aspect_scores: exactly four entries, in this order: love, emotional, career, focus.
- aspect_scores[].score: use the supplied deterministic aspect score for this aspect exactly. Tone must never change the number.
- aspect_scores[].label: use the supplied deterministic label exactly: low for 1-3, mixed for 4-5, steady for 6-7, strong for 8-10.
- aspect_scores[].sentence: one practical sentence that honestly matches the deterministic score and tone.
- aspect_scores[].basis.houses: use the supplied deterministic basis houses exactly.
- aspect_scores[].basis.planets: use the supplied deterministic basis planets exactly.
- aspect_scores[].basis.transit_rules: use the supplied deterministic transit rules exactly.
- favorable: practical openings supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- caution: friction points supported by the supplied transit rules, active dasha timing, panchang, or muhurta windows.
- technical_basis.triggered_houses: exactly the triggered_houses from context.
- technical_basis.planets_used: only planets listed in allowed_citations.planets.
- technical_basis.transit_rules: only rule names listed in allowed_citations.transit_rules.
- date must match the requested date.
- tone must match the requested tone.
- answer_schema_version must be exactly "daily_v2".

Return ONLY JSON matching DailyPrediction schema.`;
