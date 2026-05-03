import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ask/route";
import { generateAnswer } from "@/lib/llm/generateAnswer";
import { buildAstrologyFactsAskContext, loadAstrologyFactsExportData } from "@/lib/server/exportAstrologyFacts";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

vi.mock("@/lib/llm/generateAnswer", () => ({
  generateAnswer: vi.fn(),
}));

vi.mock("@/lib/server/exportAstrologyFacts", () => ({
  AstrologyFactsExportInputError: class AstrologyFactsExportInputError extends Error {},
  loadAstrologyFactsExportData: vi.fn(async () => ({ requested_date: "2026-04-25" })),
  buildAstrologyFactsAskContext: vi.fn((data: { requested_date: string }) => ({
    source_export_kind: "charts_transits_json",
    requested_date: data.requested_date,
    transit_at: "2026-04-24T18:30:00.000Z",
    profile: { timezone: "Asia/Kolkata", ayanamsha: "lahiri", birth_time_confidence: "exact" },
    natal_summary: { lagna: "Aries", moon_sign: "Taurus", nakshatra: "Rohini", pada: 2 },
    chart_keys: ["D1"],
    natal_planets: [],
    transits: { as_of: "2026-04-24T18:30:00.000Z", positions: [], natal_overlay: { planet_to_house: {} } },
    allowed_citations: { charts: ["D1", "Transit"], houses: [1], planets: ["Sun"] },
  })),
}));

describe("/api/ask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the latest ready profile and returns a structured answer", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table !== "birth_profiles") {
          if (table === "ask_usage" || table === "analytics_events") {
            return {
              insert: async () => ({ error: null }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            const query = {
              eq() {
                return query;
              },
              order() {
                return query;
              },
              limit() {
                return query;
              },
              maybeSingle: async () => ({
                data: { id: "00000000-0000-4000-8000-000000000001", status: "ready" },
                error: null,
              }),
            };
            return query;
          },
        };
      },
    });

    vi.mocked(generateAnswer).mockResolvedValueOnce({
      session_id: "00000000-0000-4000-8000-000000000002",
      classification: {
        topic: "career",
        needs_timing: false,
        needs_technical_depth: false,
        birth_time_sensitive: true,
        is_mixed: false,
        matched_terms: ["career"],
        confidence: "high",
      },
      meta: {
        provider: "gemini",
        model: "gemini-mock",
        prompt_version: "ask_v1",
        answer_schema_version: "answer_v1",
        context_bundle_type: "career",
        latency_ms: 1,
      },
      answer: {
        verdict: "Career is active, but the chart shows a mixed path.",
        why: ["Saturn is involved."],
        timing: { summary: "Current period", type: ["dasha"] },
        confidence: { level: "medium", note: "Grounded in supplied context." },
        advice: ["Act on the strongest signal first."],
        technical_basis: { charts_used: ["D1"], houses_used: [10], planets_used: ["Saturn"] },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({ question: "Why is career stuck?", tone: "direct", depth: "simple" }),
      }),
    );
    const body = (await response.json()) as { session_id?: string; answer?: { verdict?: string } };

    expect(response.status).toBe(200);
    expect(body.session_id).toBe("00000000-0000-4000-8000-000000000002");
    expect(body.answer?.verdict).toContain("Career");
    expect(generateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: "00000000-0000-4000-8000-000000000001",
        question: "Why is career stuck?",
        tone: "direct",
        depth: "simple",
      }),
    );
  });

  it("loads selected-day facts before generating a day-wise answer", async () => {
    createClient.mockReturnValueOnce({
      auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
      from(table: string) {
        if (table !== "birth_profiles") {
          if (table === "ask_usage" || table === "analytics_events") {
            return {
              insert: async () => ({ error: null }),
            };
          }
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select() {
            const query = {
              eq() {
                return query;
              },
              order() {
                return query;
              },
              limit() {
                return query;
              },
              maybeSingle: async () => ({
                data: { id: "00000000-0000-4000-8000-000000000001", status: "ready" },
                error: null,
              }),
            };
            return query;
          },
        };
      },
    });

    vi.mocked(generateAnswer).mockResolvedValueOnce({
      session_id: "00000000-0000-4000-8000-000000000002",
      classification: {
        topic: "career",
        needs_timing: true,
        needs_technical_depth: false,
        birth_time_sensitive: true,
        is_mixed: false,
        matched_terms: ["work"],
        confidence: "medium",
      },
      meta: {
        provider: "gemini",
        model: "gemini-mock",
        prompt_version: "ask_v1",
        answer_schema_version: "answer_v1",
        context_bundle_type: "daily",
        latency_ms: 1,
      },
      answer: {
        verdict: "Work is clearer than usual on this date.",
        why: ["The selected-day transits support action."],
        timing: { summary: "Selected-day transit context", type: ["transit"] },
        confidence: { level: "medium", note: "Grounded in supplied selected-day facts." },
        advice: ["Use the cleaner work window."],
        technical_basis: { charts_used: ["Transit"], houses_used: [1], planets_used: ["Sun"] },
      },
    });

    const response = await POST(
      new Request("http://localhost/api/ask", {
        method: "POST",
        body: JSON.stringify({
          question: "How is work on this date?",
          tone: "direct",
          depth: "simple",
          day_context: { date: "2026-04-25" },
        }),
      }),
    );
    const body = (await response.json()) as { day_context?: { requested_date?: string } };

    expect(response.status).toBe(200);
    expect(body.day_context?.requested_date).toBe("2026-04-25");
    expect(loadAstrologyFactsExportData).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        profileId: "00000000-0000-4000-8000-000000000001",
        date: "2026-04-25",
      }),
    );
    expect(buildAstrologyFactsAskContext).toHaveBeenCalledWith({ requested_date: "2026-04-25" });
    expect(generateAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        day_context: expect.objectContaining({ requested_date: "2026-04-25" }),
      }),
    );
  });
});
