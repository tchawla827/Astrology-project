import { z } from "zod";
import { getCompatibility } from "@/lib/astro/client";
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";
import {
  ChartSnapshotSchema,
  RelationshipInsightSchema,
  RelationshipFactorSchema,
  type ChartSnapshot,
  type RelationshipFactor,
  type RelationshipInsight,
  type RelationshipLabel,
} from "@/lib/schemas";
import { labelText } from "@/lib/relationships/labels";

export const RELATIONSHIP_INSIGHT_SCHEMA_VERSION = "relationship_insight_v2";

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

const LlmInsightOutputSchema = z.object({
  verdict: z.string().min(1).max(280),
  summary: z.string().min(1).max(1200),
  strengths: z.array(RelationshipFactorSchema),
  frictions: z.array(RelationshipFactorSchema),
  timing_notes: z.array(RelationshipFactorSchema),
});

function insightOutputFromCompatibility(compatibility: unknown): z.infer<typeof LlmInsightOutputSchema> | null {
  const rawFactors = Array.isArray((compatibility as { factors?: unknown }).factors)
    ? (compatibility as { factors: unknown[] }).factors
    : [];
  const factors = rawFactors
    .map((factor) => RelationshipFactorSchema.safeParse(factor))
    .filter((parsed): parsed is { success: true; data: RelationshipFactor } => parsed.success)
    .map((parsed) => parsed.data);

  if (factors.length === 0) {
    return null;
  }

  const strengths = factors.filter((factor) => factor.polarity === "strength");
  const frictions = factors.filter((factor) => factor.polarity === "friction" || factor.polarity === "mixed");
  const timingNotes = factors.filter((factor) => factor.polarity === "timing");
  const lead = strengths[0] ?? frictions[0] ?? timingNotes[0] ?? factors[0];

  return {
    verdict: lead?.title.slice(0, 280) ?? "Relationship factors are available.",
    summary: factors.map((factor) => factor.summary).join(" ").slice(0, 1200),
    strengths,
    frictions,
    timing_notes: timingNotes,
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
  providers?: LlmProvider[];
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

  const llmSystemPrompt = `You are an expert Vedic astrologer analyzing a synastry connection between Person A (${selfProfile.name}) and Person B (${otherProfile.name}). 
The relationship context is: Person A views Person B as a ${labelText(self.label_for_other)}.
You will receive raw astrological metrics (Ashtakoota scores, house overlays, cross-aspects, and dimensional scores).
Your job is to synthesize these metrics into a highly readable, personalized, and deep narrative insight.
Produce a 'verdict' (short punchy summary), a longer 'summary', and categorize the key planetary interactions into strengths, frictions, and timing_notes. 
Be nuanced, avoiding overly fatalistic language, focusing on growth and mutual understanding.

CRITICAL INSTRUCTION: You MUST return ONLY valid JSON matching this exact structure:
{
  "verdict": "A short, punchy 1-2 sentence summary of the relationship dynamic.",
  "summary": "A longer, deeper paragraph exploring the synergy.",
  "strengths": [
    {
      "category": "string",
      "polarity": "strength",
      "title": "string",
      "summary": "string",
      "confidence": "high" | "medium" | "low",
      "citations": [
        {
          "person": "both", // MUST be EXACTLY "self" (for Person A), "other" (for Person B), or "both"
          "charts": ["D1"],
          "houses": [1, 7], // MUST be an array of numbers, NOT strings!
          "planets": ["Sun", "Moon"]
        }
      ]
    }
  ],
  "frictions": [
    {
      "category": "string",
      "polarity": "friction",
      "title": "string",
      "summary": "string",
      "confidence": "high" | "medium" | "low",
      "citations": [
        {
          "person": "both", // MUST be EXACTLY "self" (for Person A), "other" (for Person B), or "both"
          "charts": ["D1"],
          "houses": [1, 7],
          "planets": ["Sun", "Moon"]
        }
      ]
    }
  ],
  "timing_notes": [
    {
      "category": "string",
      "polarity": "timing",
      "title": "string",
      "summary": "string",
      "confidence": "high" | "medium" | "low",
      "citations": [
        {
          "person": "both", // MUST be EXACTLY "self" (for Person A), "other" (for Person B), or "both"
          "charts": ["D1"],
          "houses": [1, 7],
          "planets": ["Sun", "Moon"]
        }
      ]
    }
  ]
}
IMPORTANT: The "citations" array MUST NOT be empty. It must contain at least one citation object with "person", "charts", "houses", and "planets" fields for EVERY factor in strengths, frictions, and timing_notes. The "houses" array MUST contain numbers only (e.g., [1, 5, 9]).
Do not include any markdown formatting like \`\`\`json around the output, just the raw JSON object.`;

  const fallbackOutput = insightOutputFromCompatibility(compatibility);
  let parsedLlmOutput: z.infer<typeof LlmInsightOutputSchema>;

  try {
    const { output: llmOutput } = await callWithFallback({
      system: llmSystemPrompt,
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            {
              base_charts: {
                person_a: {
                  name: selfProfile.name,
                  summary: selfChart.snapshot.summary,
                },
                person_b: {
                  name: otherProfile.name,
                  summary: otherChart.snapshot.summary,
                },
              },
              synastry: compatibility,
            },
            null,
            2
          ),
        },
      ],
      schema: LlmInsightOutputSchema,
      topic: "relationship",
      providers: input.providers,
    });

    // Pre-process LLM output to fix common enum mistakes for "person"
    if (llmOutput && typeof llmOutput === "object") {
      for (const category of ["strengths", "frictions", "timing_notes"]) {
        const arr = (llmOutput as any)[category];
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (Array.isArray(item.citations)) {
              for (const cit of item.citations) {
                if (cit.person === "A" || cit.person === "person_a") cit.person = "self";
                if (cit.person === "B" || cit.person === "person_b") cit.person = "other";
              }
            }
          }
        }
      }
    }

    parsedLlmOutput = LlmInsightOutputSchema.parse(llmOutput);
  } catch (error) {
    if (!fallbackOutput) {
      throw error;
    }
    parsedLlmOutput = fallbackOutput;
  }

  const createdAt = new Date().toISOString();
  // We expect python to return dimensional_scores now. Fallback to 0 if missing.
  const pyMetrics = compatibility as any;
  const dimensional_scores = pyMetrics.synastry_metrics?.dimensional_scores ?? {
    emotional: 0,
    communication: 0,
    physical: 0,
    long_term: 0,
  };

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
    verdict: parsedLlmOutput.verdict,
    summary: parsedLlmOutput.summary,
    confidence,
    dimensional_scores,
    categories: [...parsedLlmOutput.strengths, ...parsedLlmOutput.frictions, ...parsedLlmOutput.timing_notes],
    strengths: parsedLlmOutput.strengths,
    frictions: parsedLlmOutput.frictions,
    timing_notes: parsedLlmOutput.timing_notes,
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
