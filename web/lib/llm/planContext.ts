import { z } from "zod";

import { SUPPORTED_CHART_KEYS, type SupportedChartKey } from "@/lib/charts/catalog";
import { classifyQuestion, type AskClassification } from "@/lib/llm/classify";
import { contextPlannerSystemV1, contextPlannerUserV1, PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";
import {
  AskContextPlanMetadataSchema,
  AskContextPlanSchema,
  type AskContextPlan,
  type AskContextPlanMetadata,
  type ChartKey,
  type LlmMetadata,
  type Planet,
  type Topic,
} from "@/lib/schemas";
import { topicBlueprints } from "@/lib/derived/topics";

const fallbackPlanetByTopic: Record<Topic, Planet[]> = {
  personality: ["Moon", "Sun"],
  career: ["Saturn", "Sun", "Mercury", "Jupiter"],
  wealth: ["Jupiter", "Venus"],
  relationships: ["Venus", "Mars", "Moon"],
  marriage: ["Venus", "Jupiter"],
  family: ["Moon", "Jupiter"],
  health: ["Moon", "Sun"],
  education: ["Mercury", "Jupiter"],
  spirituality: ["Ketu", "Jupiter"],
  relocation: ["Rahu", "Moon"],
};

export type PlannedAskContext = {
  plan: AskContextPlanMetadata;
  classification: AskClassification;
  planner_metadata?: LlmMetadata;
};

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function coerceSupportedCharts(charts: ChartKey[]) {
  const supported = new Set<string>(SUPPORTED_CHART_KEYS);
  return unique(charts.filter((chart): chart is SupportedChartKey => supported.has(chart))).slice(0, 6);
}

function withFallbacks(input: {
  plan: AskContextPlan;
  source: AskContextPlanMetadata["source"];
  plannerError?: string;
  hasSelectedDayContext: boolean;
}): AskContextPlanMetadata {
  const blueprint = topicBlueprints[input.plan.primary_topic];
  const requestedTiming = input.hasSelectedDayContext
    ? input.plan.requested_timing
    : input.plan.requested_timing.filter((item) => item !== "selected_day");

  const plan = {
    ...input.plan,
    requested_charts: coerceSupportedCharts(input.plan.requested_charts).length
      ? coerceSupportedCharts(input.plan.requested_charts)
      : coerceSupportedCharts((blueprint.chartsUsed as ChartKey[]).slice(0, 4)),
    requested_houses: unique(input.plan.requested_houses).slice(0, 8),
    requested_planets: unique(input.plan.requested_planets).slice(0, 9),
    requested_timing: unique(requestedTiming).slice(0, 5),
    requested_computations: unique(input.plan.requested_computations).slice(0, 8),
    source: input.source,
    planner_error: input.plannerError,
  };

  if (plan.requested_houses.length === 0) {
    plan.requested_houses = blueprint.housesUsed.slice(0, 6);
  }
  if (plan.requested_planets.length === 0) {
    plan.requested_planets = fallbackPlanetByTopic[input.plan.primary_topic];
  }
  if (plan.requested_timing.length === 0 && input.plan.needs_timing) {
    plan.requested_timing = ["current_dasha", "current_antardasha", "transits"];
  }

  return AskContextPlanMetadataSchema.parse(plan);
}

function classificationFromPlan(plan: AskContextPlanMetadata): AskClassification {
  return {
    topic: plan.primary_topic,
    needs_timing: plan.needs_timing || plan.requested_timing.length > 0,
    needs_technical_depth: plan.needs_technical_depth,
    birth_time_sensitive: plan.birth_time_sensitive,
    is_mixed: plan.is_mixed,
    matched_terms: [],
    confidence: plan.confidence,
  };
}

function fallbackPlan(input: {
  question: string;
  classification: AskClassification;
  plannerError?: string;
  hasSelectedDayContext: boolean;
}) {
  const blueprint = topicBlueprints[input.classification.topic];
  const timing = input.classification.needs_timing
    ? ["current_dasha", "current_antardasha", "transits"] as const
    : ["current_dasha", "current_antardasha"] as const;

  return withFallbacks({
    source: "deterministic_fallback",
    plannerError: input.plannerError,
    hasSelectedDayContext: input.hasSelectedDayContext,
    plan: {
      version: "ask_context_plan_v1",
      primary_topic: input.classification.topic,
      intent_summary: `Fallback context plan for: ${input.question.slice(0, 140)}`,
      requested_charts: blueprint.chartsUsed.slice(0, 4) as ChartKey[],
      requested_houses: blueprint.housesUsed.slice(0, 6),
      requested_planets: fallbackPlanetByTopic[input.classification.topic],
      requested_timing: input.hasSelectedDayContext ? [...timing, "selected_day"] : [...timing],
      requested_computations: [
        "house_lord_placements",
        "planet_condition",
        "aspects_to_requested_factors",
        "dasha_lord_relevance",
      ],
      needs_timing: input.classification.needs_timing,
      needs_technical_depth: input.classification.needs_technical_depth,
      birth_time_sensitive: input.classification.birth_time_sensitive,
      is_mixed: input.classification.is_mixed,
      confidence: input.classification.confidence,
      reason: "The LLM planner did not return a usable context request, so the server used the existing deterministic route as a fallback.",
    },
  });
}

function plannerErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => issue.message).join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

export async function planAskContext(input: {
  question: string;
  hasSelectedDayContext?: boolean;
  providers?: LlmProvider[];
}): Promise<PlannedAskContext> {
  const hasSelectedDayContext = input.hasSelectedDayContext === true;

  try {
    const planned = await callWithFallback({
      system: contextPlannerSystemV1,
      messages: [{ role: "user", content: contextPlannerUserV1({ question: input.question, hasSelectedDayContext }) }],
      schema: AskContextPlanSchema,
      topic: "planner",
      answer_schema_version: PROMPT_VERSIONS.planner,
      prompt_versions: {
        system: PROMPT_VERSIONS.system,
        route: PROMPT_VERSIONS.planner,
        user: PROMPT_VERSIONS.user,
        planner: PROMPT_VERSIONS.planner,
      },
      providers: input.providers,
      temperature: 0,
      max_attempts: 2,
    });
    const parsedPlan = AskContextPlanSchema.parse(planned.output);
    const plan = withFallbacks({
      plan: parsedPlan,
      source: "llm",
      hasSelectedDayContext,
    });

    return {
      plan,
      classification: classificationFromPlan(plan),
      planner_metadata: planned.meta,
    };
  } catch (error) {
    const classification = await classifyQuestion({ question: input.question });
    const plan = fallbackPlan({
      question: input.question,
      classification,
      plannerError: plannerErrorMessage(error),
      hasSelectedDayContext,
    });
    return { plan, classification };
  }
}
