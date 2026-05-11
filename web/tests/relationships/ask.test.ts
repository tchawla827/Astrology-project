import { describe, expect, it, vi } from "vitest";

import { generateRelationshipAnswer, type SupabaseRelationshipAskClient } from "@/lib/relationships/ask";
import type { LlmProvider } from "@/lib/llm/providers";
import type { AskAnswer } from "@/lib/schemas";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

vi.mock("@/lib/astro/client", () => ({
  getCompatibility: vi.fn(async () => ({
    engine_version: "astro_engine_test",
    polarity: "mixed",
    factors: [
      {
        category: "emotional rhythm",
        polarity: "strength",
        title: "Shared emotional rhythm",
        summary: "Moon and Venus give the bond a usable emotional channel.",
        citations: [{ person: "both", charts: ["D1"], houses: [7], planets: ["Moon", "Venus"] }],
        confidence: "medium",
      },
      {
        category: "friction",
        polarity: "friction",
        title: "Boundary friction",
        summary: "Mars pressure makes the relationship need cleaner boundaries.",
        citations: [{ person: "self", charts: ["D9"], houses: [7], planets: ["Mars"] }],
        confidence: "medium",
      },
    ],
  })),
  getTransits: vi.fn(async () => ({
    as_of: "2026-05-11T00:00:00.000Z",
    highlights: [],
    overlay: { planet_to_house: {} },
  })),
}));

const relationshipId = "00000000-0000-4000-8000-000000000101";
const selfUserId = "00000000-0000-4000-8000-000000000201";
const otherUserId = "00000000-0000-4000-8000-000000000202";
const selfProfileId = "00000000-0000-4000-8000-000000000301";
const otherProfileId = "00000000-0000-4000-8000-000000000302";

type StoredSession = {
  id: string;
  relationship_id: string;
  created_by: string;
  tone_mode: string;
  depth: string;
  context_kind: "natal" | "daily";
  context_date: string | null;
};

type StoredMessage = {
  id: string;
  relationship_ask_session_id: string;
  role: "user" | "assistant";
  content?: string;
  content_structured?: AskAnswer;
  llm_metadata?: unknown;
  created_by: string;
};

function thenable(data: unknown, error: { message: string } | null = null) {
  return {
    then(onfulfilled: (value: { data: unknown; error: { message: string } | null }) => unknown, onrejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data, error }).then(onfulfilled, onrejected);
    },
  };
}

class SelectQuery {
  private readonly filters: Array<{ column: string; value: string }> = [];

  constructor(
    private readonly client: RelationshipAskSupabaseMock,
    private readonly table: string,
  ) {}

  eq(column: string, value: string) {
    this.filters.push({ column, value });
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    return Promise.resolve({ data: this.client.selectSingle(this.table, this.filters), error: null });
  }

  single() {
    return Promise.resolve({ data: this.client.selectSingle(this.table, this.filters), error: null });
  }

  select() {
    return this;
  }

  then(onfulfilled: (value: { data: unknown; error: null }) => unknown, onrejected?: (reason: unknown) => unknown) {
    return Promise.resolve({ data: this.client.selectMany(this.table, this.filters), error: null }).then(onfulfilled, onrejected);
  }
}

class RelationshipAskSupabaseMock {
  readonly sessions: StoredSession[] = [];
  readonly messages: StoredMessage[] = [];
  readonly insightRows: unknown[] = [];

  from(table: string) {
    const client = this;
    return {
      select() {
        return new SelectQuery(client, table);
      },
      insert(payload: unknown) {
        if (table === "relationship_ask_sessions") {
          const session = {
            ...(payload as Omit<StoredSession, "id">),
            id: "00000000-0000-4000-8000-000000000401",
          };
          client.sessions.push(session);
          return {
            select() {
              return {
                single: async () => ({ data: { id: session.id }, error: null }),
                ...thenable({ id: session.id }),
              };
            },
          };
        }

        if (table === "relationship_ask_messages") {
          const rows = (payload as Array<Omit<StoredMessage, "id">>).map((row, index) => ({
            ...row,
            id: `00000000-0000-4000-8000-00000000050${index + 1}`,
          }));
          client.messages.push(...rows);
          return {
            select() {
              return thenable(rows.map((row) => ({ id: row.id, role: row.role })));
            },
          };
        }

        if (table === "relationship_insight_snapshots") {
          client.insightRows.push(payload);
          return thenable(null);
        }

        throw new Error(`Unexpected insert table ${table}`);
      },
    };
  }

  selectMany(table: string, filters: Array<{ column: string; value: string }>) {
    if (table === "relationship_participants") {
      return [
        {
          relationship_id: relationshipId,
          user_id: selfUserId,
          birth_profile_id: selfProfileId,
          label_for_other: "romantic_partner",
          birth_profiles: { id: selfProfileId, name: "Self", status: "ready" },
        },
        {
          relationship_id: relationshipId,
          user_id: otherUserId,
          birth_profile_id: otherProfileId,
          label_for_other: "romantic_partner",
          birth_profiles: { id: otherProfileId, name: "Other", status: "ready" },
        },
      ];
    }

    if (table === "relationship_ask_sessions") {
      const id = filters.find((filter) => filter.column === "id")?.value;
      return this.sessions.filter((session) => session.id === id);
    }

    throw new Error(`Unexpected select table ${table}`);
  }

  selectSingle(table: string, filters: Array<{ column: string; value: string }>) {
    if (table === "birth_profiles") {
      const id = filters.find((filter) => filter.column === "id")?.value;
      return {
        id,
        name: id === selfProfileId ? "Self" : "Other",
        birth_date: "1990-01-01",
        birth_time: "12:00",
        birth_time_confidence: "exact",
        latitude: 12,
        longitude: 77,
        timezone: "Asia/Kolkata",
        ayanamsha: "lahiri",
        status: "ready",
      };
    }

    if (table === "chart_snapshots") {
      const profileId = filters.find((filter) => filter.column === "birth_profile_id")?.value;
      return {
        id: profileId === selfProfileId ? "00000000-0000-4000-8000-000000000601" : "00000000-0000-4000-8000-000000000602",
        engine_version: "astro_engine_test",
        computed_at: "2026-05-11T00:00:00.000Z",
        payload: goldenSnapshot,
      };
    }

    if (table === "relationship_ask_sessions") {
      const id = filters.find((filter) => filter.column === "id")?.value;
      return this.sessions.find((session) => session.id === id) ?? null;
    }

    throw new Error(`Unexpected select table ${table}`);
  }
}

function providerReturning(output: unknown): LlmProvider {
  return {
    name: "gemini",
    defaultModel: "gemini-mock",
    async generate() {
      return { output, tokens_in: 10, tokens_out: 20, latency_ms: 1 };
    },
  };
}

describe("relationship Ask", () => {
  it("normalizes common successful LLM answer drift before storing the response", async () => {
    const supabase = new RelationshipAskSupabaseMock();
    const result = await generateRelationshipAnswer({
      supabase: supabase as unknown as SupabaseRelationshipAskClient,
      relationshipId,
      userId: selfUserId,
      question: "What is the real pattern here?",
      tone: "direct",
      depth: "simple",
      providers: [
        providerReturning({
          answer: {
            verdict: "This bond is real but needs conscious boundaries.",
            explanation: "There is warmth here. The pressure is also visible. Treat the bond as workable, not effortless.",
            advice: "Name expectations early.",
            why: "Moon and Venus support contact while Mars adds pressure.",
            timing: { summary: "This is mainly a natal relationship pattern.", type: "natal" },
            confidence: { level: "Medium", note: "Grounded in the supplied relationship insight." },
            technical_basis: { charts: "self:D1", houses: 7, planets: "Venus" },
          },
        }),
      ],
    });

    expect(result.answer.advice).toEqual(["Name expectations early."]);
    expect(result.answer.why).toEqual(["Moon and Venus support contact while Mars adds pressure."]);
    expect(result.answer.confidence.level).toBe("medium");
    expect(result.answer.technical_basis).toEqual({
      charts_used: ["self:D1"],
      houses_used: [7],
      planets_used: ["Venus"],
    });
    expect(supabase.messages.find((message) => message.role === "assistant")?.content_structured).toEqual(result.answer);
  });

  it("uses relationship insight citations when provider output omits strict technical basis", async () => {
    const supabase = new RelationshipAskSupabaseMock();
    const result = await generateRelationshipAnswer({
      supabase: supabase as unknown as SupabaseRelationshipAskClient,
      relationshipId,
      userId: selfUserId,
      question: "What is the strongest aspect of our relationship?",
      tone: "direct",
      depth: "simple",
      providers: [
        providerReturning({
          answer: "The strongest aspect is the shared emotional rhythm.",
          explanation: "The bond has a usable emotional channel, but it still needs boundaries.",
          guidance: ["Lean into honest check-ins instead of assuming the other person feels the same thing."],
          reasons: ["Moon and Venus give support while Mars adds pressure."],
          timing: { summary: "This is a relationship pattern rather than a selected-date reading." },
          confidence: "Grounded in the supplied relationship insight.",
        }),
      ],
    });

    expect(result.answer.verdict).toBe("The strongest aspect is the shared emotional rhythm.");
    expect(result.answer.timing.type).toEqual(["natal"]);
    expect(result.answer.technical_basis).toEqual({
      charts_used: ["D1", "D9"],
      houses_used: [7],
      planets_used: ["Moon", "Venus", "Mars"],
    });
  });
});
