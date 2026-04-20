# Conventions

Hard rules for how code is written in this repo. If a rule conflicts with a phase file, fix the phase file — not the rule.

## Non-negotiable product rules

1. **The LLM never computes astrology.** All chart, dasha, transit, panchang, yoga data comes from `astro-engine` or was computed by it and stored.
2. **Every Ask answer cites its chart factors.** `AskAnswer.technical_basis` is required and validated.
3. **Never send a full profile to the LLM.** Always a topic bundle.
4. **Structured before prose.** New astrological outputs must have a Zod/Pydantic schema before a UI renders them.
5. **Brutal ≠ cruel.** Tone is adjusted; truth isn't.

## TypeScript (web)

- `tsconfig.json` must have `"strict": true` and `"noUncheckedIndexedAccess": true`.
- No `any`. Use `unknown` + narrow.
- Zod schemas live in `web/lib/schemas/`. TypeScript types are inferred from schemas with `z.infer`.
- Server-only code is under `web/app/api/` or `web/lib/server/`. Never import server modules into client components.
- React Server Components by default. Convert to client component (`'use client'`) only when interactivity requires it.
- Tailwind utility classes for styling. Component primitives from shadcn/ui. No CSS modules.

## Python (astro-engine)

- Python 3.11. `ruff` + `ruff format` + `mypy --strict` must pass.
- All request/response models are pydantic.
- No DB code, no HTTP clients — engine is stateless and outbound-free.
- Ephemeris file path configurable via `SWISS_EPHEMERIS_PATH`. Never hardcode.
- Every calculation function has a docstring citing the rule it implements (e.g. "Navamsa: each 30° divided into 9 parts of 3°20'; starting sign per Parashara movable/fixed/dual rules").

## File naming

- Next.js route folders: kebab-case. Route files: `page.tsx`, `layout.tsx`, `route.ts`.
- Components: `PascalCase.tsx`. Hooks: `useCamelCase.ts`.
- Schemas: `<entity>.ts` exporting `<Entity>Schema` and `type <Entity>`.
- Python modules: `snake_case.py`.
- Supabase migrations: `NNN_short_name.sql`, numbered sequentially.

## Testing

- **Web**: Vitest. At minimum per phase: one unit test per Zod schema, one integration test per API route, one component test for each shipped user-visible feature.
- **Engine**: pytest. Golden charts under `astro-engine/tests/golden/` must pass. Minimum one golden per divisional chart and one per yoga detector.
- **Ask layer**: a `tests/golden-questions/` directory of `(question, expected_topic, minimum_charts_cited)` pairs. Phase 07 ships the harness. New Ask prompt versions must pass these before merge.
- Aim for tests that regress correctness, not coverage percentage.

## Commits

- Conventional Commits: `feat(phase-03): add dashboard summary card`.
- One phase per branch. Branch name `phase/NN-short-slug`.
- Commit after each acceptance-criteria box is ticked, not at the end of a phase.

## Claude Code workflow rules

- **Before a phase:** read the phase file, check all **Depends on** phases are Done, read the layer docs the phase references.
- **During a phase:** respect the **Out of scope** list. If a needed change isn't in scope, note it and keep moving — don't drift.
- **After a phase:** run typecheck, lint, and the phase's tests. Run `graphify update .`. Flip the status in [phases/README.md](phases/README.md) to Done.
- **When a phase file is wrong:** fix the doc before writing code. Phase docs are executable specs.

## Graphify

- This project has a knowledge graph at `graphify-out/`. See [../CLAUDE.md](../CLAUDE.md).
- Any phase that modifies code under `web/` or `astro-engine/` must end with `graphify update .`.
- Do not manually edit anything under `graphify-out/`.

## Secrets

- `.env.local` and `astro-engine/.env` are gitignored.
- Service-role Supabase key and LLM API keys never ship to the browser.
- `astro-engine` validates the shared HMAC header on every request.

## Performance defaults

- `/api/profile` generation: user-perceivable loading is fine (animated labels). Target < 2s p95.
- `/api/ask`: target < 6s p95 including classifier + bundle lookup + LLM.
- `/api/daily`: target < 1.5s p95. Cached transit data drops this to < 400ms.
- If a target is blown, profile before optimizing. Don't pre-cache speculatively.

## Accessibility

- All interactive elements keyboard-reachable.
- Color contrast AA minimum.
- Chart visualizations have a readable table fallback behind a `role="table"` disclosure.
- No motion-driven critical information.

## Error handling

- Server actions / route handlers return structured errors: `{ error: { code, message } }`.
- UI shows a graceful error card, never a stack trace.
- Validation errors are explicit about which field failed.
- Astrology-engine downtime shows a "we're recomputing your chart" state, not silent failure.

## Privacy

- Birth data is personal. Treat like medical data in logging — never include raw birth details in analytics events.
- Analytics events reference `user_id` and `event_name` + non-PII properties only.
- Account deletion removes every row keyed by `user_id` via cascade + scrubs Supabase Storage exports.
