import type { ZodSchema } from "zod";

import { LlmProviderError } from "@/lib/llm/errors";
import { parseJsonFromText } from "@/lib/llm/providers/json";

export type LlmMessage = { role: "user" | "assistant"; content: string };

export type LlmGenerateArgs = {
  system: string;
  messages: LlmMessage[];
  schema: ZodSchema<unknown>;
  model?: string;
  temperature?: number;
};

export type LlmGenerateResult = {
  output: unknown;
  tokens_in?: number;
  tokens_out?: number;
  latency_ms: number;
};

export type LlmProvider = {
  name: "gemini" | "groq";
  defaultModel: string;
  generate(args: LlmGenerateArgs): Promise<LlmGenerateResult>;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

function toGeminiContents(messages: LlmMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

export const geminiProvider: LlmProvider = {
  name: "gemini",
  defaultModel: "gemini-2.5-flash",
  async generate(args) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new LlmProviderError("GEMINI_API_KEY is not configured.", { provider: "gemini" });
    }

    const model = args.model ?? this.defaultModel;
    const start = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.system }] },
          contents: toGeminiContents(args.messages),
          generationConfig: {
            temperature: args.temperature ?? 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    const latency_ms = Date.now() - start;
    const body = (await response.json().catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
      throw new LlmProviderError(body.error?.message ?? "Gemini request failed.", {
        provider: "gemini",
        status: response.status,
      });
    }

    const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text) {
      throw new LlmProviderError("Gemini returned an empty response.", { provider: "gemini" });
    }

    return {
      output: parseJsonFromText(text),
      tokens_in: body.usageMetadata?.promptTokenCount,
      tokens_out: body.usageMetadata?.candidatesTokenCount,
      latency_ms,
    };
  },
};
