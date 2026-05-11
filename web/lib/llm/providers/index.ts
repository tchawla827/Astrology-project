import type { ZodSchema } from "zod";

import { PROMPT_VERSIONS } from "@/lib/llm/prompts";
import { geminiProvider, type LlmMessage, type LlmProvider } from "@/lib/llm/providers/gemini";
import { openRouterProvider } from "@/lib/llm/providers/openrouter";
import { LlmProviderError } from "@/lib/llm/errors";
import type { AskClassification } from "@/lib/llm/classify";
import type { LlmMetadata, Topic } from "@/lib/schemas";

type ContextBundleType = Topic | "daily" | "planner" | "relationship";
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

function shouldLogLlmAttempts() {
  const flag = process.env.ASK_LLM_ATTEMPT_LOGS?.toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") {
    return false;
  }
  return process.env.NODE_ENV !== "test";
}

function logLlmAttempt(input: {
  phase: "start" | "success" | "failure" | "exhausted";
  callId: string;
  provider?: LlmProvider;
  model?: string;
  topic: ContextBundleType;
  attempt: number;
  maxAttempts: number;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  retryable?: boolean;
  status?: number;
  reason?: string;
}) {
  if (!shouldLogLlmAttempts()) {
    return;
  }

  console.log("LLM try", {
    phase: input.phase,
    call_id: input.callId,
    provider: input.provider?.name,
    model: input.model ?? input.provider?.defaultModel,
    topic: input.topic,
    attempt: input.attempt,
    max_attempts: input.maxAttempts,
    latency_ms: input.latencyMs,
    tokens_in: input.tokensIn,
    tokens_out: input.tokensOut,
    retryable: input.retryable,
    status: input.status,
    reason: input.reason,
  });
}

function selectedModel(provider: LlmProvider, override?: string) {
  if (override) {
    return override;
  }
  if (provider.name === "openrouter") {
    return process.env.OPENROUTER_MODEL || provider.defaultModel;
  }
  return provider.defaultModel;
}

function logLlmProviderFailure(input: {
  error: unknown;
  provider: LlmProvider;
  model?: string;
  topic: ContextBundleType;
  attempt: number;
  maxAttempts: number;
  retryable: boolean;
  callId?: string;
}) {
  const status = input.error instanceof LlmProviderError ? input.error.status : undefined;
  console.error("LLM provider failed", {
    call_id: input.callId,
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
  const callId = `llm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  for (let attempt = 1; attempt <= maxAttempts && providers.length > 0; attempt += 1) {
    const provider = providers[providerIndex % providers.length];
    if (!provider) {
      break;
    }

    try {
      const start = Date.now();
      const model = selectedModel(provider, args.model);
      logLlmAttempt({
        phase: "start",
        callId,
        provider,
        model,
        topic: args.topic,
        attempt,
        maxAttempts,
      });
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

      logLlmAttempt({
        phase: "success",
        callId,
        provider,
        model,
        topic: args.topic,
        attempt,
        maxAttempts,
        latencyMs: meta.latency_ms,
        tokensIn: result.tokens_in,
        tokensOut: result.tokens_out,
      });
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
      const status = error instanceof LlmProviderError ? error.status : undefined;
      logLlmAttempt({
        phase: "failure",
        callId,
        provider,
        model: selectedModel(provider, args.model),
        topic: args.topic,
        attempt,
        maxAttempts,
        retryable,
        status,
        reason: llmFailureReason(error),
      });
      logLlmProviderFailure({
        error,
        provider,
        model: selectedModel(provider, args.model),
        topic: args.topic,
        attempt,
        maxAttempts,
        retryable,
        callId,
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

  logLlmAttempt({
    phase: "exhausted",
    callId,
    topic: args.topic,
    attempt: maxAttempts,
    maxAttempts,
    reason: llmFailureReason(lastError),
  });
  throw new LlmProviderError("All LLM providers failed.", { cause: lastError });
}
