import {
  AskAnswerSchema,
  ChartSnapshotSchema,
  PlanetSchema,
  type AskAnswer,
  type DepthMode,
  type LlmMetadata,
  type Planet,
  type RelationshipInsight,
  type ToneMode,
} from "@/lib/schemas";
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

function compactText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength - 1).trimEnd() : value;
}

function arrayOfStrings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => arrayOfStrings(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => arrayOfStrings(item));
  }
  return typeof value === "string" && value.trim().length > 0 ? [value] : [];
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function houseNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : undefined;
  }
  return undefined;
}

function arrayOfNumbers(value: unknown): number[] {
  const single = houseNumber(value);
  if (single) {
    return [single];
  }
  if (Array.isArray(value)) {
    return value.map(houseNumber).filter((item): item is number => typeof item === "number");
  }
  if (typeof value === "string") {
    return [...value.matchAll(/\b(?:1[0-2]|[1-9])\b/g)]
      .map((match) => houseNumber(match[0]))
      .filter((item): item is number => typeof item === "number");
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(arrayOfNumbers);
  }
  return [];
}

function arrayOfPlanets(value: unknown): Planet[] {
  const values: unknown[] = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,/&]|\band\b/i)
      : value && typeof value === "object"
        ? Object.values(value).flatMap((item) => arrayOfPlanets(item))
        : [];
  return values
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .map((item) => {
      if (typeof item !== "string") {
        return item;
      }
      return item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
    })
    .filter((item): item is Planet => PlanetSchema.safeParse(item).success);
}

function timingTypes(value: unknown, hasDateContext: boolean) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const normalized = values
    .map((item) => (typeof item === "string" ? item.toLowerCase().trim() : ""))
    .map((item) => (item === "daily" || item === "day" || item === "selected_day" ? "transit" : item))
    .filter((item): item is "natal" | "dasha" | "transit" => item === "natal" || item === "dasha" || item === "transit");
  return normalized.length > 0 ? [...new Set(normalized)] : [hasDateContext ? "transit" : "natal"];
}

function confidenceValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return { level: "medium", note: value };
  }

  const confidence = asObject(value);
  const level = typeof confidence?.level === "string" ? confidence.level.toLowerCase().trim() : "";
  return {
    level: level === "high" || level === "medium" || level === "low" ? level : "medium",
    note: typeof confidence?.note === "string" && confidence.note.trim().length > 0 ? confidence.note : "Grounded in supplied relationship context.",
  };
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function citationBasis(insight: RelationshipInsight) {
  const citations = insight.categories.flatMap((factor) => factor.citations);
  const fallback = citations[0];
  return {
    charts_used: unique(citations.flatMap((citation) => citation.charts)).slice(0, 6),
    houses_used: unique(citations.flatMap((citation) => citation.houses)).slice(0, 8),
    planets_used: unique(citations.flatMap((citation) => citation.planets)).slice(0, 8),
    fallback_chart: fallback?.charts[0] ?? "D1",
    fallback_house: fallback?.houses[0] ?? 7,
    fallback_planet: fallback?.planets[0] ?? "Venus",
  };
}

function normalizeAskAnswerOutput(output: unknown, input: { hasDateContext: boolean; insight: RelationshipInsight }) {
  const wrapper = asObject(output);
  const candidate =
    asObject(wrapper?.answer) ??
    asObject(wrapper?.ask_answer) ??
    asObject(wrapper?.content_structured) ??
    output;
  const row = asObject(candidate);
  if (!row) {
    return candidate;
  }

  const timing = asObject(row.timing);
  const technicalBasis = asObject(row.technical_basis ?? row.technicalBasis ?? row.basis ?? row.citations);
  const charts = technicalBasis?.charts_used ?? technicalBasis?.charts ?? technicalBasis?.chart_keys ?? technicalBasis?.chart;
  const houses = technicalBasis?.houses_used ?? technicalBasis?.houses ?? technicalBasis?.triggered_houses ?? technicalBasis?.house;
  const planets = technicalBasis?.planets_used ?? technicalBasis?.planets ?? technicalBasis?.planet;
  const basis = citationBasis(input.insight);
  const normalizedCharts = arrayOfStrings(charts);
  const normalizedHouses = arrayOfNumbers(houses);
  const normalizedPlanets = arrayOfPlanets(planets);
  const advice = arrayOfStrings(row.advice ?? row.guidance ?? row.next_steps ?? row.recommendations);
  const why = arrayOfStrings(row.why ?? row.reasons ?? row.rationale ?? row.factors);

  return {
    ...row,
    verdict: compactText(textValue(row.verdict ?? row.answer ?? row.summary ?? input.insight.verdict), 280),
    explanation: compactText(textValue(row.explanation ?? row.expanded_verdict ?? row.summary ?? input.insight.summary), 900),
    advice: (advice.length > 0 ? advice : ["Use the relationship as workable, not automatic; name expectations clearly."]).slice(0, 5),
    why: (why.length > 0 ? why : input.insight.categories.map((factor) => factor.summary)).slice(0, 5),
    timing: {
      ...timing,
      summary: textValue(timing?.summary ?? row.timing_summary) || (input.hasDateContext ? "This uses the selected-date relationship context." : "This is mainly a natal relationship pattern."),
      type: timingTypes(timing?.type, input.hasDateContext),
    },
    confidence: confidenceValue(row.confidence),
    technical_basis: {
      ...technicalBasis,
      charts_used: normalizedCharts.length > 0 ? normalizedCharts : basis.charts_used.length > 0 ? basis.charts_used : [basis.fallback_chart],
      houses_used: normalizedHouses.length > 0 ? normalizedHouses : basis.houses_used.length > 0 ? basis.houses_used : [basis.fallback_house],
      planets_used: normalizedPlanets.length > 0 ? normalizedPlanets : basis.planets_used.length > 0 ? basis.planets_used : [basis.fallback_planet],
    },
  };
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

function relationshipAnswerSchemaPrompt() {
  return `Return exactly this JSON shape:
{
  "verdict": "string, max 280 chars",
  "explanation": "string, max 900 chars",
  "advice": ["1-5 practical strings"],
  "why": ["1-5 grounded reason strings"],
  "timing": { "summary": "string", "type": ["natal" | "dasha" | "transit"] },
  "confidence": { "level": "high" | "medium" | "low", "note": "string" },
  "technical_basis": {
    "charts_used": ["self:D1", "other:D9", "D1", or another supplied chart label"],
    "houses_used": [1-12],
    "planets_used": ["Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu"]
  }
}`;
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

${relationshipAnswerSchemaPrompt()}

Return ONLY JSON. technical_basis.charts_used may cite person-scoped labels such as "self:D1" and "other:D9".`;
}

function buildRepairPrompt(input: {
  originalOutput: unknown;
  validationError: unknown;
  insight: RelationshipInsight;
  hasDateContext: boolean;
}) {
  return `Repair the previous relationship answer JSON so it matches the AskAnswer schema.

Validation error:
${input.validationError instanceof Error ? input.validationError.message : String(input.validationError)}

Use only these relationship factors for citations and reasoning:
${JSON.stringify(input.insight.categories, null, 2)}

Timing type must include ${input.hasDateContext ? '"transit" when using selected-date context' : '"natal" unless dasha or transit is explicitly cited'}.

${relationshipAnswerSchemaPrompt()}

Previous output:
${JSON.stringify(input.originalOutput, null, 2)}

Return only the corrected JSON.`;
}

function parseRelationshipAnswer(output: unknown, input: { insight: RelationshipInsight; hasDateContext: boolean }) {
  return AskAnswerSchema.safeParse(normalizeAskAnswerOutput(output, input));
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

  let parsed = parseRelationshipAnswer(firstCall.output, { insight, hasDateContext: Boolean(input.date) });
  let meta = firstCall.meta;
  if (!parsed.success) {
    console.error("Relationship Ask answer validation failed; attempting repair", {
      reason: parsed.error.message,
      issues: parsed.error.issues,
    });
    const repaired = await callWithFallback({
      system: systemPromptV1,
      messages: [{
        role: "user",
        content: buildRepairPrompt({
          originalOutput: firstCall.output,
          validationError: parsed.error,
          insight,
          hasDateContext: Boolean(input.date),
        }),
      }],
      schema: AskAnswerSchema,
      topic: "relationship",
      context_bundle_id: input.relationshipId,
      prompt_versions: {
        system: PROMPT_VERSIONS.system,
        route: "relationship_route_v1",
        user: "relationship_repair_v1",
      },
      answer_schema_version: PROMPT_VERSIONS.answer_schema,
      providers: input.providers,
      temperature: 0,
    });
    parsed = parseRelationshipAnswer(repaired.output, { insight, hasDateContext: Boolean(input.date) });
    meta = {
      ...repaired.meta,
      repaired_from_provider: firstCall.meta.provider,
    };
    if (!parsed.success) {
      throw new LlmProviderError("Relationship Ask returned malformed JSON.", { retryable: false, cause: parsed.error });
    }
  }
  const assistantMessageId = await insertMessages({
    supabase: input.supabase,
    sessionId,
    question: input.question,
    answer: parsed.data,
    meta,
    userId: input.userId,
  });

  return {
    session_id: sessionId,
    assistant_message_id: assistantMessageId,
    answer: parsed.data,
    meta,
  };
}
