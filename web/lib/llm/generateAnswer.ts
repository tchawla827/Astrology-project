import { AskAnswerSchema, type AskAnswer, type DepthMode, type LlmMetadata, type ToneMode } from "@/lib/schemas";
import { buildContextBundle, type AskContextBundle } from "@/lib/llm/buildContext";
import { classifyQuestion, type AskClassification } from "@/lib/llm/classify";
import { LlmCitationError, LlmSchemaError } from "@/lib/llm/errors";
import { PROMPT_VERSIONS, routePromptFor, systemPromptV1, userPromptV1 } from "@/lib/llm/prompts";
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";
import { applyBirthTimeConsistency, validateAnswer } from "@/lib/llm/validate";

type QueryResult = PromiseLike<{ data: unknown; error: { message: string } | Error | null }>;

type SupabaseQuery = {
  eq(column: string, value: string): SupabaseQuery;
  order(column: string, options: { ascending: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
  maybeSingle(): QueryResult;
};

type SupabaseInsertQuery = {
  select(columns: string): {
    single(): QueryResult;
  };
};

type SupabaseInsertResult = PromiseLike<{ error: { message: string } | Error | null }>;

export type SupabaseAskPersistenceClient = {
  from(table: string): {
    select(columns: string): SupabaseQuery;
    insert(payload: unknown): SupabaseInsertQuery | SupabaseInsertResult;
  };
};

export type GenerateAnswerInput = {
  supabase: SupabaseAskPersistenceClient;
  profile_id: string;
  question: string;
  tone: ToneMode;
  depth: DepthMode;
  session_id?: string;
  providers?: LlmProvider[];
};

type AskSessionRow = {
  id: string;
  birth_profile_id: string;
};

type InsertedSessionRow = {
  id: string;
};

function asSessionRow(value: unknown): AskSessionRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<AskSessionRow>;
  return typeof row.id === "string" && typeof row.birth_profile_id === "string" ? (row as AskSessionRow) : null;
}

function asInsertedSessionRow(value: unknown): InsertedSessionRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as Partial<InsertedSessionRow>;
  return typeof row.id === "string" ? { id: row.id } : null;
}

function errorMessage(error: { message: string } | Error | null, fallback: string) {
  return error?.message ?? fallback;
}

function isInsertQuery(value: SupabaseInsertQuery | SupabaseInsertResult): value is SupabaseInsertQuery {
  return typeof (value as SupabaseInsertQuery).select === "function";
}

async function ensureSession(input: {
  supabase: SupabaseAskPersistenceClient;
  session_id?: string;
  profile_id: string;
  classification: AskClassification;
  tone: ToneMode;
}) {
  if (input.session_id) {
    const { data, error } = await input.supabase
      .from("ask_sessions")
      .select("id,birth_profile_id")
      .eq("id", input.session_id)
      .maybeSingle();

    if (error) {
      throw new Error(errorMessage(error, "Could not load Ask session."));
    }

    const row = asSessionRow(data);
    if (!row) {
      throw new Error("Ask session not found.");
    }
    if (row.birth_profile_id !== input.profile_id) {
      throw new Error("Ask session belongs to a different birth profile.");
    }
    return row.id;
  }

  const insert = input.supabase.from("ask_sessions").insert({
    birth_profile_id: input.profile_id,
    topic: input.classification.topic,
    tone_mode: input.tone,
  });

  if (!isInsertQuery(insert)) {
    throw new Error("Ask session insert did not return a selectable query.");
  }

  const { data, error } = await insert.select("id").single();
  if (error) {
    throw new Error(errorMessage(error, "Could not create Ask session."));
  }

  const row = asInsertedSessionRow(data);
  if (!row) {
    throw new Error("Ask session insert did not return an id.");
  }
  return row.id;
}

async function insertAskMessages(input: {
  supabase: SupabaseAskPersistenceClient;
  session_id: string;
  question: string;
  answer: AskAnswer;
  meta: LlmMetadata;
}) {
  const result = input.supabase.from("ask_messages").insert([
    {
      ask_session_id: input.session_id,
      role: "user",
      content: input.question,
    },
    {
      ask_session_id: input.session_id,
      role: "assistant",
      content_structured: input.answer,
      llm_metadata: input.meta,
    },
  ]);

  const awaited = await result;
  if ("error" in awaited && awaited.error) {
    throw new Error(errorMessage(awaited.error, "Could not store Ask messages."));
  }
}

function buildPrompt(input: {
  context: AskContextBundle;
  question: string;
  tone: ToneMode;
  depth: DepthMode;
}) {
  const route = routePromptFor(input.context.topic);
  const user = userPromptV1({
    context_bundle: input.context,
    question: input.question,
    tone: input.tone,
    depth: input.depth,
  });

  return {
    system: systemPromptV1,
    messages: [{ role: "user" as const, content: `${route}\n\n${user}` }],
    prompt_versions: {
      system: PROMPT_VERSIONS.system,
      route: PROMPT_VERSIONS.route[input.context.topic],
      user: PROMPT_VERSIONS.user,
    },
  };
}

function buildRepairPrompt(input: {
  originalOutput: unknown;
  validationError: Error;
  context: AskContextBundle;
}) {
  return `Repair the previous JSON so it matches the AskAnswer schema and cites only allowed context factors.

Validation error:
${input.validationError.message}

Allowed citations:
${JSON.stringify(input.context.allowed_citations, null, 2)}

Previous output:
${JSON.stringify(input.originalOutput, null, 2)}

Return only the corrected JSON.`;
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<{
  answer: AskAnswer;
  meta: LlmMetadata;
  session_id: string;
  classification: AskClassification;
}> {
  const classification = await classifyQuestion({ question: input.question });
  const context = await buildContextBundle({
    supabase: input.supabase,
    profile_id: input.profile_id,
    topic: classification.topic,
  });

  const prompt = buildPrompt({
    context,
    question: input.question,
    tone: input.tone,
    depth: input.depth,
  });

  const firstCall = await callWithFallback({
    system: prompt.system,
    messages: prompt.messages,
    schema: AskAnswerSchema,
    topic: classification.topic,
    classification,
    context_bundle_id: context.context_id,
    prompt_versions: prompt.prompt_versions,
    providers: input.providers,
  });

  let answer: AskAnswer;
  let meta = firstCall.meta;

  try {
    answer = validateAnswer(firstCall.output, context);
  } catch (error) {
    if (!(error instanceof LlmCitationError || error instanceof LlmSchemaError)) {
      throw error;
    }

    const repaired = await callWithFallback({
      system: systemPromptV1,
      messages: [{ role: "user", content: buildRepairPrompt({ originalOutput: firstCall.output, validationError: error, context }) }],
      schema: AskAnswerSchema,
      topic: classification.topic,
      classification,
      context_bundle_id: context.context_id,
      prompt_versions: prompt.prompt_versions,
      providers: input.providers,
      temperature: 0,
    });
    answer = validateAnswer(repaired.output, context);
    meta = {
      ...repaired.meta,
      repaired_from_provider: firstCall.meta.provider,
    };
  }

  answer = applyBirthTimeConsistency(answer, context, classification);
  const session_id = await ensureSession({
    supabase: input.supabase,
    session_id: input.session_id,
    profile_id: input.profile_id,
    classification,
    tone: input.tone,
  });

  await insertAskMessages({
    supabase: input.supabase,
    session_id,
    question: input.question,
    answer,
    meta,
  });

  return { answer, meta, session_id, classification };
}
