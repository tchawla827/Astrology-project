import { AskAnswerSchema, DailyPredictionSchema, PlanetSchema, type AskAnswer, type Planet } from "@/lib/schemas";
import { LlmCitationError, LlmSchemaError } from "@/lib/llm/errors";
import type { AskClassification } from "@/lib/llm/classify";
import type { AskContextBundle } from "@/lib/llm/buildContext";

function missingValues<T>(used: T[], allowed: T[]) {
  return used.filter((value) => !allowed.includes(value));
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function arrayOfStrings(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

function arrayOfNumbers(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
    return [value];
  }
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item) && item >= 1 && item <= 12)
    : [];
}

function arrayOfPlanets(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return values.filter((item): item is Planet => PlanetSchema.safeParse(item).success);
}

function timingTypes(value: unknown, context: AskContextBundle) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values
    .map((item) => (typeof item === "string" ? item.toLowerCase().trim() : ""))
    .map((item) => (item === "daily" || item === "day" || item === "selected_day" ? "transit" : item))
    .filter((item): item is "natal" | "dasha" | "transit" => item === "natal" || item === "dasha" || item === "transit");
  return normalized.length > 0 ? [...new Set(normalized)] : [context.day_context ? "transit" : "natal"];
}

function confidenceValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return { level: "medium", note: value };
  }

  const confidence = asObject(value);
  const level = typeof confidence?.level === "string" ? confidence.level.toLowerCase().trim() : "";
  return {
    level: level === "high" || level === "medium" || level === "low" ? level : "medium",
    note: typeof confidence?.note === "string" && confidence.note.trim().length > 0 ? confidence.note : "Grounded in supplied context.",
  };
}

function normalizeAskAnswerShape(output: unknown, context: AskContextBundle) {
  const wrapper = asObject(output);
  const candidate = wrapper?.answer ?? wrapper?.ask_answer ?? wrapper?.content_structured ?? output;
  const row = asObject(candidate);
  if (!row) {
    return candidate;
  }

  const timing = asObject(row.timing);
  const technicalBasis = asObject(row.technical_basis);
  const charts = technicalBasis?.charts_used ?? technicalBasis?.charts ?? technicalBasis?.chart_keys;
  const houses = technicalBasis?.houses_used ?? technicalBasis?.houses ?? technicalBasis?.triggered_houses;
  const planets = technicalBasis?.planets_used ?? technicalBasis?.planets;

  return {
    ...row,
    why: arrayOfStrings(row.why),
    advice: arrayOfStrings(row.advice).slice(0, 5),
    timing: {
      ...timing,
      type: timingTypes(timing?.type, context),
    },
    confidence: confidenceValue(row.confidence),
    technical_basis: {
      ...technicalBasis,
      charts_used: arrayOfStrings(charts),
      houses_used: arrayOfNumbers(houses),
      planets_used: arrayOfPlanets(planets),
    },
  };
}

function uniqueAllowed<T>(values: T[], allowed: T[]) {
  return [...new Set(values.filter((value) => allowed.includes(value)))];
}

function fromDailyPredictionOutput(output: unknown, context: AskContextBundle): AskAnswer | null {
  if (!context.day_context) {
    return null;
  }

  const parsed = DailyPredictionSchema.safeParse(output);
  if (!parsed.success) {
    return null;
  }

  const daily = parsed.data;
  const basisHouses = daily.aspect_scores.flatMap((score) => score.basis.houses);
  const basisPlanets = daily.aspect_scores.flatMap((score) => score.basis.planets);
  const houses = uniqueAllowed([...daily.technical_basis.triggered_houses, ...basisHouses], context.allowed_citations.houses);
  const planets = uniqueAllowed<Planet>(
    [...daily.technical_basis.planets_used, ...basisPlanets],
    context.allowed_citations.planets,
  );
  const charts = uniqueAllowed(["Transit", "D1"], context.allowed_citations.charts);
  const fallbackHouse = context.allowed_citations.houses[0];
  const fallbackPlanet = context.allowed_citations.planets[0];

  return {
    verdict: daily.verdict,
    why: [daily.felt_sense, ...daily.aspect_scores.map((score) => score.sentence)].slice(0, 5),
    timing: {
      summary: `This answer is scoped to ${daily.date} using the selected-day transit facts.`,
      type: ["transit"],
    },
    confidence: {
      level: "medium",
      note: "Grounded in the attached selected-day facts and converted from the provider's daily-format output.",
    },
    advice: [...daily.favorable, ...daily.caution.map((item) => `Avoid: ${item}`)].slice(0, 5),
    technical_basis: {
      charts_used: charts.length > 0 ? charts : [context.allowed_citations.charts[0] ?? "Transit"],
      houses_used: houses.length > 0 ? houses : fallbackHouse ? [fallbackHouse] : [1],
      planets_used: planets.length > 0 ? planets : fallbackPlanet ? [fallbackPlanet] : ["Sun"],
    },
  };
}

function normalizeOutputForAskAnswer(output: unknown, context: AskContextBundle) {
  return fromDailyPredictionOutput(output, context) ?? normalizeAskAnswerShape(output, context);
}

export function validateAnswer(output: unknown, context: AskContextBundle): AskAnswer {
  const parsed = AskAnswerSchema.safeParse(normalizeOutputForAskAnswer(output, context));
  if (!parsed.success) {
    throw new LlmSchemaError("LLM output did not match AskAnswer schema.", { cause: parsed.error });
  }

  const answer = parsed.data;
  const missingCharts = missingValues(answer.technical_basis.charts_used, context.allowed_citations.charts);
  if (missingCharts.length > 0) {
    throw new LlmCitationError(`Answer cited chart(s) not present in context: ${missingCharts.join(", ")}.`, "chart");
  }

  const missingHouses = missingValues(answer.technical_basis.houses_used, context.allowed_citations.houses);
  if (missingHouses.length > 0) {
    throw new LlmCitationError(`Answer cited house(s) not present in context: ${missingHouses.join(", ")}.`, "house");
  }

  const missingPlanets = missingValues<Planet>(answer.technical_basis.planets_used, context.allowed_citations.planets);
  if (missingPlanets.length > 0) {
    throw new LlmCitationError(`Answer cited planet(s) not present in context: ${missingPlanets.join(", ")}.`, "planet");
  }

  return answer;
}

export function applyBirthTimeConsistency(
  answer: AskAnswer,
  context: AskContextBundle,
  classification: Pick<AskClassification, "birth_time_sensitive">,
): AskAnswer {
  if (
    answer.confidence.level !== "high" ||
    !classification.birth_time_sensitive ||
    context.birth_time_confidence === "exact"
  ) {
    return answer;
  }

  return {
    ...answer,
    confidence: {
      level: "medium",
      note: `${answer.confidence.note} Adjusted because the birth time is ${context.birth_time_confidence}, and this question depends on time-sensitive chart factors.`,
    },
  };
}
