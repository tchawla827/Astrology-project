import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ask/route";
import { generateAnswer } from "@/lib/llm/generateAnswer";

const createClient = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}));

vi.mock("@/lib/llm/generateAnswer", () => ({
  generateAnswer: vi.fn(),
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
});
