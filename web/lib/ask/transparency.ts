import {
  AskAnswerSchema,
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  LlmMetadataSchema,
  type AskAnswer,
  type Chart,
  type LlmMetadata,
  type Planet,
  type Topic,
  type TopicBundle,
} from "@/lib/schemas";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = PromiseLike<{ data: unknown; error: { message: string } | Error | null }> & {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseTransparencyClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

export type TransparencyViewModel = {
  answer_basis: AskAnswer["technical_basis"];
  charts: Array<{
    key: string;
    href: string;
    available: boolean;
    chart?: Chart;
  }>;
  houses: Array<{
    house: number;
    label: string;
    summary: string;
    strength?: "low" | "medium" | "high";
  }>;
  planets: Array<{
    planet: Planet;
    role: string;
    summary: string;
  }>;
  timing: {
    current: string;
    transit_notes: string[];
  };
  birth_time_sensitivity?: {
    confidence: "approximate" | "unknown";
    note: string;
  };
  provider: {
    provider: LlmMetadata["provider"];
    model: string;
    prompt_version: string;
  };
  bundle_outdated: boolean;
};

type MessageRow = {
  id: string;
  role: string;
  content_structured: unknown;
  llm_metadata: unknown;
  ask_sessions?: {
    birth_profile_id?: unknown;
    birth_profiles?: {
      user_id?: unknown;
      birth_time_confidence?: unknown;
    };
  };
};

type SnapshotRow = {
  id?: string;
  schema_version?: string;
  payload: unknown;
};

type ChartRow = {
  payload: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asMessageRow(value: unknown): MessageRow | null {
  const row = asObject(value);
  if (!row || typeof row.id !== "string" || row.role !== "assistant") {
    return null;
  }
  return row as MessageRow;
}

function asSnapshotRow(value: unknown): SnapshotRow | null {
  const row = asObject(value);
  return row && "payload" in row ? (row as SnapshotRow) : null;
}

function errorMessage(error: { message: string } | Error | null, fallback: string) {
  return error?.message ?? fallback;
}

function titleForHouse(house: number) {
  const suffix = house === 1 ? "st" : house === 2 ? "nd" : house === 3 ? "rd" : "th";
  return `${house}${suffix} house`;
}

function fallbackBundle(topic: Topic, answer: AskAnswer): TopicBundle {
  return {
    topic,
    charts_used: answer.technical_basis.charts_used,
    headline_signals: [],
    houses: {},
    planets: {},
    timing: {
      current_mahadasha: "Unavailable",
      current_antardasha: "Unavailable",
      current_trigger_notes: [],
    },
    confidence_note: answer.confidence.note,
  };
}

export function buildTransparencyViewModel(input: {
  answer: AskAnswer;
  metadata: LlmMetadata;
  bundle?: TopicBundle;
  chartPayload?: unknown;
  birthTimeConfidence?: "exact" | "approximate" | "unknown";
  bundleOutdated?: boolean;
}): TransparencyViewModel {
  const topic = input.metadata.classification?.topic ?? (input.metadata.context_bundle_type === "mixed" ? "personality" : input.metadata.context_bundle_type);
  const bundle = input.bundle ?? fallbackBundle(topic, input.answer);
  const chartSnapshot = ChartSnapshotSchema.safeParse(input.chartPayload).success
    ? ChartSnapshotSchema.parse(input.chartPayload)
    : null;
  const confidence = input.birthTimeConfidence ?? chartSnapshot?.birth_time_confidence ?? "exact";
  const showSensitivity = input.metadata.classification?.birth_time_sensitive === true && confidence !== "exact";

  return {
    answer_basis: input.answer.technical_basis,
    charts: input.answer.technical_basis.charts_used.map((key) => ({
      key,
      href: `/charts/${key}`,
      available: Boolean(chartSnapshot?.charts[key]),
      chart: chartSnapshot?.charts[key],
    })),
    houses: input.answer.technical_basis.houses_used.map((house) => {
      const summary = bundle.houses[house]?.summary;
      return {
        house,
        label: titleForHouse(house),
        summary: summary ?? "This house was cited by the answer, but the stored bundle summary is unavailable.",
        strength: bundle.houses[house]?.strength,
      };
    }),
    planets: input.answer.technical_basis.planets_used.map((planet) => {
      const detail = bundle.planets[planet];
      return {
        planet,
        role: detail?.role ?? "Cited factor",
        summary: detail?.summary ?? "This planet was cited by the answer, but the stored bundle summary is unavailable.",
      };
    }),
    timing: {
      current: `${bundle.timing.current_mahadasha} Mahadasha + ${bundle.timing.current_antardasha} Antardasha`,
      transit_notes: bundle.timing.current_trigger_notes,
    },
    birth_time_sensitivity: showSensitivity
      ? {
          confidence,
          note: `This answer depends on your ascendant or house timing. Your birth time is ${confidence}; treat timing with caution.`,
        }
      : undefined,
    provider: {
      provider: input.metadata.provider,
      model: input.metadata.model,
      prompt_version: input.metadata.prompt_version,
    },
    bundle_outdated: input.bundleOutdated ?? false,
  };
}

export async function loadMessageTransparency(input: {
  supabase: SupabaseTransparencyClient;
  userId: string;
  messageId: string;
}): Promise<TransparencyViewModel | null> {
  const { data: messageData, error: messageError } = await input.supabase
    .from("ask_messages")
    .select("id,role,content_structured,llm_metadata,ask_sessions(birth_profile_id,birth_profiles(user_id,birth_time_confidence))")
    .eq("id", input.messageId)
    .maybeSingle();

  if (messageError) {
    throw new Error(errorMessage(messageError, "Could not load Ask message."));
  }

  const message = asMessageRow(messageData);
  const session = message?.ask_sessions;
  if (!message || session?.birth_profiles?.user_id !== input.userId || typeof session.birth_profile_id !== "string") {
    return null;
  }

  const answer = AskAnswerSchema.safeParse(message.content_structured);
  const metadata = LlmMetadataSchema.safeParse(message.llm_metadata);
  if (!answer.success || !metadata.success) {
    throw new Error("Stored Ask message is not compatible with transparency rendering.");
  }

  const [{ data: derivedData, error: derivedError }, { data: chartData, error: chartError }] = await Promise.all([
    input.supabase
      .from("derived_feature_snapshots")
      .select("id,schema_version,payload")
      .eq("birth_profile_id", session.birth_profile_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("chart_snapshots")
      .select("payload")
      .eq("birth_profile_id", session.birth_profile_id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (derivedError || chartError) {
    throw new Error(errorMessage(derivedError ?? chartError, "Could not load transparency context."));
  }

  const derivedRow = asSnapshotRow(derivedData);
  const chartRow = asSnapshotRow(chartData) as ChartRow | null;
  const parsedDerived = DerivedFeaturePayloadSchema.safeParse(derivedRow?.payload);
  const topic = metadata.data.classification?.topic ?? (metadata.data.context_bundle_type === "mixed" ? null : metadata.data.context_bundle_type);
  const bundle = parsedDerived.success && topic ? parsedDerived.data.topic_bundles[topic] : undefined;
  const bundleOutdated = Boolean(metadata.data.context_bundle_id && derivedRow?.id && metadata.data.context_bundle_id !== derivedRow.id);
  const confidence = session.birth_profiles?.birth_time_confidence;

  return buildTransparencyViewModel({
    answer: answer.data,
    metadata: metadata.data,
    bundle,
    chartPayload: chartRow?.payload,
    birthTimeConfidence: confidence === "approximate" || confidence === "unknown" || confidence === "exact" ? confidence : undefined,
    bundleOutdated,
  });
}
