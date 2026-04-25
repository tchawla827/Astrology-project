# LLM Layer

The LLM exists to explain computed astrological facts. It does not calculate anything, invent placements, or answer from generic horoscope tropes. Every Ask answer is grounded strictly in the supplied context bundle.

## Core rules

1. Engine computes. LLM explains.
2. Send the minimum viable context — a single topic bundle, not the whole profile.
3. Every answer is structured (`AskAnswer` schema, see [data-model.md](data-model.md)).
4. Tone is a controlled feature, not model-personality drift.
5. If the model's output violates the schema or invents charts/factors not in context, reject it. One repair attempt, then fail loudly.

## Provider adapter

Located at `web/lib/llm/providers/`. Contract:

```ts
export interface LlmProvider {
  name: 'gemini' | 'groq';
  generate(args: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    schema: ZodSchema<unknown>;        // used for validation + json_mode hint
    model?: string;
    temperature?: number;
  }): Promise<{ output: unknown; tokens_in?: number; tokens_out?: number; latency_ms: number }>;
}
```

`web/lib/llm/index.ts` exports a single `generateAskAnswer(...)` that:

1. Tries primary (Gemini).
2. On network or 5xx, falls back to Groq.
3. Validates `output` against the `AskAnswer` Zod schema.
4. If invalid, does a single repair call (`please fix the JSON to match this schema`) against the same provider.
5. If still invalid, throws `LlmSchemaError` — API returns a graceful error card to the UI.

Never hardcode a provider name outside `web/lib/llm/`.

## Question classifier

```ts
async function classifyQuestion(input: { question: string; profile_summary: ProfileSummary }): Promise<{
  topic: Topic;
  needs_timing: boolean;
  needs_technical_depth: boolean;
  birth_time_sensitive: boolean;
  is_mixed: boolean;
}>;
```

Implemented deterministic-first with a constrained topic vocabulary. This keeps Ask fast, cheap, and aligned with the product rule that deterministic routing should happen before generative interpretation. The classifier can still expose `is_mixed`, but it always chooses one primary topic bundle so the LLM never receives the full profile.

Topics: `personality | career | wealth | relationships | marriage | family | health | education | spirituality | relocation`.

## Context bundles

Precomputed per-profile by the derived-features job (phase 05) and stored in `derived_feature_snapshots.payload.topic_bundles`.

Shape is defined in [data-model.md](data-model.md) as `TopicBundle`.

**Bundle contents per topic**:

| Topic | Charts | Houses | Planets (starting set) |
|---|---|---|---|
| personality | D1, Bhava, Moon | 1 | Lagna lord, Moon, Sun |
| career | D1, Bhava, D10 | 2, 6, 10, 11 | 10th lord, Saturn, Sun, Mercury, Jupiter |
| wealth | D1, D2, D11 | 2, 5, 9, 11 | 2nd lord, 11th lord, Jupiter, Venus |
| relationships | D1, D7, D9 | 5, 7, 11 | 7th lord, Venus, Mars, Moon |
| marriage | D1, D9 | 7 | Venus, Jupiter, 7th lord |
| family | D1, D3, D4, D12 | 2, 3, 4, 5 | 4th lord, Moon, Jupiter |
| health | D1, D6, D8, D30 | 1, 6, 8, 12 | Lagna lord, Moon, Sun |
| education | D1, D4, D24 | 2, 4, 5, 9 | Mercury, Jupiter, 4th lord, 5th lord |
| spirituality | D1, D20, D45, D60 | 5, 9, 12 | Ketu, Jupiter, 9th lord, 12th lord |
| relocation | D1, D4, D12 | 3, 4, 9, 12 | 4th lord, 12th lord, Rahu |

Each bundle also includes current dasha/antardasha and current transit highlights from the ChartSnapshot.

## Prompt architecture

Three layers: system, route, user. All stored as string constants in `web/lib/llm/prompts/` with explicit version suffixes.

### System prompt (`system_v1.ts`)

```
You are an interpreter of structured Vedic astrology outputs.

Hard rules:
- You never calculate astrology. All chart data is supplied in the context.
- Answer ONLY from the provided context. Do not invent placements, yogas, dashas, or transits.
- Do not reference charts not supplied. Do not claim a house/planet is involved unless it appears in context.
- Use direct, plain language. No horoscope filler. No spiritual cushioning.
- If signals are mixed, say so. If birth-time sensitivity is high, say so.
- When asked for technical reasoning, cite chart factors from the context by name.
- Always return valid JSON matching the schema supplied. No prose outside the JSON.
```

### Route prompt (`route_<topic>_v1.ts`)

Example for career:

```
The user is asking about career.
Use D1, Bhava, and D10 factors first: 10th house, 10th lord, 6th, 11th, and relevant planets (Saturn, Sun, Mercury, Jupiter) as they appear in context.
Combine with current dasha and transit highlights supplied in context.timing.
Do not drift into unrelated life areas unless a factor in context explicitly ties them together.
```

### User prompt (`user_v1.ts`)

```
Tone: {tone_mode}
Depth: {depth_mode}
Show chart reasoning: {show_reasoning}

Context:
{JSON.stringify(context_bundle)}

Question:
{question}

Return ONLY JSON matching AskAnswer schema.
```

## Answer schema

```ts
// web/lib/schemas/ask.ts
export const AskAnswerSchema = z.object({
  verdict: z.string().min(1).max(280),
  why: z.array(z.string().min(1)).min(1).max(5),
  timing: z.object({
    summary: z.string().min(1),
    type: z.array(z.enum(['natal','dasha','transit'])).min(1),
  }),
  confidence: z.object({
    level: z.enum(['high','medium','low']),
    note: z.string().min(1),
  }),
  advice: z.array(z.string().min(1)).max(5),
  technical_basis: z.object({
    charts_used: z.array(z.string()).min(1),
    houses_used: z.array(z.number().int().min(1).max(12)),
    planets_used: z.array(PlanetSchema).min(1),
  }),
});
```

`answer_schema_version = 'answer_v1'` — stored with every `ask_messages` row.

## Tone modes

Applied at prompt level in `user_v1.ts`:

- **Balanced** — clear, measured, no fluff. Safe default for wide audiences.
- **Direct** — stripped. Straight interpretation. Best brand fit.
- **Brutal** — blunt, unsentimental, pattern-calling. Must remain grounded in supplied chart data.

### Tone rendering guidance (appended to route prompt per mode)

```
balanced: Use measured language. No exclamation. No dramatic absolutes.
direct:   Say it plainly in the verdict. Skip cushioning phrases like "you may find".
brutal:   Be blunt. Call delay "delay", weakness "weakness", friction "friction".
          Only sharpen the message when the context supports it. Do not invent harshness.
```

If `brutal` is requested but context shows strong positive signals, the verdict stays positive — brutal is a tone, not a pessimism filter.

## Follow-up conversation

Ask sessions carry:

- active topic
- the prior `context_bundle_id`
- last two assistant `AskAnswer.verdict + technical_basis`

Do not re-inject the full profile each turn. If classifier decides the follow-up shifted topic, rebuild the bundle.

## Hallucination controls

Output-side validators in `web/lib/llm/validate.ts`:

1. **Schema validation** — Zod. Reject on failure.
2. **Chart citation check** — every string in `technical_basis.charts_used` must be in `context.charts_used`.
3. **House citation check** — every number in `technical_basis.houses_used` must appear somewhere in the bundle's `houses` map.
4. **Planet citation check** — every planet in `technical_basis.planets_used` must appear in the bundle's `planets` map.
5. **Consistency check** — if `confidence.level == 'high'` but `birth_time_sensitive == true` and profile has non-exact time, downgrade confidence to `medium` and append a note.

On failure at 2/3/4, do one repair attempt with a strict correction prompt. On second failure, throw.

## Prompt versioning

Every prompt file name includes its version: `system_v1.ts`, `route_career_v1.ts`, etc. Never mutate an old version — add `_v2`. The active versions are exported from `web/lib/llm/prompts/index.ts`:

```ts
export const PROMPT_VERSIONS = {
  system: 'system_v1',
  route: { career: 'route_career_v1', wealth: 'route_wealth_v1', /* ... */ },
  user: 'user_v1',
  answer_schema: 'answer_v1',
};
```

Every `ask_messages.llm_metadata` record stores the exact versions used.

## Model selection (MVP)

- Primary: `gemini-2.5-flash` (fast, cheap, JSON mode).
- Fallback: `llama-3.3-70b-versatile` via Groq.
- Classifier: `gemini-2.5-flash` with short prompt.
- Do not use different models per topic in MVP. Revisit after launch with real eval data.

## UX contract for /ask

Input controls rendered by phase 08:

- Tone: Balanced / Direct / Brutal (chip group)
- Depth: Simple / Technical (toggle)
- Show reasoning (toggle — opens phase 09 transparency panel)

Suggested starter questions:
- Why has my career been blocked?
- Is marriage delayed in my chart?
- Why do relationships keep repeating?
- Does my chart support moving abroad?
- Why does this period feel heavy?

## Final rule

The best Ask answer doesn't come from the biggest model. It comes from:

1. Strong chart computation.
2. Strong context selection.
3. Strict prompt rules.
4. Consistent rendering schema.
5. Memorable tone.
