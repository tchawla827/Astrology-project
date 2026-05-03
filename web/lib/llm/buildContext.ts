import {
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  type ChartSnapshot,
  type DerivedFeaturePayload,
  type Planet,
  type Topic,
  type TopicBundle,
} from "@/lib/schemas";
import { LlmContextError } from "@/lib/llm/errors";
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
  day_context?: AstrologyFactsAskContext;
  allowed_citations: {
    charts: string[];
    houses: number[];
    planets: Planet[];
  };
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

function allowedCharts(bundle: TopicBundle, dayContext?: AstrologyFactsAskContext) {
  const charts = new Set([...bundle.charts_used, ...(dayContext?.allowed_citations.charts ?? [])]);
  if (bundle.timing.current_trigger_notes.length > 0) {
    charts.add("Transit");
  }
  return [...charts];
}

function allowedHouses(bundle: TopicBundle, dayContext?: AstrologyFactsAskContext) {
  return [...new Set([...Object.keys(bundle.houses).map(Number), ...(dayContext?.allowed_citations.houses ?? [])])].sort(
    (left, right) => left - right,
  );
}

function allowedPlanets(bundle: TopicBundle, dayContext?: AstrologyFactsAskContext) {
  return [...new Set([...(Object.keys(bundle.planets) as Planet[]), ...(dayContext?.allowed_citations.planets ?? [])])];
}

export async function buildContextBundle(input: {
  supabase: SupabaseAskContextClient;
  profile_id: string;
  topic: Topic;
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
  const houses = allowedHouses(bundle, input.day_context);
  const planets = allowedPlanets(bundle, input.day_context);

  return {
    ...bundle,
    context_id: derivedRow.id,
    birth_profile_id: input.profile_id,
    chart_snapshot_id: chartRow.id,
    derived_schema_version: derivedRow.schema_version,
    engine_version: chartRow.engine_version,
    computed_at: derivedRow.computed_at,
    birth_time_confidence: parsedChart.data.birth_time_confidence ?? profile.birth_time_confidence,
    profile_summary: parsedChart.data.summary,
    time_sensitivity: parsedDerived.data.time_sensitivity,
    day_context: input.day_context,
    allowed_citations: {
      charts: allowedCharts(bundle, input.day_context),
      houses,
      planets,
    },
  };
}
