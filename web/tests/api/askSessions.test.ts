import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getSession } from "@/app/api/ask/sessions/[id]/route";
import { GET as getTransparency } from "@/app/api/ask/messages/[id]/transparency/route";
import { GET as listSessions } from "@/app/api/ask/sessions/route";
import { goldenDerivedPayload } from "@/lib/llm/tests/golden-questions";
import type { AskAnswer, LlmMetadata } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

const answer: AskAnswer = {
  verdict: "Career is active.",
  why: ["Saturn is involved."],
  timing: { summary: "Current period", type: ["dasha"] },
  confidence: { level: "medium", note: "Grounded in supplied context." },
  advice: ["Act on the strongest signal first."],
  technical_basis: { charts_used: ["D1"], houses_used: [10], planets_used: ["Saturn"] },
};

const metadata: LlmMetadata = {
  provider: "gemini",
  model: "gemini-mock",
  prompt_version: "ask_v1",
  answer_schema_version: "answer_v1",
  context_bundle_type: "career",
  latency_ms: 1,
};

function query({ singleData, listData }: { singleData?: unknown; listData?: unknown }) {
  const result = { data: listData ?? singleData ?? null, error: null };
  const q = {
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn(() => q),
    maybeSingle: vi.fn(async () => ({ data: singleData ?? null, error: null })),
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return q;
}

describe("/api/ask/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists session summaries with first-question previews", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table === "birth_profiles") {
          return { select: () => query({ singleData: { id: "profile-1", status: "ready" } }) };
        }
        if (table === "ask_sessions") {
          return {
            select: () =>
              query({
                listData: [
                  {
                    id: "session-1",
                    birth_profile_id: "profile-1",
                    topic: "career",
                    tone_mode: "direct",
                    context_kind: "daily",
                    context_date: "2026-04-25",
                    created_at: "2026-04-25T01:00:00Z",
                    ask_messages: [
                      {
                        id: "message-1",
                        ask_session_id: "session-1",
                        role: "user",
                        content: "Why is career stuck?",
                        created_at: "2026-04-25T01:00:01Z",
                      },
                      {
                        id: "message-2",
                        ask_session_id: "session-1",
                        role: "assistant",
                        content_structured: answer,
                        llm_metadata: metadata,
                        created_at: "2026-04-25T01:00:02Z",
                      },
                    ],
                  },
                ],
              }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await listSessions();
    const body = (await response.json()) as {
      sessions?: Array<{ first_question_preview?: string; last_updated?: string; context_kind?: string; context_date?: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.sessions?.[0]?.first_question_preview).toBe("Why is career stuck?");
    expect(body.sessions?.[0]?.last_updated).toBe("2026-04-25T01:00:02Z");
    expect(body.sessions?.[0]?.context_kind).toBe("daily");
    expect(body.sessions?.[0]?.context_date).toBe("2026-04-25");
  });

  it("returns one resumed session with ordered messages", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table === "ask_sessions") {
          return {
            select: () =>
              query({
                singleData: {
                  id: "session-1",
                  birth_profile_id: "profile-1",
                  topic: "career",
                  tone_mode: "direct",
                  context_kind: "daily",
                  context_date: "2026-04-25",
                  created_at: "2026-04-25T01:00:00Z",
                },
              }),
          };
        }
        if (table === "birth_profiles") {
          return { select: () => query({ singleData: { id: "profile-1" } }) };
        }
        if (table === "ask_messages") {
          return {
            select: () =>
              query({
                listData: [
                  {
                    id: "message-2",
                    ask_session_id: "session-1",
                    role: "assistant",
                    content_structured: answer,
                    llm_metadata: metadata,
                    created_at: "2026-04-25T01:00:02Z",
                  },
                  {
                    id: "message-1",
                    ask_session_id: "session-1",
                    role: "user",
                    content: "Why is career stuck?",
                    created_at: "2026-04-25T01:00:01Z",
                  },
                ],
              }),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await getSession({} as never, { params: { id: "session-1" } });
    const body = (await response.json()) as { session?: { context_date?: string }; messages?: Array<{ role?: string }> };

    expect(response.status).toBe(200);
    expect(body.session?.context_date).toBe("2026-04-25");
    expect(body.messages?.map((message) => message.role)).toEqual(["user", "assistant"]);
  });

  it("returns transparency details for a stored assistant message", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table === "ask_messages") {
          return {
            select: () =>
              query({
                singleData: {
                  id: "message-2",
                  role: "assistant",
                  content_structured: answer,
                  llm_metadata: {
                    ...metadata,
                    context_bundle_id: "derived-1",
                    classification: {
                      topic: "career",
                      needs_timing: false,
                      needs_technical_depth: false,
                      birth_time_sensitive: true,
                      is_mixed: false,
                      matched_terms: ["career"],
                      confidence: "high",
                    },
                  },
                  ask_sessions: {
                    birth_profile_id: "profile-1",
                    birth_profiles: {
                      user_id: "user-1",
                      birth_time_confidence: "approximate",
                    },
                  },
                },
              }),
          };
        }
        if (table === "derived_feature_snapshots") {
          return { select: () => query({ singleData: { id: "derived-1", schema_version: "derived_v1", payload: goldenDerivedPayload } }) };
        }
        if (table === "chart_snapshots") {
          return { select: () => query({ singleData: { payload: goldenSnapshot } }) };
        }
        throw new Error(`Unexpected table ${table}`);
      },
    });

    const response = await getTransparency({} as never, { params: { id: "message-2" } });
    const body = (await response.json()) as {
      transparency?: { charts?: Array<{ key: string }>; birth_time_sensitivity?: { confidence: string } };
    };

    expect(response.status).toBe(200);
    expect(body.transparency?.charts?.map((chart) => chart.key)).toEqual(["D1"]);
    expect(body.transparency?.birth_time_sensitivity?.confidence).toBe("approximate");
  });
});
