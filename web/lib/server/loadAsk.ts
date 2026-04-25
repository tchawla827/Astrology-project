import {
  AskAnswerSchema,
  ChartSnapshotSchema,
  DerivedFeaturePayloadSchema,
  LlmMetadataSchema,
  ToneModeSchema,
  TopicSchema,
  type AskAnswer,
  type LlmMetadata,
  type ToneMode,
  type Topic,
} from "@/lib/schemas";
import { buildStarterQuestions } from "@/lib/ask/starters";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = PromiseLike<{ data: unknown; error: { message: string } | Error | null }> & {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

export type SupabaseAskUiClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

export type AskSessionSummary = {
  id: string;
  birth_profile_id: string;
  topic: Topic | "mixed";
  tone_mode: ToneMode;
  created_at: string;
  first_question_preview: string;
  last_updated: string;
};

export type AskThreadMessage =
  | {
      id: string;
      ask_session_id: string;
      role: "user";
      content: string;
      created_at: string;
    }
  | {
      id: string;
      ask_session_id: string;
      role: "assistant";
      content_structured: AskAnswer;
      llm_metadata: LlmMetadata;
      created_at: string;
    };

export type AskThread = {
  session: AskSessionSummary;
  messages: AskThreadMessage[];
};

export type AskShellContext =
  | { status: "empty" }
  | { status: "processing" | "error"; errorMessage?: string }
  | {
      status: "ready";
      profileId: string;
      defaultToneMode: ToneMode;
      sessions: AskSessionSummary[];
      starterQuestions: string[];
    };

type ProfileRow = {
  id: string;
  status: "processing" | "ready" | "error";
};

type UserProfileRow = {
  default_tone_mode: ToneMode | null;
};

type SessionRow = {
  id: string;
  birth_profile_id: string;
  topic: string;
  tone_mode: string;
  created_at: string;
  ask_messages?: unknown[];
};

type MessageRow = {
  id: string;
  ask_session_id: string;
  role: string;
  content?: string | null;
  content_structured?: unknown;
  llm_metadata?: unknown;
  created_at: string;
};

type ChartRow = {
  payload: unknown;
};

type DerivedRow = {
  payload: unknown;
};

function errorMessage(error: { message: string } | Error | null, fallback: string) {
  return error?.message ?? fallback;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asProfile(value: unknown): ProfileRow | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }
  if (
    typeof row.id === "string" &&
    (row.status === "processing" || row.status === "ready" || row.status === "error")
  ) {
    return { id: row.id, status: row.status };
  }
  return null;
}

function asUserProfile(value: unknown): UserProfileRow | null {
  const row = asObject(value);
  if (!row) {
    return null;
  }
  const parsed = ToneModeSchema.nullable().safeParse(row.default_tone_mode);
  return parsed.success ? { default_tone_mode: parsed.data } : null;
}

function asChartRow(value: unknown): ChartRow | null {
  const row = asObject(value);
  return row && "payload" in row ? { payload: row.payload } : null;
}

function asDerivedRow(value: unknown): DerivedRow | null {
  const row = asObject(value);
  return row && "payload" in row ? { payload: row.payload } : null;
}

function normalizeMessages(rows: unknown[] | undefined): AskThreadMessage[] {
  return (rows ?? [])
    .map((value) => {
      const row = asObject(value) as Partial<MessageRow> | null;
      if (
        !row ||
        typeof row.id !== "string" ||
        typeof row.ask_session_id !== "string" ||
        typeof row.created_at !== "string"
      ) {
        return null;
      }

      if (row.role === "user" && typeof row.content === "string") {
        return {
          id: row.id,
          ask_session_id: row.ask_session_id,
          role: "user" as const,
          content: row.content,
          created_at: row.created_at,
        };
      }

      if (row.role === "assistant") {
        const answer = AskAnswerSchema.safeParse(row.content_structured);
        const metadata = LlmMetadataSchema.safeParse(row.llm_metadata);
        if (answer.success && metadata.success) {
          return {
            id: row.id,
            ask_session_id: row.ask_session_id,
            role: "assistant" as const,
            content_structured: answer.data,
            llm_metadata: metadata.data,
            created_at: row.created_at,
          };
        }
      }

      return null;
    })
    .filter((message): message is AskThreadMessage => Boolean(message))
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
}

function normalizeSession(value: unknown): AskSessionSummary | null {
  const row = asObject(value) as Partial<SessionRow> | null;
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.birth_profile_id !== "string" ||
    typeof row.topic !== "string" ||
    typeof row.tone_mode !== "string" ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }

  const topic = row.topic === "mixed" ? "mixed" : TopicSchema.safeParse(row.topic).success ? (row.topic as Topic) : null;
  const tone = ToneModeSchema.safeParse(row.tone_mode);
  if (!topic || !tone.success) {
    return null;
  }

  const messages = normalizeMessages(row.ask_messages);
  const firstUserMessage = messages.find((message) => message.role === "user");
  const latestMessage = messages.at(-1);

  return {
    id: row.id,
    birth_profile_id: row.birth_profile_id,
    topic,
    tone_mode: tone.data,
    created_at: row.created_at,
    first_question_preview: firstUserMessage?.role === "user" ? firstUserMessage.content : "New Ask session",
    last_updated: latestMessage?.created_at ?? row.created_at,
  };
}

export async function resolveLatestAskProfile(supabase: SupabaseAskUiClient, userId: string) {
  const { data, error } = await supabase
    .from("birth_profiles")
    .select("id,status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: errorMessage(error, "Could not load birth profile."), status: 500 as const };
  }

  const profile = asProfile(data);
  if (!profile) {
    return { status: 404 as const };
  }
  if (profile.status === "processing") {
    return { error: "Profile generation is still running.", status: 409 as const };
  }
  if (profile.status === "error") {
    return { error: "Profile generation failed. Regenerate the chart before asking.", status: 409 as const };
  }

  return { profileId: profile.id };
}

export async function loadAskSessionSummaries(supabase: SupabaseAskUiClient, profileId: string) {
  const { data, error } = await supabase
    .from("ask_sessions")
    .select("id,birth_profile_id,topic,tone_mode,created_at,ask_messages(id,ask_session_id,role,content,content_structured,llm_metadata,created_at)")
    .eq("birth_profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(errorMessage(error, "Could not load Ask sessions."));
  }

  return (Array.isArray(data) ? data : [])
    .map(normalizeSession)
    .filter((session): session is AskSessionSummary => Boolean(session));
}

export async function loadAskThread(supabase: SupabaseAskUiClient, userId: string, sessionId: string): Promise<AskThread | null> {
  const { data: sessionData, error: sessionError } = await supabase
    .from("ask_sessions")
    .select("id,birth_profile_id,topic,tone_mode,created_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(errorMessage(sessionError, "Could not load Ask session."));
  }

  const session = normalizeSession(sessionData);
  if (!session) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("birth_profiles")
    .select("id")
    .eq("id", session.birth_profile_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(errorMessage(profileError, "Could not verify Ask session owner."));
  }
  if (!asObject(profileData)) {
    return null;
  }

  const { data: messageData, error: messageError } = await supabase
    .from("ask_messages")
    .select("id,ask_session_id,role,content,content_structured,llm_metadata,created_at")
    .eq("ask_session_id", session.id)
    .order("created_at", { ascending: true });

  if (messageError) {
    throw new Error(errorMessage(messageError, "Could not load Ask messages."));
  }

  const messages = normalizeMessages(Array.isArray(messageData) ? messageData : []);
  const firstUserMessage = messages.find((message) => message.role === "user");
  const latestMessage = messages.at(-1);

  return {
    session: {
      ...session,
      first_question_preview: firstUserMessage?.role === "user" ? firstUserMessage.content : session.first_question_preview,
      last_updated: latestMessage?.created_at ?? session.last_updated,
    },
    messages,
  };
}

export async function loadAskShellContext(
  supabase: SupabaseAskUiClient,
  userId: string,
  topic?: Topic,
): Promise<AskShellContext> {
  const profile = await resolveLatestAskProfile(supabase, userId);
  if ("status" in profile) {
    if (profile.status === 404) {
      return { status: "empty" };
    }
    return {
      status: profile.status === 409 ? "processing" : "error",
      errorMessage: profile.error,
    };
  }

  const [{ data: userProfileData }, sessions, { data: chartData, error: chartError }, { data: derivedData, error: derivedError }] =
    await Promise.all([
      supabase.from("user_profiles").select("default_tone_mode").eq("id", userId).maybeSingle(),
      loadAskSessionSummaries(supabase, profile.profileId),
      supabase
        .from("chart_snapshots")
        .select("payload")
        .eq("birth_profile_id", profile.profileId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("derived_feature_snapshots")
        .select("payload")
        .eq("birth_profile_id", profile.profileId)
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (chartError || derivedError) {
    return {
      status: "error",
      errorMessage: errorMessage(chartError ?? derivedError, "Could not load chart context for Ask Astrology."),
    };
  }

  const chartRow = asChartRow(chartData);
  const derivedRow = asDerivedRow(derivedData);
  const parsedChart = ChartSnapshotSchema.safeParse(chartRow?.payload);
  const parsedDerived = DerivedFeaturePayloadSchema.safeParse(derivedRow?.payload);

  if (!parsedChart.success || !parsedDerived.success) {
    return {
      status: "error",
      errorMessage: "The stored chart context is not ready for Ask Astrology.",
    };
  }

  return {
    status: "ready",
    profileId: profile.profileId,
    defaultToneMode: asUserProfile(userProfileData)?.default_tone_mode ?? "direct",
    sessions,
    starterQuestions: buildStarterQuestions({
      derived: parsedDerived.data,
      snapshot: parsedChart.data,
      topic,
    }),
  };
}
