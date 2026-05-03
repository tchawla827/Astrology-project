export const routeDayQuestionV1 = `Selected day question route.

Use the attached selected_day_facts as the source of truth for the requested date. It is derived from the same charts_transits_json facts export used by the download action, compacted for prompt use.

Rules:
- Answer the user's question for the selected_day_facts.requested_date only.
- Use selected_day_facts.transits for transit positions and houses on that date.
- Use selected_day_facts.natal_summary and natal_planets for natal grounding.
- Do not calculate or add planets, houses, aspects, dashas, dates, or transit positions that are not present in context.
- technical_basis may cite "Transit" plus chart keys, houses, and planets listed in allowed_citations.
- Do not return DailyPrediction fields such as date, felt_sense, aspect_scores, favorable, caution, score_breakdown, tone, or answer_schema_version.

Required JSON shape:
{
  "verdict": "one sentence",
  "why": ["1-5 grounded reasons"],
  "timing": { "summary": "selected-date timing summary", "type": ["transit"] },
  "confidence": { "level": "high|medium|low", "note": "why this confidence level" },
  "advice": ["0-5 practical actions"],
  "technical_basis": {
    "charts_used": ["Transit"],
    "houses_used": [1],
    "planets_used": ["Sun"]
  }
}

Return ONLY JSON matching AskAnswer schema.`;
