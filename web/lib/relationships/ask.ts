import { AskAnswerSchema, ChartSnapshotSchema, type AskAnswer, type DepthMode, type LlmMetadata, type ToneMode } from "@/lib/schemas";
import { getTransits } from "@/lib/astro/client";
import { LlmProviderError } from "@/lib/llm/errors";
import { PROMPT_VERSIONS, systemPromptV1 } from "@/lib/llm/prompts";
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";
import { computeRelationshipInsight, loadRelationshipParticipants, type SupabaseRelationshipInsightClient } from "@/lib/relationships/insights";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = QueryResult & {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
  single(): QueryResult;
  select(columns: string): SupabaseQuery;
};

type SupabaseInsertSelection = QueryResult & {
  single(): QueryResult;
};

export type SupabaseRelationshipAskClient = SupabaseRelationshipInsightClient & {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    insert(payload: unknown): { select(columns: string): SupabaseInsertSelection } | QueryResult;
  };
};

type ProfileRow = {
  id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  birth_time_confidence: "exact" | "approximate" | "unknown";
  latitude: number;
  longitude: number;
  timezone: string;
  ayanamsha: "lahiri" | "raman" | "kp";
  status: "processing" | "ready" | "error";
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asProfile(value: unknown): ProfileRow | null {
  const row = asObject(value) as Partial<ProfileRow> | null;
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.name !== "string" ||
    row.status !== "ready" ||
    typeof row.birth_date !== "string" ||
    typeof row.birth_time !== "string" ||
    typeof row.latitude !== "number" ||
    typeof row.longitude !== "number" ||
    typeof row.timezone !== "string"
  ) {
    return null;
  }
  return row as ProfileRow;
}

async function loadProfile(input: { supabase: SupabaseRelationshipAskClient; profileId: string }) {
  const { data, error } = await input.supabase
    .from("birth_profiles")
    .select("id,name,birth_date,birth_time,birth_time_confidence,latitude,longitude,timezone,ayanamsha,status")
    .eq("id", input.profileId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  const profile = asProfile(data);
  if (!profile) {
    throw new Error("Relationship participant profile is not ready.");
  }
  return profile;
}

async function loadChart(input: { supabase: SupabaseRelationshipAskClient; profileId: string }) {
  const { data, error } = await input.supabase
    .from("chart_snapshots")
    .select("id,engine_version,computed_at,payload")
    .eq("birth_profile_id", input.profileId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  const row = asObject(data);
  if (!row || typeof row.id !== "string") {
    throw new Error("Relationship participant chart snapshot is missing.");
  }
  return {
    id: row.id,
    snapshot: ChartSnapshotSchema.parse(row.payload),
  };
}

function hasSelectableInsert(
  value: { select(columns: string): SupabaseInsertSelection } | QueryResult,
): value is { select(columns: string): SupabaseInsertSelection } {
  return typeof (value as { select?: unknown }).select === "function";
}

async function ensureSession(input: {
  supabase: SupabaseRelationshipAskClient;
  relationshipId: string;
  userId: string;
  tone: ToneMode;
  depth: DepthMode;
  sessionId?: string;
  date?: string;
}) {
  if (input.sessionId) {
    const { data, error } = await input.supabase
      .from("relationship_ask_sessions")
      .select("id,relationship_id")
      .eq("id", input.sessionId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    const row = asObject(data);
    if (!row || row.relationship_id !== input.relationshipId) {
      throw new Error("Relationship Ask session not found.");
    }
    return input.sessionId;
  }

  const insert = input.supabase.from("relationship_ask_sessions").insert({
    relationship_id: input.relationshipId,
    created_by: input.userId,
    tone_mode: input.tone,
    depth: input.depth,
    context_kind: input.date ? "daily" : "natal",
    context_date: input.date ?? null,
  });
  if (!hasSelectableInsert(insert)) {
    throw new Error("Relationship Ask session insert did not return a selectable query.");
  }
  const { data, error } = await insert.select("id").single();
  if (error) {
    throw new Error(error.message);
  }
  const row = asObject(data);
  if (typeof row?.id !== "string") {
    throw new Error("Relationship Ask session insert did not return an id.");
  }
  return row.id;
}

async function selectedDateContext(input: {
  profile: ProfileRow;
  chart: Awaited<ReturnType<typeof loadChart>>;
  date?: string;
}) {
  if (!input.date) {
    return undefined;
  }
  const at = `${input.date}T00:00:00.000Z`;
  const transits = await getTransits({
    birth_date: input.profile.birth_date,
    birth_time: input.profile.birth_time,
    latitude: input.profile.latitude,
    longitude: input.profile.longitude,
    timezone: input.profile.timezone,
    ayanamsha: input.profile.ayanamsha,
    at,
    natal: {
      lagna_sign: input.chart.snapshot.summary.lagna,
      planetary_positions: input.chart.snapshot.planetary_positions,
    },
  });
  return {
    requested_date: input.date,
    transits: {
      as_of: transits.as_of,
      highlights: transits.highlights,
      overlay: transits.overlay,
    },
  };
}

function relationshipPrompt(input: {
  question: string;
  tone: ToneMode;
  depth: DepthMode;
  context: unknown;
}) {
  const toneRule =
    input.tone === "brutal"
      ? "Be blunt and direct when the supplied factors support it. Do not invent harshness."
      : input.tone === "balanced"
        ? "Use clear measured language."
        : "Use plain direct language with no cushioning.";
  return `The user is asking about a relationship workspace with two accepted participants.
Use only the supplied relationship_insight, chart summaries, dasha/transit snippets, and selected_date_context.
Do not reveal raw birth details. Do not claim certainty about feelings, loyalty, or future events.
If signals are hard, say so directly.
Tone rule: ${toneRule}
Depth: ${input.depth}

Context:
${JSON.stringify(input.context)}

Question:
${input.question}

Return ONLY JSON matching AskAnswer schema. technical_basis.charts_used may cite person-scoped labels such as "self:D1" and "other:D9".`;
}

async function insertMessages(input: {
  supabase: SupabaseRelationshipAskClient;
  sessionId: string;
  question: string;
  answer: AskAnswer;
  meta: LlmMetadata;
  userId: string;
}) {
  const insert = input.supabase.from("relationship_ask_messages").insert([
    {
      relationship_ask_session_id: input.sessionId,
      role: "user",
      content: input.question,
      created_by: input.userId,
    },
    {
      relationship_ask_session_id: input.sessionId,
      role: "assistant",
      content_structured: input.answer,
      llm_metadata: input.meta,
      created_by: input.userId,
    },
  ]);
  const selectable = hasSelectableInsert(insert)
    ? insert
    : (insert as unknown as { select(columns: string): SupabaseInsertSelection });
  const { data, error } = await selectable.select("id,role");
  if (error) {
    throw new Error(error.message);
  }
  const rows = Array.isArray(data) ? data : [];
  const assistant = rows.find((row) => asObject(row)?.role === "assistant");
  const assistantRow = asObject(assistant);
  return typeof assistantRow?.id === "string" ? assistantRow.id : undefined;
}

export async function generateRelationshipAnswer(input: {
  supabase: SupabaseRelationshipAskClient;
  relationshipId: string;
  userId: string;
  question: string;
  tone: ToneMode;
  depth: DepthMode;
  sessionId?: string;
  date?: string;
  providers?: LlmProvider[];
}) {
  const participants = await loadRelationshipParticipants({
    supabase: input.supabase,
    relationshipId: input.relationshipId,
  });
  if (!participants.some((participant) => participant.user_id === input.userId)) {
    throw new Error("Relationship not found.");
  }
  const ordered = [...participants].sort((left) => (left.user_id === input.userId ? -1 : 1));
  const [self, other] = ordered;
  if (!self || !other) {
    throw new Error("Relationship must have exactly two participants.");
  }
  const [selfProfile, otherProfile, selfChart, otherChart] = await Promise.all([
    loadProfile({ supabase: input.supabase, profileId: self.birth_profile_id }),
    loadProfile({ supabase: input.supabase, profileId: other.birth_profile_id }),
    loadChart({ supabase: input.supabase, profileId: self.birth_profile_id }),
    loadChart({ supabase: input.supabase, profileId: other.birth_profile_id }),
  ]);
  const insight = await computeRelationshipInsight({
    supabase: input.supabase,
    relationshipId: input.relationshipId,
    viewerUserId: input.userId,
  });
  const [selfDate, otherDate] = await Promise.all([
    selectedDateContext({ profile: selfProfile, chart: selfChart, date: input.date }),
    selectedDateContext({ profile: otherProfile, chart: otherChart, date: input.date }),
  ]);
  const sessionId = await ensureSession({
    supabase: input.supabase,
    relationshipId: input.relationshipId,
    userId: input.userId,
    tone: input.tone,
    depth: input.depth,
    sessionId: input.sessionId,
    date: input.date,
  });

  const context = {
    relationship_insight: insight,
    people: {
      self: {
        name: selfProfile.name,
        label_for_other: self.label_for_other,
        summary: selfChart.snapshot.summary,
        dasha: selfChart.snapshot.dasha,
        current_transits: selfChart.snapshot.transits.highlights,
      },
      other: {
        name: otherProfile.name,
        label_for_other: other.label_for_other,
        summary: otherChart.snapshot.summary,
        dasha: otherChart.snapshot.dasha,
        current_transits: otherChart.snapshot.transits.highlights,
      },
    },
    selected_date_context: input.date ? { self: selfDate, other: otherDate } : undefined,
  };

  const firstCall = await callWithFallback({
    system: systemPromptV1,
    messages: [{ role: "user", content: relationshipPrompt({ question: input.question, tone: input.tone, depth: input.depth, context }) }],
    schema: AskAnswerSchema,
    topic: "relationship",
    context_bundle_id: input.relationshipId,
    prompt_versions: {
      system: PROMPT_VERSIONS.system,
      route: "relationship_route_v1",
      user: "relationship_user_v1",
    },
    answer_schema_version: PROMPT_VERSIONS.answer_schema,
    providers: input.providers,
  });

  const parsed = AskAnswerSchema.safeParse(firstCall.output);
  if (!parsed.success) {
    throw new LlmProviderError("Relationship Ask returned malformed JSON.", { retryable: false });
  }
  const assistantMessageId = await insertMessages({
    supabase: input.supabase,
    sessionId,
    question: input.question,
    answer: parsed.data,
    meta: firstCall.meta,
    userId: input.userId,
  });

  return {
    session_id: sessionId,
    assistant_message_id: assistantMessageId,
    answer: parsed.data,
    meta: firstCall.meta,
  };
}
