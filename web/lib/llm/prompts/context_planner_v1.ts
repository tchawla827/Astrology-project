import { SUPPORTED_CHART_KEYS } from "@/lib/charts/catalog";
import { type Planet, type Topic } from "@/lib/schemas";

const topics: Topic[] = [
  "personality",
  "career",
  "wealth",
  "relationships",
  "marriage",
  "family",
  "health",
  "education",
  "spirituality",
  "relocation",
];

const planets: Planet[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

export const contextPlannerSystemV1 = `You choose the minimum astrological context needed to answer a user's question.

You do not answer the question. You only request context.
Return valid JSON only.

Rules:
- Read the user's natural-language question semantically. Do not rely on single keyword mapping.
- Request only facts that are needed for the question.
- The server will compute or extract the requested facts; do not invent placements.
- Keep the request small. Prefer 2-5 charts, 1-6 houses, and 2-7 planets unless the question truly needs more.
- Use D1/Bhava/Moon for base natal framing when relevant.
- Request divisional charts only when they materially help the question.
- Request timing when the question asks about future, current phase, dates, "when", "will", "should I", or near-term outcomes.
- Mark birth_time_sensitive true when houses, ascendant, vargas, or precise timing are important.
- For health questions, request context only for astrological reflection; do not request medical diagnosis.`;

export function contextPlannerUserV1(input: {
  question: string;
  hasSelectedDayContext: boolean;
}) {
  return `Available catalog:
${JSON.stringify(
  {
    topics,
    charts: SUPPORTED_CHART_KEYS,
    houses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    planets,
    timing: ["current_dasha", "current_antardasha", "upcoming_dasha", "transits", "selected_day"],
    computations: [
      "house_lord_placements",
      "planet_condition",
      "varga_confirmations",
      "aspects_to_requested_factors",
      "dasha_lord_relevance",
      "transit_hits_to_requested_factors",
      "yogas_involving_requested_factors",
      "birth_time_sensitivity",
    ],
    limits: {
      max_charts: 6,
      max_houses: 8,
      max_planets: 9,
      allow_full_snapshot: false,
      selected_day_context_available: input.hasSelectedDayContext,
    },
  },
  null,
  2,
)}

Question:
${input.question}

Return ONLY this JSON shape:
{
  "version": "ask_context_plan_v1",
  "primary_topic": "personality|career|wealth|relationships|marriage|family|health|education|spirituality|relocation",
  "intent_summary": "short natural-language description of what the user is really asking",
  "requested_charts": ["D1"],
  "requested_houses": [1],
  "requested_planets": ["Sun"],
  "requested_timing": ["current_dasha"],
  "requested_computations": ["house_lord_placements"],
  "needs_timing": false,
  "needs_technical_depth": false,
  "birth_time_sensitive": true,
  "is_mixed": false,
  "confidence": "low|medium|high",
  "reason": "why these facts are sufficient"
}`;
}
