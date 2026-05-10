import type { ZodSchema } from "zod";

import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { geminiProvider, type LlmMessage, type LlmProvider } from "@/lib/llm/providers/gemini";
import { openRouterProvider } from "@/lib/llm/providers/openrouter";
import { LlmProviderError } from "@/lib/llm/errors";
import type { AskClassification } from "@/lib/llm/classify";
import type { LlmMetadata, Topic } from "@/lib/schemas";

type ContextBundleType = Topic | "daily" | "planner";
const DEFAULT_MAX_ATTEMPTS = 5;

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
    planner?: string;
  };
  answer_schema_version?: string;
  model?: string;
  temperature?: number;
  max_attempts?: number;
  max_attempts_per_provider?: number;
  providers?: LlmProvider[];
};

function llmFailureReason(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function llmFailureDetails(error: unknown) {
  if (!(error instanceof Error) || error.cause === undefined) {
    return undefined;
  }
  if (error.cause instanceof Error) {
    return { name: error.cause.name, message: error.cause.message };
  }
  return error.cause;
}

function logLlmProviderFailure(input: {
  error: unknown;
  provider: LlmProvider;
  model?: string;
  topic: ContextBundleType;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
}) {
  const status = input.error instanceof LlmProviderError ? input.error.status : undefined;
  console.error("LLM provider failed", {
    provider: input.provider.name,
    model: input.model ?? input.provider.defaultModel,
    topic: input.topic,
    attempt: input.attempt,
    max_attempts: input.maxAttempts,
    retryable: input.retryable,
    status,
    reason: llmFailureReason(input.error),
    details: llmFailureDetails(input.error),
  });
}

function shouldLogLlmTraffic() {
  const flag = process.env.ASK_LLM_DEBUG_LOGS?.toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") {
    return false;
  }
  if (flag === "1" || flag === "true" || flag === "on") {
    return true;
  }
  return process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
}

function stringifyForConsole(value: unknown) {
  const seen = new WeakSet<object>();
  return JSON.stringify(
    value,
    (_key, item) => {
      if (typeof item !== "object" || item === null) {
        return item;
      }
      if (seen.has(item)) {
        return "[Circular]";
      }
      seen.add(item);
      return item;
    },
    2,
  );
}

function printLlmTraffic(label: "REQUEST" | "RESPONSE", payload: unknown) {
  if (!shouldLogLlmTraffic()) {
    return;
  }
  console.log(`\n[ASK LLM ${label}]\n${stringifyForConsole(payload)}\n`);
}

export async function callWithFallback(args: CallWithFallbackArgs): Promise<{ output: unknown; meta: LlmMetadata }> {
  const providers = [...(args.providers ?? [geminiProvider, openRouterProvider])];
  const maxAttempts = Math.max(1, args.max_attempts ?? args.max_attempts_per_provider ?? DEFAULT_MAX_ATTEMPTS);
  let lastError: unknown;
  let providerIndex = 0;

  for (let attempt = 1; attempt <= maxAttempts && providers.length > 0; attempt += 1) {
    const provider = providers[providerIndex % providers.length];
    if (!provider) {
      break;
    }

    try {
      const start = Date.now();
      const model = args.model ?? provider.defaultModel;
      printLlmTraffic("REQUEST", {
        provider: provider.name,
        model,
        topic: args.topic,
        attempt,
        max_attempts: maxAttempts,
        temperature: args.temperature,
        prompt_versions: args.prompt_versions,
        answer_schema_version: args.answer_schema_version ?? PROMPT_VERSIONS.answer_schema,
        system: args.system,
        messages: args.messages,
      });
      const result = await provider.generate({
        system: args.system,
        messages: args.messages,
        schema: args.schema,
        model: args.model,
        temperature: args.temperature,
      });

      const meta: LlmMetadata = {
        provider: provider.name,
        model,
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

      printLlmTraffic("RESPONSE", {
        provider: provider.name,
        model,
        topic: args.topic,
        attempt,
        latency_ms: meta.latency_ms,
        tokens_in: result.tokens_in,
        tokens_out: result.tokens_out,
        output: result.output,
      });

      return {
        output: result.output,
        meta,
      };
    } catch (error) {
      lastError = error;
      const retryable = !(error instanceof LlmProviderError && error.retryable === false);
      logLlmProviderFailure({
        error,
        provider,
        model: args.model,
        topic: args.topic,
        attempt,
        maxAttempts,
        retryable,
      });
      if (!retryable) {
        providers.splice(providerIndex % providers.length, 1);
        if (providers.length === 0) {
          break;
        }
        providerIndex %= providers.length;
      } else {
        providerIndex = (providerIndex + 1) % providers.length;
      }
    }
  }

  throw new LlmProviderError("All LLM providers failed.", { cause: lastError });
}
