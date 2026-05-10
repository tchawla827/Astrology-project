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
import { callWithFallback, type LlmProvider } from "@/lib/llm/providers";
import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { AskAnswerSchema, type AskAnswer, type AskContextPlan, type Planet, type Topic } from "@/lib/schemas";
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

const planDefaults: Record<Topic, Pick<AskContextPlan, "requested_charts" | "requested_houses" | "requested_planets">> = {
  personality: { requested_charts: ["D1", "Bhava", "Moon"], requested_houses: [1], requested_planets: ["Moon", "Sun"] },
  career: { requested_charts: ["D1", "Bhava", "D10"], requested_houses: [2, 6, 10, 11], requested_planets: ["Saturn", "Sun", "Mercury", "Jupiter"] },
  wealth: { requested_charts: ["D1", "D2", "D11"], requested_houses: [2, 5, 9, 11], requested_planets: ["Jupiter", "Venus"] },
  relationships: { requested_charts: ["D1", "D9", "D7", "Moon"], requested_houses: [5, 7, 11], requested_planets: ["Venus", "Mars", "Moon"] },
  marriage: { requested_charts: ["D1", "D9"], requested_houses: [7], requested_planets: ["Venus", "Jupiter"] },
  family: { requested_charts: ["D1", "D3", "D4", "D12"], requested_houses: [2, 3, 4, 5], requested_planets: ["Moon", "Jupiter"] },
  health: { requested_charts: ["D1", "D6", "D8", "D30"], requested_houses: [1, 6, 8, 12], requested_planets: ["Moon", "Sun"] },
  education: { requested_charts: ["D1", "D4", "D24"], requested_houses: [2, 4, 5, 9], requested_planets: ["Mercury", "Jupiter"] },
  spirituality: { requested_charts: ["D1", "D20", "D45", "D60"], requested_houses: [5, 9, 12], requested_planets: ["Ketu", "Jupiter"] },
  relocation: { requested_charts: ["D1", "D4", "D12"], requested_houses: [3, 4, 9, 12], requested_planets: ["Rahu", "Moon"] },
};

function isPlannerCall(args: Parameters<LlmProvider["generate"]>[0]) {
  return args.system.includes("minimum astrological context");
}

function contextPlanForTopic(topic: Topic, question = "mock question"): AskContextPlan {
  const defaults = planDefaults[topic];

  return {
    version: "ask_context_plan_v1",
    primary_topic: topic,
    intent_summary: `Plan context for ${question}`,
    requested_charts: defaults.requested_charts,
    requested_houses: defaults.requested_houses,
    requested_planets: defaults.requested_planets,
    requested_timing: ["current_dasha", "current_antardasha", "transits"],
    requested_computations: [
      "house_lord_placements",
      "planet_condition",
      "aspects_to_requested_factors",
      "dasha_lord_relevance",
      "transit_hits_to_requested_factors",
    ],
    needs_timing: true,
    needs_technical_depth: true,
    birth_time_sensitive: topic !== "spirituality",
    is_mixed: false,
    confidence: "high",
    reason: "The mocked planner chose the compact chart facts needed for this topic.",
  };
}

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

function providerReturning(name: "gemini" | "openrouter", output: unknown): LlmProvider {
  return {
    name,
    defaultModel: `${name}-mock`,
    async generate(args) {
      if (isPlannerCall(args)) {
        return { output: contextPlanForTopic("career"), tokens_in: 5, tokens_out: 8, latency_ms: 1 };
      }
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
            async generate(args) {
              if (isPlannerCall(args)) {
                return { output: contextPlanForTopic(testCase.expected_topic, testCase.question), tokens_in: 25, tokens_out: 35, latency_ms: 1 };
              }
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
        planner: PROMPT_VERSIONS.planner,
      });
      expect(result.meta.context_bundle_id).toBe("derived-1");
      expect(supabase.messages).toHaveLength(2);
      expect(supabase.messages[1]?.llm_metadata).toMatchObject({
        provider: "gemini",
        answer_schema_version: "answer_v2",
        context_bundle_type: testCase.expected_topic,
        context_plan: {
          source: "llm",
          primary_topic: testCase.expected_topic,
        },
        planner_metadata: {
          provider: "gemini",
        },
      });
    }
  });

  it("lets the LLM planner request relationship context for semantic reconnection questions", async () => {
    const supabase = new AskSupabaseMock("exact");
    let answerPrompt = "";

    const result = await generateAnswer({
      supabase,
      profile_id: profileId,
      question: "In the future, is it ever possible for a reconnection with my ex?",
      tone: "direct",
      depth: "technical",
      providers: [
        {
          name: "gemini",
          defaultModel: "gemini-mock",
          async generate(args) {
            if (isPlannerCall(args)) {
              return {
                output: {
                  ...contextPlanForTopic("relationships"),
                  intent_summary: "The user is asking whether a past romantic bond can reconnect in the future.",
                  requested_charts: ["D1", "D9", "D7", "Moon"],
                  requested_houses: [5, 7, 11, 12],
                  requested_planets: ["Venus", "Mars", "Moon", "Jupiter", "Saturn"],
                  requested_timing: ["current_dasha", "current_antardasha", "upcoming_dasha", "transits"],
                  reason: "Reconnection needs relationship promise, emotional pattern, return/contact indicators, and timing.",
                },
                latency_ms: 1,
              };
            }
            answerPrompt = args.messages.map((message) => message.content).join("\n");
            return { output: answerForTopic("relationships"), latency_ms: 1 };
          },
        },
      ],
    });

    expect(result.classification.topic).toBe("relationships");
    expect(result.meta.context_plan).toMatchObject({
      source: "llm",
      primary_topic: "relationships",
      requested_charts: ["D1", "D9", "D7", "Moon"],
      requested_houses: [5, 7, 11, 12],
    });
    expect(answerPrompt).toContain('"planner_requested_context"');
    expect(answerPrompt).toContain('"intent_summary": "The user is asking whether a past romantic bond can reconnect in the future."');
    expect(result.answer.technical_basis.charts_used.some((chart) => ["D9", "D7"].includes(chart))).toBe(true);
  });

  it("falls back to OpenRouter when Gemini fails", async () => {
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
        providerReturning("openrouter", answerForTopic("career")),
      ],
    });

    expect(result.meta.provider).toBe("openrouter");
    expect(result.answer.technical_basis.charts_used).toContain("D10");
  });

  it("retries LLM provider errors in round-robin order", async () => {
    const calls: string[] = [];

    const result = await callWithFallback({
      system: "system",
      messages: [{ role: "user", content: "question" }],
      schema: AskAnswerSchema,
      topic: "career",
      providers: [
        {
          name: "gemini",
          defaultModel: "gemini-mock",
          async generate() {
            calls.push("gemini");
            throw new Error("temporary network failure");
          },
        },
        {
          name: "openrouter",
          defaultModel: "openrouter-mock",
          async generate() {
            calls.push("openrouter");
            if (calls.filter((provider) => provider === "openrouter").length === 1) {
              throw new Error("temporary network failure");
            }
            return { output: answerForTopic("career"), tokens_in: 10, tokens_out: 20, latency_ms: 1 };
          },
        },
      ],
    });

    expect(calls).toEqual(["gemini", "openrouter", "gemini", "openrouter"]);
    expect(result.meta.provider).toBe("openrouter");
  });

  it("includes career topic evidence in Ask context and allows its citations", async () => {
    const supabase = new AskSupabaseMock("exact");
    let promptContent = "";
    const answer: AskAnswer = {
      verdict: "Career is supported, but recognition is slower than effort right now.",
      explanation:
        "The supplied career evidence points to a real professional opening rather than a dead end. It also shows friction, so the progress is not clean or immediate. The answer should be read through the career evidence instead of broad chart guessing.",
      advice: ["Use the current phase for visible output and avoid changing direction only from impatience."],
      why: ["D10 puts Venus in the 10th house, making professional visibility part of the supplied evidence."],
      timing: { summary: "The current antardasha is the sharper timing layer.", type: ["natal", "dasha"] },
      confidence: { level: "high", note: "Grounded in the supplied career evidence model." },
      technical_basis: { charts_used: ["D10"], houses_used: [10], planets_used: ["Venus"] },
    };

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
          async generate(args) {
            if (isPlannerCall(args)) {
              return { output: contextPlanForTopic("career"), latency_ms: 1 };
            }
            promptContent = args.messages.map((message) => message.content).join("\n");
            return { output: answer, latency_ms: 1 };
          },
        },
      ],
    });

    expect(promptContent).toContain('"topic_evidence"');
    expect(promptContent).toContain('"verdict"');
    expect(result.answer.technical_basis.planets_used).toEqual(["Venus"]);
    expect(result.answer.technical_basis.charts_used).toEqual(["D10"]);
  });

  it("falls back to OpenRouter when Gemini is rate limited", async () => {
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
            throw new LlmProviderError("quota exceeded", { provider: "gemini", status: 429 });
          },
        },
        providerReturning("openrouter", answerForTopic("career")),
      ],
    });

    expect(result.meta.provider).toBe("openrouter");
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
          async generate(args) {
            if (isPlannerCall(args)) {
              return { output: contextPlanForTopic("career"), latency_ms: 1 };
            }
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
      explanation:
        "The selected date has enough transit support to make focused work useful. This does not rewrite the long-term chart, so it should be treated as a temporary opening. Use the day for concrete output rather than broad emotional decisions.",
      advice: ["Use the day for visible work rather than emotional cleanup."],
      why: ["The selected-day transit context puts Sun emphasis into an action house."],
      timing: { summary: "This is about the selected date's transit context.", type: ["transit"] },
      confidence: { level: "medium", note: "Grounded in the attached selected-day facts." },
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
            explanation:
              "The selected day points outward rather than inward. The answer should stay focused on visible effort. This is a narrow date-specific read, not a broad life verdict.",
            advice: "Use the day for one visible task.",
            why: "Sun is the cited selected-day transit factor.",
            timing: { summary: "Selected day only.", type: "daily" },
            confidence: { level: "Medium", note: "The date context is narrow but clear." },
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

  it("accepts simple explanations that include astrology terms without repair", async () => {
    const supabase = new AskSupabaseMock("exact");
    let calls = 0;
    const answer = {
      ...answerForTopic("career"),
      explanation:
        "Saturn in D10 shows the pressure is real. The 10th house keeps work exposed. This dasha needs patience.",
    };

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
          async generate(args) {
            if (isPlannerCall(args)) {
              return { output: contextPlanForTopic("career"), latency_ms: 1 };
            }
            calls += 1;
            return { output: answer, latency_ms: 1 };
          },
        },
      ],
    });

    expect(calls).toBe(1);
    expect(result.meta.repaired_from_provider).toBeUndefined();
    expect(result.answer.explanation).toMatch(/\b(?:Saturn|D10|house|dasha)\b/i);
  });
});
