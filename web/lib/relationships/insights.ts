import { getCompatibility } from "@/lib/astro/client";
import {
  ChartSnapshotSchema,
  RelationshipInsightSchema,
  type ChartSnapshot,
  type RelationshipFactor,
  type RelationshipInsight,
  type RelationshipLabel,
} from "@/lib/schemas";
import { labelText } from "@/lib/relationships/labels";

export const RELATIONSHIP_INSIGHT_SCHEMA_VERSION = "relationship_insight_v1";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = QueryResult & {
  eq(column: string, value: string): SupabaseQuery;
  in(column: string, values: string[]): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
  single(): QueryResult;
  select(columns: string): SupabaseQuery;
};

export type SupabaseRelationshipInsightClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    insert(payload: unknown): SupabaseQuery;
  };
};

type ParticipantRow = {
  user_id: string;
  birth_profile_id: string;
  label_for_other: RelationshipLabel;
  birth_profiles?: {
    id: string;
    name: string;
    status: "processing" | "ready" | "error";
  } | Array<{
    id: string;
    name: string;
    status: "processing" | "ready" | "error";
  }>;
};

type ChartRow = {
  id: string;
  engine_version: string;
  computed_at: string;
  payload: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstNested<T>(value: T | T[] | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function asParticipant(value: unknown): ParticipantRow | null {
  const row = asObject(value) as Partial<ParticipantRow> | null;
  if (!row || typeof row.user_id !== "string" || typeof row.birth_profile_id !== "string") {
    return null;
  }
  return row as ParticipantRow;
}

function asChartRow(value: unknown): ChartRow | null {
  const row = asObject(value) as Partial<ChartRow> | null;
  if (!row || typeof row.id !== "string" || typeof row.engine_version !== "string" || !("payload" in row)) {
    return null;
  }
  return row as ChartRow;
}

function splitFactors(factors: RelationshipFactor[]) {
  return {
    strengths: factors.filter((factor) => factor.polarity === "strength"),
    frictions: factors.filter((factor) => factor.polarity === "friction"),
    timing: factors.filter((factor) => factor.polarity === "timing"),
  };
}

function confidenceForSnapshots(left: ChartSnapshot, right: ChartSnapshot) {
  const values = [left.birth_time_confidence, right.birth_time_confidence];
  if (values.includes("unknown")) {
    return {
      level: "low" as const,
      note: "At least one birth time is unknown, so timing-sensitive relationship factors are low confidence.",
    };
  }
  if (values.includes("approximate")) {
    return {
      level: "medium" as const,
      note: "At least one birth time is approximate, so house and divisional-chart factors should be read with caution.",
    };
  }
  return {
    level: "high" as const,
    note: "Both profiles use exact birth-time confidence, so chart-to-chart factors have the strongest available grounding.",
  };
}

function verdictFor(input: {
  polarity: "supportive" | "mixed" | "challenging";
  selfName: string;
  otherName: string;
  selfLabel: RelationshipLabel;
}) {
  const label = labelText(input.selfLabel).toLowerCase();
  if (input.polarity === "supportive") {
    return `${input.selfName} and ${input.otherName} have a real ${label} channel, but it still needs conscious handling.`;
  }
  if (input.polarity === "challenging") {
    return `${input.selfName} and ${input.otherName} are not an effortless ${label} match; the bond needs boundaries and translation.`;
  }
  return `${input.selfName} and ${input.otherName} have a mixed ${label} signature: useful chemistry, visible friction.`;
}

function summaryFor(factors: RelationshipFactor[]) {
  const strength = factors.find((factor) => factor.polarity === "strength")?.summary;
  const friction = factors.find((factor) => factor.polarity === "friction")?.summary;
  if (strength && friction) {
    return `${strength} ${friction}`;
  }
  return factors.slice(0, 2).map((factor) => factor.summary).join(" ");
}

export async function loadRelationshipParticipants(input: {
  supabase: SupabaseRelationshipInsightClient;
  relationshipId: string;
}) {
  const { data, error } = await input.supabase
    .from("relationship_participants")
    .select("user_id,birth_profile_id,label_for_other,birth_profiles(id,name,status)")
    .eq("relationship_id", input.relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  const participants = (Array.isArray(data) ? data : []).map(asParticipant).filter((row): row is ParticipantRow => Boolean(row));
  if (participants.length !== 2) {
    throw new Error("Relationship must have exactly two participants.");
  }
  return participants;
}

async function loadLatestChart(input: {
  supabase: SupabaseRelationshipInsightClient;
  birthProfileId: string;
}) {
  const { data, error } = await input.supabase
    .from("chart_snapshots")
    .select("id,engine_version,computed_at,payload")
    .eq("birth_profile_id", input.birthProfileId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  const row = asChartRow(data);
  if (!row) {
    throw new Error("No chart snapshot found for relationship participant.");
  }
  const snapshot = ChartSnapshotSchema.parse(row.payload);
  return { row, snapshot };
}

export async function computeRelationshipInsight(input: {
  supabase: SupabaseRelationshipInsightClient;
  relationshipId: string;
  viewerUserId?: string;
}): Promise<RelationshipInsight> {
  const participants = await loadRelationshipParticipants(input);
  const ordered = input.viewerUserId
    ? [...participants].sort((left) => (left.user_id === input.viewerUserId ? -1 : 1))
    : participants;
  const [self, other] = ordered;
  if (!self || !other) {
    throw new Error("Relationship must have exactly two participants.");
  }
  const selfProfile = firstNested(self.birth_profiles);
  const otherProfile = firstNested(other.birth_profiles);

  if (!selfProfile || !otherProfile || selfProfile.status !== "ready" || otherProfile.status !== "ready") {
    throw new Error("Both relationship participants need ready birth profiles.");
  }

  const [selfChart, otherChart] = await Promise.all([
    loadLatestChart({ supabase: input.supabase, birthProfileId: self.birth_profile_id }),
    loadLatestChart({ supabase: input.supabase, birthProfileId: other.birth_profile_id }),
  ]);

  const compatibility = await getCompatibility({
    relationship_label: self.label_for_other,
    person_a: {
      label: self.label_for_other,
      summary: selfChart.snapshot.summary,
      charts: {
        D1: selfChart.snapshot.charts.D1,
        D9: selfChart.snapshot.charts.D9,
        Moon: selfChart.snapshot.charts.Moon,
      },
      planetary_positions: selfChart.snapshot.planetary_positions,
    },
    person_b: {
      label: other.label_for_other,
      summary: otherChart.snapshot.summary,
      charts: {
        D1: otherChart.snapshot.charts.D1,
        D9: otherChart.snapshot.charts.D9,
        Moon: otherChart.snapshot.charts.Moon,
      },
      planetary_positions: otherChart.snapshot.planetary_positions,
    },
  });

  const confidence = confidenceForSnapshots(selfChart.snapshot, otherChart.snapshot);
  const { strengths, frictions, timing } = splitFactors(compatibility.factors);
  const createdAt = new Date().toISOString();
  const insight = RelationshipInsightSchema.parse({
    version: RELATIONSHIP_INSIGHT_SCHEMA_VERSION,
    relationship_id: input.relationshipId,
    labels: {
      self: self.label_for_other,
      other: other.label_for_other,
    },
    participants: {
      self: {
        user_id: self.user_id,
        birth_profile_id: self.birth_profile_id,
        display_name: selfProfile.name,
        label_for_other: self.label_for_other,
      },
      other: {
        user_id: other.user_id,
        birth_profile_id: other.birth_profile_id,
        display_name: otherProfile.name,
        label_for_other: other.label_for_other,
      },
    },
    verdict: verdictFor({
      polarity: compatibility.polarity,
      selfName: selfProfile.name,
      otherName: otherProfile.name,
      selfLabel: self.label_for_other,
    }),
    summary: summaryFor(compatibility.factors),
    confidence,
    categories: compatibility.factors,
    strengths,
    frictions,
    timing_notes: timing,
    computed_basis: {
      engine_version: compatibility.engine_version,
      chart_snapshot_ids: { self: selfChart.row.id, other: otherChart.row.id },
      profile_ids: { self: self.birth_profile_id, other: other.birth_profile_id },
    },
    created_at: createdAt,
  });

  const { error } = await input.supabase.from("relationship_insight_snapshots").insert({
    relationship_id: input.relationshipId,
    schema_version: RELATIONSHIP_INSIGHT_SCHEMA_VERSION,
    engine_version: compatibility.engine_version,
    profile_a_id: self.birth_profile_id,
    profile_b_id: other.birth_profile_id,
    chart_snapshot_a_id: selfChart.row.id,
    chart_snapshot_b_id: otherChart.row.id,
    payload: insight,
  });

  if (error) {
    throw new Error(error.message);
  }

  return insight;
}
