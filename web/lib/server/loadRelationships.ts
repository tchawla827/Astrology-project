import {
  AskAnswerSchema,
  LlmMetadataSchema,
  RelationshipInsightSchema,
  RelationshipLabelSchema,
  ToneModeSchema,
  type AskAnswer,
  type LlmMetadata,
  type RelationshipInsight,
  type RelationshipLabel,
  type ToneMode,
} from "@/lib/schemas";
import { labelText } from "@/lib/relationships/labels";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = QueryResult & {
  eq(column: string, value: string): SupabaseQuery;
  neq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
  single(): QueryResult;
  select(columns: string): SupabaseQuery;
};

export type SupabaseRelationshipsClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
  };
};

export type RelationshipSummary = {
  id: string;
  status: "active" | "revoked";
  other_user_id: string;
  other_name: string;
  self_label: RelationshipLabel;
  other_label: RelationshipLabel;
  created_at: string;
};

export type RelationshipInviteSummary = {
  id: string;
  token: string;
  requester_user_id: string;
  requester_name: string;
  requester_label: RelationshipLabel;
  recipient_label: RelationshipLabel;
  status: string;
  expires_at: string;
  created_at: string;
};

type RelationshipInviteRowSummary = RelationshipInviteSummary & {
  requester_birth_profile_id: string;
};

export type RelationshipAskThreadMessage =
  | {
      id: string;
      relationship_ask_session_id: string;
      role: "user";
      content: string;
      created_by?: string | null;
      created_at: string;
    }
  | {
      id: string;
      relationship_ask_session_id: string;
      role: "assistant";
      content_structured: AskAnswer;
      llm_metadata: LlmMetadata;
      created_by?: string | null;
      created_at: string;
    };

export type RelationshipAskSessionSummary = {
  id: string;
  relationship_id: string;
  tone_mode: ToneMode;
  depth: "simple" | "technical";
  context_kind: "natal" | "daily";
  context_date?: string;
  created_at: string;
  first_question_preview: string;
  last_updated: string;
  messages: RelationshipAskThreadMessage[];
};

export type RelationshipsIndexView = {
  relationships: RelationshipSummary[];
  invites: RelationshipInviteSummary[];
};

export type RelationshipWorkspaceView = {
  relationship: RelationshipSummary;
  insight?: RelationshipInsight;
  sessions: RelationshipAskSessionSummary[];
};

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstNested(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return asObject(value[0]);
  }
  return asObject(value);
}

function parseLabel(value: unknown): RelationshipLabel {
  const parsed = RelationshipLabelSchema.safeParse(value);
  return parsed.success ? parsed.data : "friend";
}

function parseTone(value: unknown): ToneMode {
  const parsed = ToneModeSchema.safeParse(value);
  return parsed.success ? parsed.data : "direct";
}

function nameFromProfile(value: unknown, fallback: string) {
  const profile = firstNested(value);
  return typeof profile?.name === "string" ? profile.name : fallback;
}

function normalizeRelationship(row: unknown, userId: string): RelationshipSummary | null {
  const object = asObject(row);
  if (!object || typeof object.relationship_id !== "string" || typeof object.user_id !== "string") {
    return null;
  }
  const relationship = firstNested(object.relationships);
  if (!relationship || relationship.status !== "active") {
    return null;
  }
  const other = firstNested(object.other_participant);
  return {
    id: object.relationship_id,
    status: "active",
    other_user_id: typeof other?.user_id === "string" ? other.user_id : "",
    other_name: nameFromProfile(other?.birth_profiles, "Connected profile"),
    self_label: parseLabel(object.label_for_other),
    other_label: parseLabel(other?.label_for_other),
    created_at: typeof relationship.created_at === "string" ? relationship.created_at : new Date().toISOString(),
  };
}

function normalizeParticipantRow(row: unknown): {
  relationship_id: string;
  user_id: string;
  birth_profile_id: string;
  label_for_other: RelationshipLabel;
  created_at: string;
} | null {
  const object = asObject(row);
  if (
    !object ||
    typeof object.relationship_id !== "string" ||
    typeof object.user_id !== "string" ||
    typeof object.birth_profile_id !== "string"
  ) {
    return null;
  }
  return {
    relationship_id: object.relationship_id,
    user_id: object.user_id,
    birth_profile_id: object.birth_profile_id,
    label_for_other: parseLabel(object.label_for_other),
    created_at: typeof object.created_at === "string" ? object.created_at : new Date().toISOString(),
  };
}

async function loadProfileName(supabase: SupabaseRelationshipsClient, birthProfileId: string) {
  const { data } = await supabase.from("birth_profiles").select("name").eq("id", birthProfileId).maybeSingle();
  const row = asObject(data);
  return typeof row?.name === "string" ? row.name : "Connected profile";
}

function normalizeInvite(row: unknown): RelationshipInviteRowSummary | null {
  const object = asObject(row);
  if (
    !object ||
    typeof object.id !== "string" ||
    typeof object.token !== "string" ||
    typeof object.requester_user_id !== "string" ||
    typeof object.requester_birth_profile_id !== "string" ||
    typeof object.expires_at !== "string" ||
    typeof object.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: object.id,
    token: object.token,
    requester_user_id: object.requester_user_id,
    requester_birth_profile_id: object.requester_birth_profile_id,
    requester_name: "Your profile",
    requester_label: parseLabel(object.requester_label),
    recipient_label: parseLabel(object.recipient_label),
    status: typeof object.status === "string" ? object.status : "pending",
    expires_at: object.expires_at,
    created_at: object.created_at,
  };
}

function normalizeMessages(rows: unknown[] | undefined): RelationshipAskThreadMessage[] {
  return (rows ?? [])
    .map((value): RelationshipAskThreadMessage | null => {
      const row = asObject(value);
      if (
        !row ||
        typeof row.id !== "string" ||
        typeof row.relationship_ask_session_id !== "string" ||
        typeof row.role !== "string" ||
        typeof row.created_at !== "string"
      ) {
        return null;
      }
      if (row.role === "user" && typeof row.content === "string") {
        return {
          id: row.id,
          relationship_ask_session_id: row.relationship_ask_session_id,
          role: "user" as const,
          content: row.content,
          created_by: typeof row.created_by === "string" ? row.created_by : null,
          created_at: row.created_at,
        };
      }
      if (row.role === "assistant") {
        const answer = AskAnswerSchema.safeParse(row.content_structured);
        const meta = LlmMetadataSchema.safeParse(row.llm_metadata);
        if (answer.success && meta.success) {
          return {
            id: row.id,
            relationship_ask_session_id: row.relationship_ask_session_id,
            role: "assistant" as const,
            content_structured: answer.data,
            llm_metadata: meta.data,
            created_by: typeof row.created_by === "string" ? row.created_by : null,
            created_at: row.created_at,
          };
        }
      }
      return null;
    })
    .filter((message): message is RelationshipAskThreadMessage => Boolean(message))
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at));
}

function normalizeAskSession(row: unknown): RelationshipAskSessionSummary | null {
  const object = asObject(row);
  if (
    !object ||
    typeof object.id !== "string" ||
    typeof object.relationship_id !== "string" ||
    typeof object.created_at !== "string"
  ) {
    return null;
  }
  const messages = normalizeMessages(Array.isArray(object.relationship_ask_messages) ? object.relationship_ask_messages : []);
  const firstUserMessage = messages.find((message) => message.role === "user");
  const latestMessage = messages.at(-1);
  return {
    id: object.id,
    relationship_id: object.relationship_id,
    tone_mode: parseTone(object.tone_mode),
    depth: object.depth === "technical" ? "technical" : "simple",
    context_kind: object.context_kind === "daily" && typeof object.context_date === "string" ? "daily" : "natal",
    context_date: object.context_kind === "daily" && typeof object.context_date === "string" ? object.context_date : undefined,
    created_at: object.created_at,
    first_question_preview: firstUserMessage?.role === "user" ? firstUserMessage.content : "New relationship Ask",
    last_updated: latestMessage?.created_at ?? object.created_at,
    messages,
  };
}

export async function loadRelationshipsIndex(
  supabase: SupabaseRelationshipsClient,
  userId: string,
): Promise<RelationshipsIndexView> {
  const [{ data: participantData, error: participantError }, { data: inviteData, error: inviteError }] = await Promise.all([
    supabase
      .from("relationship_participants")
      .select("relationship_id,user_id,birth_profile_id,label_for_other,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("relationship_invites")
      .select("id,token,requester_user_id,requester_birth_profile_id,requester_label,recipient_label,status,expires_at,created_at")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (participantError) {
    throw new Error(participantError.message);
  }
  if (inviteError) {
    throw new Error(inviteError.message);
  }

  const ownParticipants = (Array.isArray(participantData) ? participantData : [])
    .map(normalizeParticipantRow)
    .filter((row): row is NonNullable<ReturnType<typeof normalizeParticipantRow>> => Boolean(row));
  const relationships = await Promise.all(
    ownParticipants.map(async (own): Promise<RelationshipSummary | null> => {
      const [{ data: relationshipData }, { data: participantsData }] = await Promise.all([
        supabase.from("relationships").select("id,status,created_at").eq("id", own.relationship_id).maybeSingle(),
        supabase
          .from("relationship_participants")
          .select("relationship_id,user_id,birth_profile_id,label_for_other,created_at")
          .eq("relationship_id", own.relationship_id),
      ]);
      const relationshipRow = asObject(relationshipData);
      if (!relationshipRow || relationshipRow.status !== "active") {
        return null;
      }
      const other = (Array.isArray(participantsData) ? participantsData : [])
        .map(normalizeParticipantRow)
        .find((participant) => participant?.user_id !== userId);
      if (!other) {
        return null;
      }
      return {
        id: own.relationship_id,
        status: "active" as const,
        other_user_id: other.user_id,
        other_name: await loadProfileName(supabase, other.birth_profile_id),
        self_label: own.label_for_other,
        other_label: other.label_for_other,
        created_at: typeof relationshipRow.created_at === "string" ? relationshipRow.created_at : own.created_at,
      };
    }),
  );

  return {
    relationships: relationships.filter((row): row is RelationshipSummary => row !== null),
    invites: await Promise.all(
      (Array.isArray(inviteData) ? inviteData : [])
        .map(normalizeInvite)
        .filter((row): row is RelationshipInviteRowSummary => Boolean(row))
        .map(async (invite) => ({
          ...invite,
          requester_name: await loadProfileName(supabase, invite.requester_birth_profile_id),
        })),
    ),
  };
}

async function loadRelationshipSummary(input: {
  supabase: SupabaseRelationshipsClient;
  userId: string;
  relationshipId: string;
}) {
  const { data, error } = await input.supabase
    .from("relationship_participants")
    .select("relationship_id,user_id,birth_profile_id,label_for_other,created_at")
    .eq("relationship_id", input.relationshipId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const own = normalizeParticipantRow(data);
  if (!own) {
    return null;
  }
  const [{ data: relationshipData }, { data: participantsData }] = await Promise.all([
    input.supabase.from("relationships").select("id,status,created_at").eq("id", input.relationshipId).maybeSingle(),
    input.supabase
      .from("relationship_participants")
      .select("relationship_id,user_id,birth_profile_id,label_for_other,created_at")
      .eq("relationship_id", input.relationshipId),
  ]);
  const relationshipRow = asObject(relationshipData);
  if (!relationshipRow || relationshipRow.status !== "active") {
    return null;
  }
  const other = (Array.isArray(participantsData) ? participantsData : [])
    .map(normalizeParticipantRow)
    .find((participant) => participant?.user_id !== input.userId);
  if (!other) {
    return null;
  }
  return {
    id: input.relationshipId,
    status: "active" as const,
    other_user_id: other.user_id,
    other_name: await loadProfileName(input.supabase, other.birth_profile_id),
    self_label: own.label_for_other,
    other_label: other.label_for_other,
    created_at: typeof relationshipRow.created_at === "string" ? relationshipRow.created_at : own.created_at,
  };
}

export async function loadRelationshipWorkspace(input: {
  supabase: SupabaseRelationshipsClient;
  userId: string;
  relationshipId: string;
}): Promise<RelationshipWorkspaceView | null> {
  const relationship = await loadRelationshipSummary(input);
  if (!relationship) {
    return null;
  }

  const [{ data: insightData, error: insightError }, { data: sessionData, error: sessionError }] = await Promise.all([
    input.supabase
      .from("relationship_insight_snapshots")
      .select("payload")
      .eq("relationship_id", input.relationshipId)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    input.supabase
      .from("relationship_ask_sessions")
      .select(
        "id,relationship_id,tone_mode,depth,context_kind,context_date,created_at,relationship_ask_messages(id,relationship_ask_session_id,role,content,content_structured,llm_metadata,created_by,created_at)",
      )
      .eq("relationship_id", input.relationshipId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (insightError) {
    throw new Error(insightError.message);
  }
  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const insightPayload = asObject(insightData)?.payload;
  const parsedInsight = RelationshipInsightSchema.safeParse(insightPayload);

  return {
    relationship,
    insight: parsedInsight.success ? parsedInsight.data : undefined,
    sessions: (Array.isArray(sessionData) ? sessionData : [])
      .map(normalizeAskSession)
      .filter((session): session is RelationshipAskSessionSummary => Boolean(session)),
  };
}

export function describeRelationship(summary: RelationshipSummary) {
  return `${labelText(summary.self_label)} / ${labelText(summary.other_label)}`;
}
