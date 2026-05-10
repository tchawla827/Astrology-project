import {
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  type Aspect,
  type AskContextComputation,
  type AskContextPlanMetadata,
  type Chart,
  type ChartSnapshot,
  type PlanetInChart,
  type PlanetPlacement,
  type DerivedFeaturePayload,
  type Planet,
  type Topic,
  type TopicBundle,
  type TopicEvidence,
  type Yoga,
} from "@/lib/schemas";
import { LlmContextError } from "@/lib/llm/errors";
import { buildTopicEvidence } from "@/lib/derived/topicEvidence";
import type { AstrologyFactsAskContext } from "@/lib/server/exportAstrologyFacts";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseAskContextClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

type BirthProfileRow = {
  id: string;
  status: "processing" | "ready" | "error";
  birth_time_confidence: "exact" | "approximate" | "unknown";
};

type DerivedSnapshotRow = {
  id: string;
  schema_version: string;
  computed_at: string;
  payload: unknown;
};

type ChartSnapshotRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

export type AskContextBundle = TopicBundle & {
  context_id: string;
  birth_profile_id: string;
  chart_snapshot_id: string;
  derived_schema_version: string;
  engine_version: string;
  computed_at: string;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  profile_summary: ChartSnapshot["summary"];
  time_sensitivity: DerivedFeaturePayload["time_sensitivity"];
  context_plan?: AskContextPlanMetadata;
  planned_context?: AskPlannedContextFacts;
  topic_evidence?: TopicEvidence;
  day_context?: AstrologyFactsAskContext;
  allowed_citations: {
    charts: string[];
    houses: number[];
    planets: Planet[];
  };
};

export type AskPlannedContextFacts = {
  intent_summary: string;
  requested: {
    charts: string[];
    houses: number[];
    planets: Planet[];
    timing: AskContextPlanMetadata["requested_timing"];
    computations: AskContextPlanMetadata["requested_computations"];
  };
  included: {
    charts: string[];
    houses: number[];
    planets: Planet[];
  };
  charts: Array<{
    chart_key: string;
    ascendant_sign: string;
    ascendant_longitude_deg?: number;
    houses: Chart["houses"];
    planets: PlanetInChart[];
    aspects: Aspect[];
  }>;
  natal_planets: PlanetPlacement[];
  dasha?: ChartSnapshot["dasha"];
  transits?: Pick<ChartSnapshot["transits"], "as_of" | "highlights" | "positions">;
  yogas: Yoga[];
};

function toErrorMessage(error: { message: string } | Error | null, fallback: string) {
  if (!error) {
    return fallback;
  }
  return error.message || fallback;
}

function asProfileRow(value: unknown): BirthProfileRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<BirthProfileRow>;
  if (
    typeof row.id === "string" &&
    (row.status === "processing" || row.status === "ready" || row.status === "error") &&
    (row.birth_time_confidence === "exact" ||
      row.birth_time_confidence === "approximate" ||
      row.birth_time_confidence === "unknown")
  ) {
    return row as BirthProfileRow;
  }
  return null;
}

function asDerivedRow(value: unknown): DerivedSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<DerivedSnapshotRow>;
  if (typeof row.id === "string" && typeof row.schema_version === "string" && typeof row.computed_at === "string") {
    return row as DerivedSnapshotRow;
  }
  return null;
}

function asChartRow(value: unknown): ChartSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<ChartSnapshotRow>;
  if (typeof row.id === "string" && typeof row.engine_version === "string" && typeof row.computed_at === "string") {
    return row as ChartSnapshotRow;
  }
  return null;
}

function allowedCharts(bundle: TopicBundle, evidence?: TopicEvidence, dayContext?: AstrologyFactsAskContext) {
  const charts = new Set([
    ...bundle.charts_used,
    ...(evidence?.citations.charts ?? []),
    ...(dayContext?.allowed_citations.charts ?? []),
  ]);
  if (bundle.timing.current_trigger_notes.length > 0) {
    charts.add("Transit");
  }
  return [...charts];
}

function allowedHouses(bundle: TopicBundle, evidence?: TopicEvidence, dayContext?: AstrologyFactsAskContext) {
  return [
    ...new Set([
      ...Object.keys(bundle.houses).map(Number),
      ...(evidence?.citations.houses ?? []),
      ...(dayContext?.allowed_citations.houses ?? []),
    ]),
  ].sort((left, right) => left - right);
}

function allowedPlanets(bundle: TopicBundle, evidence?: TopicEvidence, dayContext?: AstrologyFactsAskContext) {
  return [
    ...new Set([
      ...(Object.keys(bundle.planets) as Planet[]),
      ...(evidence?.citations.planets ?? []),
      ...(dayContext?.allowed_citations.planets ?? []),
    ]),
  ];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function includesComputation(plan: AskContextPlanMetadata, computation: AskContextComputation) {
  return plan.requested_computations.includes(computation);
}

function relevantAspect(aspect: Aspect, houses: Set<number>, planets: Set<Planet>) {
  if (planets.has(aspect.from)) {
    return true;
  }
  if (typeof aspect.to === "number") {
    return houses.has(aspect.to);
  }
  return planets.has(aspect.to);
}

function requestedHouseLords(snapshot: ChartSnapshot, houses: number[]) {
  const d1 = snapshot.charts.D1;
  if (!d1) {
    return [];
  }
  return houses
    .map((house) => d1.houses.find((entry) => entry.house === house)?.lord)
    .filter((planet): planet is Planet => Boolean(planet));
}

function resolvePlanetsForContext(snapshot: ChartSnapshot, plan: AskContextPlanMetadata) {
  const houses = new Set(plan.requested_houses);
  const planets = new Set<Planet>(plan.requested_planets);

  if (includesComputation(plan, "house_lord_placements")) {
    requestedHouseLords(snapshot, plan.requested_houses).forEach((planet) => planets.add(planet));
  }

  if (
    plan.requested_timing.includes("current_dasha") ||
    plan.requested_timing.includes("current_antardasha") ||
    includesComputation(plan, "dasha_lord_relevance")
  ) {
    planets.add(snapshot.dasha.current_mahadasha.lord);
    planets.add(snapshot.dasha.current_antardasha.lord);
  }

  if (plan.requested_timing.includes("upcoming_dasha")) {
    snapshot.dasha.upcoming.forEach((period) => planets.add(period.lord));
  }

  for (const chartKey of plan.requested_charts) {
    const chart = snapshot.charts[chartKey];
    chart?.planets.forEach((placement) => {
      if (houses.has(placement.house)) {
        planets.add(placement.planet);
      }
    });
  }

  return [...planets];
}

function chartFactsForPlan(snapshot: ChartSnapshot, plan: AskContextPlanMetadata, includedPlanets: Planet[]) {
  const houses = new Set(plan.requested_houses);
  const planets = new Set(includedPlanets);
  const charts: AskPlannedContextFacts["charts"] = [];

  for (const chartKey of plan.requested_charts) {
    const chart = snapshot.charts[chartKey];
    if (!chart) {
      continue;
    }

    const chartPlanets = chart.planets.filter((placement) => planets.has(placement.planet) || houses.has(placement.house));
    const chartAspects =
      includesComputation(plan, "aspects_to_requested_factors") || includesComputation(plan, "varga_confirmations")
        ? (chart.aspects ?? []).filter((aspect) => relevantAspect(aspect, houses, planets)).slice(0, 24)
        : [];

    charts.push({
      chart_key: chart.chart_key,
      ascendant_sign: chart.ascendant_sign,
      ascendant_longitude_deg: chart.ascendant_longitude_deg,
      houses: chart.houses.filter((house) => houses.has(house.house)),
      planets: chartPlanets,
      aspects: chartAspects,
    });
  }

  return charts;
}

function transitFactsForPlan(snapshot: ChartSnapshot, plan: AskContextPlanMetadata, includedPlanets: Planet[]) {
  if (!plan.requested_timing.includes("transits") && !includesComputation(plan, "transit_hits_to_requested_factors")) {
    return undefined;
  }

  const houses = new Set(plan.requested_houses);
  const planets = new Set(includedPlanets);
  const positions = snapshot.transits.positions
    .filter((position) => planets.has(position.planet) || houses.has(position.house))
    .slice(0, 12);

  return {
    as_of: snapshot.transits.as_of,
    highlights: snapshot.transits.highlights.slice(0, 8),
    positions,
  };
}

function yogasForPlan(snapshot: ChartSnapshot, plan: AskContextPlanMetadata, includedPlanets: Planet[]) {
  if (!includesComputation(plan, "yogas_involving_requested_factors")) {
    return [];
  }

  const charts = new Set<string>(plan.requested_charts);
  const planets = new Set(includedPlanets);
  return snapshot.yogas
    .filter(
      (yoga) =>
        yoga.source_charts.some((chart) => charts.has(chart)) ||
        yoga.planets_involved.some((planet) => planets.has(planet)),
    )
    .slice(0, 8);
}

function plannedContextFacts(snapshot: ChartSnapshot, plan: AskContextPlanMetadata): AskPlannedContextFacts {
  const includedPlanets = resolvePlanetsForContext(snapshot, plan);
  const charts = chartFactsForPlan(snapshot, plan, includedPlanets);
  const natalPlanets = snapshot.planetary_positions
    .filter((placement) => includedPlanets.includes(placement.planet) || plan.requested_houses.includes(placement.house))
    .slice(0, 16);
  const transits = transitFactsForPlan(snapshot, plan, includedPlanets);
  const yogas = yogasForPlan(snapshot, plan, includedPlanets);
  const includedHouses = unique([
    ...plan.requested_houses,
    ...charts.flatMap((chart) => chart.houses.map((house) => house.house)),
    ...charts.flatMap((chart) => chart.planets.map((planet) => planet.house)),
    ...natalPlanets.map((planet) => planet.house),
    ...(transits?.positions.map((planet) => planet.house) ?? []),
  ]).sort((left, right) => left - right);

  return {
    intent_summary: plan.intent_summary,
    requested: {
      charts: plan.requested_charts,
      houses: plan.requested_houses,
      planets: plan.requested_planets,
      timing: plan.requested_timing,
      computations: plan.requested_computations,
    },
    included: {
      charts: charts.map((chart) => chart.chart_key),
      houses: includedHouses,
      planets: includedPlanets,
    },
    charts,
    natal_planets: natalPlanets,
    dasha: plan.requested_timing.some((item) => item === "current_dasha" || item === "current_antardasha" || item === "upcoming_dasha")
      ? snapshot.dasha
      : undefined,
    transits,
    yogas,
  };
}

function allowedChartsFromPlan(planned?: AskPlannedContextFacts) {
  if (!planned) {
    return [];
  }
  const charts = [...planned.included.charts];
  if (planned.transits) {
    charts.push("Transit");
  }
  return unique(charts);
}

function allowedHousesFromPlan(planned?: AskPlannedContextFacts) {
  return planned?.included.houses ?? [];
}

function allowedPlanetsFromPlan(planned?: AskPlannedContextFacts) {
  return planned?.included.planets ?? [];
}

export async function buildContextBundle(input: {
  supabase: SupabaseAskContextClient;
  profile_id: string;
  topic: Topic;
  context_plan?: AskContextPlanMetadata;
  day_context?: AstrologyFactsAskContext;
}): Promise<AskContextBundle> {
  const { data: profileData, error: profileError } = await input.supabase
    .from("birth_profiles")
    .select("id,status,birth_time_confidence")
    .eq("id", input.profile_id)
    .maybeSingle();

  if (profileError) {
    throw new LlmContextError(toErrorMessage(profileError, "Could not load birth profile."));
  }

  const profile = asProfileRow(profileData);
  if (!profile) {
    throw new LlmContextError("Birth profile not found.");
  }
  if (profile.status !== "ready") {
    throw new LlmContextError("Birth profile is not ready for Ask Astrology.");
  }

  const [{ data: derivedData, error: derivedError }, { data: chartData, error: chartError }] = await Promise.all([
    input.supabase
      .from("derived_feature_snapshots")
      .select("id,schema_version,computed_at,payload")
      .eq("birth_profile_id", input.profile_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("chart_snapshots")
      .select("id,engine_version,computed_at,payload")
      .eq("birth_profile_id", input.profile_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (derivedError) {
    throw new LlmContextError(toErrorMessage(derivedError, "Could not load derived feature snapshot."));
  }
  if (chartError) {
    throw new LlmContextError(toErrorMessage(chartError, "Could not load chart snapshot."));
  }

  const derivedRow = asDerivedRow(derivedData);
  const chartRow = asChartRow(chartData);
  if (!derivedRow) {
    throw new LlmContextError("No derived feature snapshot is available for Ask Astrology.");
  }
  if (!chartRow) {
    throw new LlmContextError("No chart snapshot is available for Ask Astrology.");
  }

  const parsedDerived = DerivedFeaturePayloadSchema.safeParse(derivedRow.payload);
  if (!parsedDerived.success) {
    throw new LlmContextError("Stored derived feature snapshot does not match the expected schema.", {
      cause: parsedDerived.error,
    });
  }

  const parsedChart = ChartSnapshotSchema.safeParse(chartRow.payload);
  if (!parsedChart.success) {
    throw new LlmContextError("Stored chart snapshot does not match the expected schema.", { cause: parsedChart.error });
  }

  const bundle = parsedDerived.data.topic_bundles[input.topic];
  const evidence = parsedDerived.data.topic_evidence_v1[input.topic] ?? buildTopicEvidence(parsedChart.data, bundle, input.topic);
  const planned = input.context_plan ? plannedContextFacts(parsedChart.data, input.context_plan) : undefined;
  const dayCharts = input.day_context?.allowed_citations.charts ?? [];
  const dayHouses = input.day_context?.allowed_citations.houses ?? [];
  const dayPlanets = input.day_context?.allowed_citations.planets ?? [];
  const baseCharts = planned ? dayCharts : allowedCharts(bundle, evidence, input.day_context);
  const baseHouses = planned ? dayHouses : allowedHouses(bundle, evidence, input.day_context);
  const basePlanets = planned ? dayPlanets : allowedPlanets(bundle, evidence, input.day_context);
  const houses = [
    ...new Set([...baseHouses, ...allowedHousesFromPlan(planned)]),
  ].sort((left, right) => left - right);
  const planets = [...new Set([...basePlanets, ...allowedPlanetsFromPlan(planned)])];
  const charts = [
    ...new Set([...baseCharts, ...allowedChartsFromPlan(planned)]),
  ];

  return {
    ...bundle,
    charts_used: charts.filter((chart) => chart !== "Transit"),
    context_id: derivedRow.id,
    birth_profile_id: input.profile_id,
    chart_snapshot_id: chartRow.id,
    derived_schema_version: derivedRow.schema_version,
    engine_version: chartRow.engine_version,
    computed_at: derivedRow.computed_at,
    birth_time_confidence: parsedChart.data.birth_time_confidence ?? profile.birth_time_confidence,
    profile_summary: parsedChart.data.summary,
    time_sensitivity: parsedDerived.data.time_sensitivity,
    context_plan: input.context_plan,
    planned_context: planned,
    topic_evidence: evidence,
    day_context: input.day_context,
    allowed_citations: {
      charts,
      houses,
      planets,
    },
  };
}
