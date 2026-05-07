import { LlmProviderError } from "@/lib/llm/errors";
import { parseJsonFromText } from "@/lib/llm/providers/json";
import type { LlmProvider } from "@/lib/llm/providers/gemini";
import { serverEnv } from "@/lib/server/env";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
};

export const openRouterProvider: LlmProvider = {
  name: "openrouter",
  defaultModel: "openrouter/free",
  async generate(args) {
    const apiKey = serverEnv("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new LlmProviderError("OPENROUTER_API_KEY is not configured.", { provider: "openrouter" });
    }

    const model = (args.model ?? serverEnv("OPENROUTER_MODEL")) || this.defaultModel;
    const start = Date.now();
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "http-referer": serverEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
        "x-title": "Astri",
      },
      body: JSON.stringify({
        model,
        temperature: args.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: args.system }, ...args.messages],
      }),
    });
    const latency_ms = Date.now() - start;
    const body = (await response.json().catch(() => ({}))) as OpenRouterResponse;

    if (!response.ok) {
      throw new LlmProviderError(body.error?.message ?? "OpenRouter request failed.", {
        provider: "openrouter",
        status: response.status,
      });
    }

    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) {
      throw new LlmProviderError("OpenRouter returned an empty response.", { provider: "openrouter" });
    }

    return {
      output: parseJsonFromText(text),
      tokens_in: body.usage?.prompt_tokens,
      tokens_out: body.usage?.completion_tokens,
      latency_ms,
    };
  },
};
