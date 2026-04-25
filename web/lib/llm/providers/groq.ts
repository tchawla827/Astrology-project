import { LlmProviderError } from "@/lib/llm/errors";
import { parseJsonFromText } from "@/lib/llm/providers/json";
import type { LlmProvider } from "@/lib/llm/providers/gemini";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
};

export const groqProvider: LlmProvider = {
  name: "groq",
  defaultModel: "llama-3.3-70b-versatile",
  async generate(args) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new LlmProviderError("GROQ_API_KEY is not configured.", { provider: "groq" });
    }

    const model = args.model ?? this.defaultModel;
    const start = Date.now();
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: args.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: args.system }, ...args.messages],
      }),
    });
    const latency_ms = Date.now() - start;
    const body = (await response.json().catch(() => ({}))) as GroqResponse;

    if (!response.ok) {
      throw new LlmProviderError(body.error?.message ?? "Groq request failed.", {
        provider: "groq",
        status: response.status,
      });
    }

    const text = body.choices?.[0]?.message?.content ?? "";
    if (!text) {
      throw new LlmProviderError("Groq returned an empty response.", { provider: "groq" });
    }

    return {
      output: parseJsonFromText(text),
      tokens_in: body.usage?.prompt_tokens,
      tokens_out: body.usage?.completion_tokens,
      latency_ms,
    };
  },
};
