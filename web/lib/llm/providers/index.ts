import type { ZodSchema } from "zod";

import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { geminiProvider, type LlmMessage, type LlmProvider } from "@/lib/llm/providers/gemini";
import { groqProvider } from "@/lib/llm/providers/groq";
import { LlmProviderError } from "@/lib/llm/errors";
import type { AskClassification } from "@/lib/llm/classify";
import type { LlmMetadata, Topic } from "@/lib/schemas";

type ContextBundleType = Topic | "daily";

export type { LlmMessage, LlmProvider };

export type CallWithFallbackArgs = {
  system: string;
  messages: LlmMessage[];
  schema: ZodSchema<unknown>;
  topic: ContextBundleType;
  classification?: AskClassification;
  context_bundle_id?: string;
  prompt_versions?: {
    system: string;
    route: string;
    user: string;
  };
  answer_schema_version?: string;
  model?: string;
  temperature?: number;
  max_attempts_per_provider?: number;
  providers?: LlmProvider[];
};

export async function callWithFallback(args: CallWithFallbackArgs): Promise<{ output: unknown; meta: LlmMetadata }> {
  const providers = args.providers ?? [geminiProvider, groqProvider];
  const maxAttempts = Math.max(1, args.max_attempts_per_provider ?? 2);
  let lastError: unknown;

  for (const provider of providers) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const start = Date.now();
        const result = await provider.generate({
          system: args.system,
          messages: args.messages,
          schema: args.schema,
          model: args.model,
          temperature: args.temperature,
        });

        const meta: LlmMetadata = {
          provider: provider.name,
          model: args.model ?? provider.defaultModel,
          prompt_version: "ask_v1",
          prompt_versions: args.prompt_versions,
          answer_schema_version: args.answer_schema_version ?? PROMPT_VERSIONS.answer_schema,
          context_bundle_type: args.topic,
          context_bundle_id: args.context_bundle_id,
          classification: args.classification,
          latency_ms: result.latency_ms || Date.now() - start,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
        };

        return {
          output: result.output,
          meta,
        };
      } catch (error) {
        lastError = error;
        const status = error instanceof LlmProviderError ? error.status : undefined;
        const retryable = status === undefined || status === 429 || status >= 500;
        if (!retryable || attempt === maxAttempts) {
          break;
        }
      }
    }
  }

  throw new LlmProviderError("All LLM providers failed.", { cause: lastError });
}
