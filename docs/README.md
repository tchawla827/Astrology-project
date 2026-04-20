# Astri — Documentation Index

A precision Vedic astrology web app: deterministic calculation engine + chart-aware LLM interpreter with tone modes.

## How to use these docs with Claude Code

**To implement a phase, say:** `implement phase 3` (or any phase number 00–14).

Claude Code will:
1. Read `docs/phases/phase-NN-*.md`.
2. Check that every **Depends on** phase is marked Done in [phases/README.md](phases/README.md). Stop if not.
3. Read referenced layer docs (architecture, data-model, astro-engine, llm-layer).
4. Implement every item in **Deliverables**.
5. Verify every **Acceptance criteria** box.
6. Run `graphify update .`.
7. Flip status to Done in [phases/README.md](phases/README.md).

One phase file + the layer docs it references is always enough to implement that phase. If it isn't, the phase file is wrong — fix the doc before writing code.

## Locked decisions

| Area | Choice |
|---|---|
| Platform | Web, Next.js 14+ App Router, TypeScript (strict) |
| UI | Tailwind + shadcn/ui |
| Astro engine | Python FastAPI microservice, `pyswisseph` (Swiss Ephemeris), ayanamsha = Lahiri |
| Data / auth / storage | Supabase (Postgres + Auth + Storage + RLS) |
| LLM | Gemini primary, Groq fallback, behind a provider adapter |
| Repo shape | Monorepo: `web/`, `astro-engine/`, `docs/`, `graphify-out/` |
| Payments | Stripe (phase 13) |
| Deploy | Vercel (`web/`), Render or Fly.io (`astro-engine/`) |

Do not revisit these during a phase — change them in [architecture.md](architecture.md) first, then ripple forward.

## Files

- [vision.md](vision.md) — product thesis, users, differentiators, brand voice
- [architecture.md](architecture.md) — stack, repo layout, service boundaries, env, deploy
- [data-model.md](data-model.md) — entities, Supabase schema, REST contracts
- [astro-engine.md](astro-engine.md) — Python service spec, endpoints, calculation rules
- [llm-layer.md](llm-layer.md) — provider adapter, context bundles, prompts, tone, schema
- [features.md](features.md) — feature catalog by module, mapped to phases
- [conventions.md](conventions.md) — code style, testing, commits, hard rules
- [phases/](phases/) — 15 numbered phase files + phase index

## Core product rules (never violate)

1. The LLM never calculates astrology. The engine computes; the LLM explains.
2. Every Ask answer must cite the chart factors it used (transparency panel).
3. Never send the full profile to the LLM — select a topic bundle (see [llm-layer.md](llm-layer.md)).
4. Every astrology conclusion is structured data before it becomes prose.
5. Brutal tone is blunt, not cruel — still grounded in supplied chart data.

## Graphify

This repo uses graphify for a code knowledge graph at `graphify-out/`. See [../CLAUDE.md](../CLAUDE.md). After any phase that modifies code, run `graphify update .`.
