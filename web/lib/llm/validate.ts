import { AskAnswerSchema, type AskAnswer, type Planet } from "@/lib/schemas";
import { LlmCitationError, LlmSchemaError } from "@/lib/llm/errors";
import type { AskClassification } from "@/lib/llm/classify";
import type { AskContextBundle } from "@/lib/llm/buildContext";

function missingValues<T>(used: T[], allowed: T[]) {
  return used.filter((value) => !allowed.includes(value));
}

export function validateAnswer(output: unknown, context: AskContextBundle): AskAnswer {
  const parsed = AskAnswerSchema.safeParse(output);
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
