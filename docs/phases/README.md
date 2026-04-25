# Phases

Execution plan for the MVP. 15 phases, each self-contained.

## How to invoke a phase

Tell Claude Code: `implement phase 3` (or `implement phase-03-dashboard`).

Claude will:

1. Read the phase file in full.
2. Verify every **Depends on** phase is marked Done below.
3. Read the layer docs referenced by the phase.
4. Implement every **Deliverable**.
5. Tick every **Acceptance criteria** box.
6. Run `graphify update .`.
7. Flip the status here to Done.

Phases are not allowed to skip or reorder. If a dependency isn't Done, Claude stops and asks.

## Phase status

| # | Phase | Status | Depends on | Scope |
|---|---|---|---|---|
| 00 | [Scaffold](phase-00-scaffold.md) | Done | — | M |
| 01 | [Astro engine core](phase-01-astro-engine-core.md) | Done | 00 | L |
| 02 | [Profile intake](phase-02-profile-intake.md) | Done | 00, 01 | M |
| 03 | [Dashboard](phase-03-dashboard.md) | Done | 02 | M |
| 04 | [Chart explorer](phase-04-chart-explorer.md) | Done | 02 | M |
| 05 | [Derived features](phase-05-derived-features.md) | Done | 01, 02 | M |
| 06 | [Life area reports](phase-06-life-areas.md) | Done | 05 | M |
| 07 | [LLM orchestration](phase-07-llm-orchestration.md) | Done | 05 | L |
| 08 | [Ask Astrology](phase-08-ask-astrology.md) | Done | 07 | L |
| 09 | [Transparency panel](phase-09-transparency-panel.md) | Done | 08 | S |
| 10 | [Daily predictions + date machine](phase-10-daily-predictions.md) | Done | 01, 05, 07 | M |
| 11 | [Panchang + muhurta](phase-11-panchang-muhurta.md) | Not started | 01 | S |
| 12 | [Share cards](phase-12-share-cards.md) | Not started | 08 | S |
| 13 | [Export + premium](phase-13-export-premium.md) | Not started | 02, 08 | M |
| 14 | [Polish + launch](phase-14-polish-launch.md) | Not started | all | M |

Scope key: S = half-day, M = 1-2 days, L = 2-4 days of focused Claude Code work.

## Dependency graph

```
        00 ─┬─────────────────────────────────────────┐
            │                                         │
            v                                         v
           01 ──────┐            ┌─── 02 ─── 03       │
            │      │              │      └── 04       │
            │      │              │                    │
            │      │              v                    │
            │      └─── 05 ──┬── 06                    │
            │               │                          │
            │               └─── 07 ──┬── 08 ──┬── 09 │
            │                         │         └── 12│
            │                         │                │
            │                         └── 13 <── 02 ──┘
            │
            ├─── 10 (needs 01 + 05 + 07)
            │
            └─── 11

                              14 (after everything)
```

## Parallelism notes

If two phases have no dependency link, they can be done in parallel across branches:

- 03 (Dashboard) ⟂ 04 (Chart Explorer) — both depend only on 02
- 10, 11 ⟂ 06 once their deps are done
- 12 ⟂ 13 once 08 is done

Default though: do them in order. It's simpler for one developer + Claude Code.

## Rule

If a phase takes more than 2× its scope estimate, stop and revisit the phase file. Either the spec is wrong or the dependency list is wrong. Fix the doc first.
