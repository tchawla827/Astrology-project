import { describe, expect, it } from "vitest";

import { generateAnswer, type SupabaseAskPersistenceClient } from "@/lib/llm/generateAnswer";
import { LlmProviderError } from "@/lib/llm/errors";
import {
  assertGoldenAnswer,
  buildMockAnswer,
  goldenDerivedPayload,
  goldenQuestionCases,
} from "@/lib/llm/tests/golden-questions";
import type { AskContextBundle } from "@/lib/llm/buildContext";
import type { LlmProvider } from "@/lib/llm/providers";
import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import type { AskAnswer, Planet, Topic } from "@/lib/schemas";
import type { AstrologyFactsAskContext } from "@/lib/server/exportAstrologyFacts";
import { goldenSnapshot } from "@/tests/derived/goldenSnapshot";

const profileId = "00000000-0000-4000-8000-000000000001";

type StoredSession = {
  id: string;
  birth_profile_id: string;
  topic: Topic;
  tone_mode: string;
  context_kind: "natal" | "daily";
  context_date: string | null;
};

type StoredMessage = {
  ask_session_id: string;
  role: "user" | "assistant";
  content?: string;
  content_structured?: AskAnswer;
  llm_metadata?: unknown;
};

class AskSupabaseMock implements SupabaseAskPersistenceClient {
  readonly sessions: StoredSession[] = [];
  readonly messages: StoredMessage[] = [];

  constructor(private readonly birthTimeConfidence: "exact" | "approximate" | "unknown" = "exact") {}

  from(table: string) {
    const client = this;

    return {
      select() {
        const filters: Array<{ column: string; value: string }> = [];
        const query = {
          eq(column: string, value: string) {
            filters.push({ column, value });
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return query;
          },
          async maybeSingle() {
            return { data: client.selectSingle(table, filters), error: null };
          },
        };
        return query;
      },
      insert(payload: unknown) {
        if (table === "ask_sessions") {
          const row = payload as Omit<StoredSession, "id">;
          const session = { ...row, id: `session-${client.sessions.length + 1}` };
          client.sessions.push(session);
          return {
            select() {
              return {
                async single() {
                  return { data: { id: session.id }, error: null };
                },
              };
            },
          };
        }

        if (table === "ask_messages") {
          client.messages.push(...(payload as StoredMessage[]));
          return Promise.resolve({ error: null });
        }

        throw new Error(`Unexpected insert table ${table}`);
      },
    };
  }

  private selectSingle(table: string, filters: Array<{ column: string; value: string }>) {
    if (table === "birth_profiles") {
      return {
        id: filters.find((filter) => filter.column === "id")?.value ?? profileId,
        status: "ready",
        birth_time_confidence: this.birthTimeConfidence,
      };
    }

    if (table === "derived_feature_snapshots") {
      return {
        id: "derived-1",
        schema_version: "derived_v1",
        computed_at: "2026-04-24T00:00:00Z",
        payload: goldenDerivedPayload,
      };
    }

    if (table === "chart_snapshots") {
      return {
        id: "chart-1",
        engine_version: "astro_engine_v1",
        computed_at: "2026-04-24T00:00:00Z",
        payload: { ...goldenSnapshot, birth_time_confidence: this.birthTimeConfidence },
      };
    }

    if (table === "ask_sessions") {
      const id = filters.find((filter) => filter.column === "id")?.value;
      return this.sessions.find((session) => session.id === id) ?? null;
    }

    throw new Error(`Unexpected select table ${table}`);
  }
}

function contextFor(topic: Topic): Pick<AskContextBundle, "topic" | "allowed_citations" | "headline_signals" | "timing"> {
  const bundle = goldenDerivedPayload.topic_bundles[topic];

  return {
    topic,
    headline_signals: bundle.headline_signals,
    timing: bundle.timing,
    allowed_citations: {
      charts: bundle.charts_used,
      houses: Object.keys(bundle.houses).map(Number),
      planets: Object.keys(bundle.planets) as Planet[],
    },
  };
}

const preferredCitations: Partial<Record<Topic, { charts: string[]; planets: Planet[] }>> = {
  career: { charts: ["D1", "D10"], planets: ["Saturn"] },
  marriage: { charts: ["D1", "D9"], planets: ["Venus", "Jupiter"] },
  wealth: { charts: ["D1", "D2"], planets: ["Jupiter", "Venus"] },
  relocation: { charts: ["D1", "D12"], planets: ["Rahu"] },
  education: { charts: ["D1", "D24"], planets: ["Mercury", "Jupiter"] },
};

function answerForTopic(topic: Topic): AskAnswer {
  const context = contextFor(topic);
  const base = buildMockAnswer(context);
  const preferred = preferredCitations[topic];

  return {
    ...base,
    technical_basis: {
      charts_used: preferred?.charts.filter((chart) => context.allowed_citations.charts.includes(chart)) ?? base.technical_basis.charts_used,
      houses_used: base.technical_basis.houses_used,
      planets_used: preferred?.planets.filter((planet) => context.allowed_citations.planets.includes(planet)) ?? base.technical_basis.planets_used,
    },
  };
}

function providerReturning(name: "gemini" | "groq", output: unknown): LlmProvider {
  return {
    name,
    defaultModel: `${name}-mock`,
    async generate() {
      return { output, tokens_in: 10, tokens_out: 20, latency_ms: 1 };
    },
  };
}

describe("phase 07 LLM orchestration", () => {
  it("passes golden questions with mocked provider output and stores complete metadata", async () => {
    for (const testCase of goldenQuestionCases) {
      const supabase = new AskSupabaseMock("exact");
      const result = await generateAnswer({
        supabase,
        profile_id: profileId,
        question: testCase.question,
        tone: "direct",
        depth: "technical",
        providers: [
          {
            name: "gemini",
            defaultModel: "recorded-gemini",
            async generate() {
              return { output: answerForTopic(testCase.expected_topic), tokens_in: 100, tokens_out: 90, latency_ms: 2 };
            },
          },
        ],
      });

      assertGoldenAnswer({
        testCase,
        topic: result.classification.topic,
        answer: result.answer,
      });
      expect(result.meta.prompt_versions).toEqual({
        system: PROMPT_VERSIONS.system,
        route: PROMPT_VERSIONS.route[testCase.expected_topic],
        user: PROMPT_VERSIONS.user,
      });
      expect(result.meta.context_bundle_id).toBe("derived-1");
      expect(supabase.messages).toHaveLength(2);
      expect(supabase.messages[1]?.llm_metadata).toMatchObject({
        provider: "gemini",
        answer_schema_version: "answer_v1",
        context_bundle_type: testCase.expected_topic,
      });
    }
  });

  it("falls back to Groq when Gemini fails", async () => {
    const supabase = new AskSupabaseMock("exact");
    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "Why has my career felt blocked lately?",
      tone: "direct",
      depth: "simple",
      providers: [
        {
          name: "gemini",
          defaultModel: "gemini-mock",
          async generate() {
            throw new LlmProviderError("forced failure", { provider: "gemini", status: 500 });
          },
        },
        providerReturning("groq", answerForTopic("career")),
      ],
    });

    expect(result.meta.provider).toBe("groq");
    expect(result.answer.technical_basis.charts_used).toContain("D10");
  });

  it("repairs citation violations once and persists the clean answer", async () => {
    const supabase = new AskSupabaseMock("exact");
    let calls = 0;
    const invalid = {
      ...answerForTopic("career"),
      technical_basis: {
        ...answerForTopic("career").technical_basis,
        charts_used: ["D60"],
      },
    };
    const repaired = answerForTopic("career");

    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "Why has my career felt blocked lately?",
      tone: "direct",
      depth: "technical",
      providers: [
        {
          name: "gemini",
          defaultModel: "gemini-mock",
          async generate() {
            calls += 1;
            return { output: calls === 1 ? invalid : repaired, latency_ms: 1 };
          },
        },
      ],
    });

    expect(calls).toBe(2);
    expect(result.answer.technical_basis.charts_used).not.toContain("D60");
    expect(result.meta.repaired_from_provider).toBe("gemini");
    expect(supabase.messages[1]?.content_structured?.technical_basis.charts_used).toEqual(["D1", "D10"]);
  });

  it("downgrades high confidence when a birth-time-sensitive question uses approximate time", async () => {
    const supabase = new AskSupabaseMock("approximate");
    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "Why has my career felt blocked lately?",
      tone: "direct",
      depth: "technical",
      providers: [providerReturning("gemini", answerForTopic("career"))],
    });

    expect(result.classification.birth_time_sensitive).toBe(true);
    expect(result.answer.confidence.level).toBe("medium");
    expect(result.answer.confidence.note).toContain("birth time is approximate");
  });

  it("uses selected-day facts as daily context for day-wise questions", async () => {
    const supabase = new AskSupabaseMock("exact");
    const dayContext: AstrologyFactsAskContext = {
      source_export_kind: "charts_transits_json",
      requested_date: "2026-04-25",
      transit_at: "2026-04-24T18:30:00.000Z",
      profile: { timezone: "Asia/Kolkata", ayanamsha: "lahiri", birth_time_confidence: "exact" },
      natal_summary: goldenSnapshot.summary,
      chart_keys: ["D1"],
      natal_planets: goldenSnapshot.planetary_positions.map((position) => ({
        planet: position.planet,
        longitude_deg: position.longitude_deg,
        sign: position.sign,
        house: position.house,
        nakshatra: position.nakshatra,
        pada: position.pada,
        retrograde: position.retrograde,
        combust: position.combust,
        dignity: position.dignity,
      })),
      transits: {
        as_of: "2026-04-24T18:30:00.000Z",
        positions: [
          {
            planet: "Sun",
            longitude_deg: 10,
            sign: "Aries",
            house: 3,
            nakshatra: "Ashwini",
            pada: 1,
            retrograde: false,
            combust: false,
            dignity: "exalted",
          },
        ],
        natal_overlay: { planet_to_house: { Sun: 3 } },
      },
      allowed_citations: { charts: ["D1", "Transit"], houses: [3, 10], planets: ["Sun", "Saturn"] },
    };
    const answer: AskAnswer = {
      verdict: "This date favors focused work, with a transit-led push rather than a permanent promise.",
      why: ["The selected-day transit context puts Sun emphasis into an action house."],
      timing: { summary: "This is about the selected date's transit context.", type: ["transit"] },
      confidence: { level: "medium", note: "Grounded in the attached selected-day facts." },
      advice: ["Use the day for visible work rather than emotional cleanup."],
      technical_basis: { charts_used: ["Transit"], houses_used: [3], planets_used: ["Sun"] },
    };

    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "How is work on this date?",
      tone: "direct",
      depth: "technical",
      day_context: dayContext,
      providers: [providerReturning("gemini", answer)],
    });

    expect(result.meta.context_bundle_type).toBe("daily");
    expect(result.meta.prompt_versions?.route).toBe(PROMPT_VERSIONS.day_question_route);
    expect(result.answer.technical_basis.charts_used).toEqual(["Transit"]);
    expect(supabase.sessions[0]).toMatchObject({
      context_kind: "daily",
      context_date: "2026-04-25",
    });
    expect(supabase.messages[1]?.llm_metadata).toMatchObject({
      context_bundle_type: "daily",
      prompt_versions: { route: PROMPT_VERSIONS.day_question_route },
    });
  });

  it("recovers when a day-wise provider returns daily prediction JSON instead of AskAnswer JSON", async () => {
    const supabase = new AskSupabaseMock("exact");
    const dayContext: AstrologyFactsAskContext = {
      source_export_kind: "charts_transits_json",
      requested_date: "2026-04-25",
      transit_at: "2026-04-24T18:30:00.000Z",
      profile: { timezone: "Asia/Kolkata", ayanamsha: "lahiri", birth_time_confidence: "exact" },
      natal_summary: goldenSnapshot.summary,
      chart_keys: ["D1"],
      natal_planets: [],
      transits: {
        as_of: "2026-04-24T18:30:00.000Z",
        positions: [
          {
            planet: "Sun",
            longitude_deg: 10,
            sign: "Aries",
            house: 3,
            nakshatra: "Ashwini",
            pada: 1,
            retrograde: false,
            combust: false,
            dignity: "exalted",
          },
        ],
        natal_overlay: { planet_to_house: { Sun: 3 } },
      },
      allowed_citations: { charts: ["D1", "Transit"], houses: [3], planets: ["Sun"] },
    };
    const dailyOutput = {
      date: "2026-04-25",
      verdict: "This day has enough fire for visible work.",
      felt_sense: "The day feels cleaner when effort is directed into one visible task.",
      aspect_scores: ["love", "emotional", "career", "focus"].map((aspect) => ({
        aspect,
        score: aspect === "career" ? 70 : 55,
        label: aspect === "career" ? "steady" : "steady",
        sentence: `${aspect} has a steady but not extreme signal.`,
        basis: { houses: [3], planets: ["Sun"], transit_rules: ["selected-day transit"] },
      })),
      favorable: ["Handle one visible work item."],
      caution: ["Do not scatter effort."],
      technical_basis: {
        triggered_houses: [3],
        planets_used: ["Sun"],
        transit_rules: ["selected-day transit"],
      },
      tone: "direct",
      answer_schema_version: "daily_v2",
    };

    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "How is work on this date?",
      tone: "direct",
      depth: "technical",
      day_context: dayContext,
      providers: [providerReturning("gemini", dailyOutput)],
    });

    expect(result.answer.verdict).toBe(dailyOutput.verdict);
    expect(result.answer.timing.type).toEqual(["transit"]);
    expect(result.answer.technical_basis).toEqual({
      charts_used: ["Transit", "D1"],
      houses_used: [3],
      planets_used: ["Sun"],
    });
  });

  it("normalizes common AskAnswer field-shape drift for day-wise answers", async () => {
    const supabase = new AskSupabaseMock("exact");
    const dayContext: AstrologyFactsAskContext = {
      source_export_kind: "charts_transits_json",
      requested_date: "2026-04-25",
      transit_at: "2026-04-24T18:30:00.000Z",
      profile: { timezone: "Asia/Kolkata", ayanamsha: "lahiri", birth_time_confidence: "exact" },
      natal_summary: goldenSnapshot.summary,
      chart_keys: ["D1"],
      natal_planets: [],
      transits: { as_of: "2026-04-24T18:30:00.000Z", positions: [], natal_overlay: { planet_to_house: { Sun: 3 } } },
      allowed_citations: { charts: ["Transit"], houses: [3], planets: ["Sun"] },
    };

    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "What is strongest that day?",
      tone: "direct",
      depth: "simple",
      day_context: dayContext,
      providers: [
        providerReturning("gemini", {
          answer: {
            verdict: "The strongest signal is focused outward effort.",
            why: "Sun is the cited selected-day transit factor.",
            timing: { summary: "Selected day only.", type: "daily" },
            confidence: { level: "Medium", note: "The date context is narrow but clear." },
            advice: "Use the day for one visible task.",
            technical_basis: { charts: "Transit", houses: 3, planets: "Sun" },
          },
        }),
      ],
    });

    expect(result.answer.timing.type).toEqual(["transit"]);
    expect(result.answer.why).toEqual(["Sun is the cited selected-day transit factor."]);
    expect(result.answer.confidence.level).toBe("medium");
    expect(result.answer.technical_basis).toEqual({
      charts_used: ["Transit"],
      houses_used: [3],
      planets_used: ["Sun"],
    });
  });
});
