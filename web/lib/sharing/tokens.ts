import { z } from "zod";

import { AskAnswerSchema, ToneModeSchema, TopicSchema, type AskAnswer, type ToneMode, type Topic } from "@/lib/schemas";

const PublicShareAnswerSchema = AskAnswerSchema.pick({
  verdict: true,
  why: true,
  timing: true,
  confidence: true,
});

const PublicSharePayloadSchema = z.object({
  token: z.string().min(8),
  ask_message_id: z.string().uuid(),
  topic: z.union([TopicSchema, z.literal("mixed")]),
  tone_mode: ToneModeSchema,
  answer: PublicShareAnswerSchema,
  charts_used: z.array(z.string()),
  created_at: z.string(),
});

export type PublicShareAnswer = z.infer<typeof PublicShareAnswerSchema>;
export type PublicSharePayload = z.infer<typeof PublicSharePayloadSchema>;

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type QueryBuilder = QueryResult & {
  eq(column: string, value: string): QueryBuilder;
  is(column: string, value: null): QueryBuilder;
  gt(column: string, value: string): QueryBuilder;
  order(column: string, options: { ascending: boolean }): QueryBuilder;
  limit(count: number): QueryBuilder;
  maybeSingle(): QueryResult;
  single(): QueryResult;
  select(columns: string): QueryBuilder;
};

export type SupabaseShareClient = {
  from(table: string): {
    select(columns: string): QueryBuilder;
    insert(value: Record<string, unknown>): QueryBuilder;
    update(value: Record<string, unknown>): QueryBuilder;
  };
  rpc(functionName: string, args: Record<string, unknown>): QueryBuilder;
};

type MessageRow = {
  id: string;
  content_structured: unknown;
  ask_sessions?: unknown;
};

type ShareTokenRow = {
  token: string;
  expires_at: string | null;
  revoked_at: string | null;
};

const PROFANITY_PATTERNS = [
  /\bfuck(?:ing|er|ed)?\b/i,
  /\bshit(?:ty)?\b/i,
  /\bbitch(?:es)?\b/i,
  /\basshole\b/i,
  /\bcunt\b/i,
  /\bdick(?:head)?\b/i,
];

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function firstNested(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return asObject(value[0]);
  }
  return asObject(value);
}

function asMessageRow(value: unknown): MessageRow | null {
  const row = asObject(value);
  if (!row || typeof row.id !== "string" || !("content_structured" in row)) {
    return null;
  }
  return {
    id: row.id,
    content_structured: row.content_structured,
    ask_sessions: row.ask_sessions,
  };
}

function asShareTokenRow(value: unknown): ShareTokenRow | null {
  const row = asObject(value);
  if (!row || typeof row.token !== "string") {
    return null;
  }
  return {
    token: row.token,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    revoked_at: typeof row.revoked_at === "string" ? row.revoked_at : null,
  };
}

function toIsoString(value: unknown) {
  return typeof value === "string" ? value : new Date().toISOString();
}

export function generateShareToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getSiteUrl(origin?: string | null) {
  if (origin) {
    return origin.replace(/\/$/, "");
  }
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (!configured) {
    return "http://localhost:3000";
  }
  return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`;
}

export function makeShareUrl(token: string, origin?: string | null) {
  return `${getSiteUrl(origin)}/share/${token}`;
}

export function moderateShareAnswer(answer: Pick<AskAnswer, "verdict" | "why">) {
  const values = [answer.verdict, ...answer.why];
  const tooLong =
    answer.verdict.length > 220 ||
    answer.why.length > 3 ||
    answer.why.some((item) => item.length > 220) ||
    values.join(" ").length > 760;
  const flagged = values.some((value) => PROFANITY_PATTERNS.some((pattern) => pattern.test(value)));

  return {
    allowed: !tooLong && !flagged,
    reason: tooLong ? "length" : flagged ? "profanity" : null,
  };
}

export async function loadPublicSharePayload(input: {
  supabase: SupabaseShareClient;
  token: string;
}): Promise<PublicSharePayload | null> {
  const { data, error } = await input.supabase.rpc("get_shared_ask_answer", { input_token: input.token }).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  const row = asObject(data);
  if (!row) {
    return null;
  }

  const parsed = PublicSharePayloadSchema.safeParse({
    token: row.token,
    ask_message_id: row.ask_message_id,
    topic: row.topic,
    tone_mode: row.tone_mode,
    answer: row.answer,
    charts_used: Array.isArray(row.charts_used) ? row.charts_used : [],
    created_at: toIsoString(row.created_at),
  });

  return parsed.success ? parsed.data : null;
}

export async function loadShareableMessage(input: {
  supabase: SupabaseShareClient;
  messageId: string;
}): Promise<Omit<PublicSharePayload, "token" | "created_at"> | null> {
  const { data, error } = await input.supabase
    .from("ask_messages")
    .select("id,content_structured,ask_sessions(id,topic,tone_mode)")
    .eq("id", input.messageId)
    .eq("role", "assistant")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = asMessageRow(data);
  const session = firstNested(row?.ask_sessions);
  if (!row || !session) {
    return null;
  }

  const answer = AskAnswerSchema.safeParse(row.content_structured);
  const topic = session.topic === "mixed" ? "mixed" : TopicSchema.safeParse(session.topic).success ? (session.topic as Topic) : null;
  const tone = ToneModeSchema.safeParse(session.tone_mode);
  if (!answer.success || !topic || !tone.success) {
    return null;
  }

  return {
    ask_message_id: row.id,
    topic,
    tone_mode: tone.data,
    answer: {
      verdict: answer.data.verdict,
      why: answer.data.why,
      timing: answer.data.timing,
      confidence: answer.data.confidence,
    },
    charts_used: answer.data.technical_basis.charts_used,
  };
}

export async function mintShareToken(input: {
  supabase: SupabaseShareClient;
  askMessageId: string;
  userId: string;
}) {
  const { data: existingData, error: existingError } = await input.supabase
    .from("share_tokens")
    .select("token,expires_at,revoked_at")
    .eq("ask_message_id", input.askMessageId)
    .eq("created_by", input.userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = asShareTokenRow(existingData);
  if (existing && (!existing.expires_at || Date.parse(existing.expires_at) > Date.now())) {
    return existing.token;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateShareToken();
    const { data, error } = await input.supabase
      .from("share_tokens")
      .insert({ ask_message_id: input.askMessageId, token, created_by: input.userId })
      .select("token")
      .single();

    if (!error) {
      const row = asShareTokenRow(data);
      if (row) {
        return row.token;
      }
      throw new Error("Could not read minted share token.");
    }

    if (!error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
  }

  throw new Error("Could not mint a share token.");
}

export async function revokeShareToken(input: {
  supabase: SupabaseShareClient;
  token: string;
  userId: string;
}) {
  const { error } = await input.supabase
    .from("share_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", input.token)
    .eq("created_by", input.userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(error.message);
  }
}
