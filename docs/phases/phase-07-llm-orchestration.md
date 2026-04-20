# Phase 07 — LLM Orchestration

**Status:** Not started
**Depends on:** 05
**Scope:** L
**Recommended model:** `claude-opus-4-7` — the hardest architectural phase: provider abstraction with fallback, multi-layer prompt system, citation validation logic, schema repair, golden-question harness. Subtle bugs here corrupt every Ask answer forever.

## Goal

The full LLM plumbing behind Ask Astrology: provider adapter, classifier, context assembler, prompt versioning, schema validation, hallucination guards, golden-question harness. No UI — that's phase 08.

## Deliverables

- `web/lib/llm/providers/gemini.ts` — `LlmProvider` implementing Gemini (Google AI Studio API).
- `web/lib/llm/providers/groq.ts` — `LlmProvider` implementing Groq.
- `web/lib/llm/providers/index.ts` — primary/fallback orchestration with retries.
- `web/lib/llm/prompts/system_v1.ts` — system prompt.
- `web/lib/llm/prompts/route/*_v1.ts` — one file per topic route prompt.
- `web/lib/llm/prompts/user_v1.ts` — user prompt template.
- `web/lib/llm/prompts/index.ts` — `PROMPT_VERSIONS` registry.
- `web/lib/llm/classify.ts` — `classifyQuestion(...)`.
- `web/lib/llm/buildContext.ts` — `buildContextBundle({ profile_id, topic })` — loads the derived snapshot, adds current timing from chart snapshot, returns the packet.
- `web/lib/llm/generateAnswer.ts` — end-to-end Ask pipeline: classify → build context → prompt → call provider → validate → repair → return `AskAnswer`.
- `web/lib/llm/validate.ts` — Zod validation + citation checks from [../llm-layer.md](../llm-layer.md) § Hallucination controls.
- `web/lib/schemas/ask.ts` — `AskAnswerSchema`, `LlmMetadataSchema`.
- `web/lib/llm/errors.ts` — `LlmSchemaError`, `LlmProviderError`, `LlmCitationError`.
- `web/app/api/ask/route.ts` — `POST /api/ask` endpoint. Body: `{ question, tone, depth, session_id? }`. Returns `AskAnswer + session_id`.
- `web/lib/llm/tests/golden-questions.ts` — harness and dataset of `(question, profile_fixture, expected_topic, min_charts_cited, min_planets_cited)` tuples.
- `web/tests/llm/orchestration.test.ts` — runs the harness in CI against mocked provider.

## Specification

All contracts, prompt structure, tone rules, citation rules, and versioning are defined in [../llm-layer.md](../llm-layer.md). Implement them exactly. Do not re-specify here.

Key implementation notes:

### Provider adapter

```ts
const providers: LlmProvider[] = [geminiProvider, groqProvider];

export async function callWithFallback(args): Promise<{ output: unknown; meta: LlmMetadata }> {
  let lastError;
  for (const p of providers) {
    try {
      const start = Date.now();
      const res = await p.generate(args);
      return { output: res.output, meta: {
        provider: p.name,
        model: args.model ?? p.defaultModel,
        prompt_version: PROMPT_VERSIONS.system, // set from args
        answer_schema_version: PROMPT_VERSIONS.answer_schema,
        context_bundle_type: args.topic,
        latency_ms: Date.now() - start,
        tokens_in: res.tokens_in,
        tokens_out: res.tokens_out,
      }};
    } catch (e) { lastError = e; continue; }
  }
  throw new LlmProviderError('all providers failed', { cause: lastError });
}
```

### generateAnswer pipeline

```ts
export async function generateAnswer(input: {
  profile_id: string;
  question: string;
  tone: ToneMode;
  depth: DepthMode;
  session_id?: string;
}): Promise<{ answer: AskAnswer; meta: LlmMetadata; session_id: string }> {
  const profile_summary = await loadProfileSummary(input.profile_id);
  const classification  = await classifyQuestion({ question: input.question, profile_summary });
  const context_bundle  = await buildContextBundle({ profile_id: input.profile_id, topic: classification.topic });

  const system = systemPromptV1;
  const route  = routePromptFor(classification.topic, classification);
  const user   = userPromptV1({ context_bundle, question: input.question, tone: input.tone, depth: input.depth });

  const { output, meta } = await callWithFallback({
    system, messages: [{ role: 'user', content: `${route}\n\n${user}` }],
    schema: AskAnswerSchema, topic: classification.topic,
  });

  let answer: AskAnswer;
  try {
    answer = validateAnswer(output, context_bundle);
  } catch (e) {
    if (e instanceof LlmCitationError || e instanceof LlmSchemaError) {
      const repaired = await repairAttempt(output, AskAnswerSchema, e.message);
      answer = validateAnswer(repaired, context_bundle);
    } else { throw e; }
  }

  // consistency nudge
  if (answer.confidence.level === 'high' && profile_summary.birth_time_confidence !== 'exact' && classification.birth_time_sensitive) {
    answer.confidence.level = 'medium';
    answer.confidence.note = `${answer.confidence.note} (Adjusted: birth-time confidence is ${profile_summary.birth_time_confidence}).`;
  }

  const session_id = input.session_id ?? (await createAskSession({ profile_id: input.profile_id, topic: classification.topic, tone: input.tone })).id;
  await saveAskMessages(session_id, input.question, answer, meta);

  return { answer, meta, session_id };
}
```

### Classifier

Small Gemini call with constrained JSON schema. One short prompt. Implementation uses the same provider adapter.

### Citation validation

All four checks in [../llm-layer.md](../llm-layer.md) § Hallucination controls, hard-implemented in `validate.ts`. Each failure throws a distinct error type so the repair prompt can be targeted.

### Golden-question harness

CI-runnable. Uses:

- 5 profile fixtures (golden chart + variants: exact time / approximate / unknown).
- 10–15 questions spanning the topics.
- For each run, asserts:
  - classifier picked the expected topic.
  - `technical_basis.charts_used` intersects expected set.
  - `technical_basis.planets_used` intersects expected set.
  - `verdict.length` between 20 and 280 chars.
  - no citation-validation errors.

Provider is mocked with recorded responses in CI (record-replay pattern). Real calls happen only in a nightly job, not on every PR.

## Acceptance criteria

- [ ] `POST /api/ask` returns a valid `AskAnswer` for each topic against the test fixture profile.
- [ ] Provider fallback works: forcing Gemini to 500 results in a Groq-served answer.
- [ ] Citation validator rejects a response that cites a chart not in the context. Repair attempt runs. Final answer is clean.
- [ ] Birth-time consistency downgrade works: question marked `birth_time_sensitive` + non-exact profile → answer's `confidence.level` is never `high`.
- [ ] Golden-question harness passes in CI (mocked providers).
- [ ] `ask_messages` row contains full `llm_metadata` with exact prompt versions.
- [ ] Typecheck + lint + tests pass.

## Out of scope

- Ask UI (phase 08).
- Transparency panel UI (phase 09).
- Share cards (phase 12).
- Rate limiting / quota (phase 13).

## Verification

1. Sign up as a test user with the golden profile. Call `POST /api/ask` from a REST client with a career question. Inspect response shape.
2. Set `GEMINI_API_KEY=bad` locally. Call same endpoint — still succeeds via Groq.
3. Run the golden-question harness: `pnpm test llm/orchestration.test.ts` — all green.
4. `select content_structured, llm_metadata from ask_messages;` — inspect stored data.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
