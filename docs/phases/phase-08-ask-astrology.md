# Phase 08 — Ask Astrology

**Status:** Not started
**Depends on:** 07
**Scope:** L
**Recommended model:** `claude-sonnet-4-6` — complex UI (chat flow, session state, tone toggles, follow-ups) but no novel domain reasoning; wires the phase 07 backend into a chat interface.

## Goal

The Ask screen: user types a question, picks tone and depth, sees a structured answer, and can ask follow-ups in the same session.

## Deliverables

- `web/app/(app)/ask/page.tsx` — Ask screen (has both client and server pieces).
- `web/app/(app)/ask/[session_id]/page.tsx` — resumed session view.
- `web/components/ask/QuestionInput.tsx` — textarea + submit, prefilled from `?question=` query param.
- `web/components/ask/ToneSelector.tsx` — segmented control (Balanced / Direct / Brutal).
- `web/components/ask/DepthToggle.tsx` — Simple / Technical.
- `web/components/ask/StarterQuestions.tsx` — 4–6 curated starter questions from the user's chart.
- `web/components/ask/AnswerCard.tsx` — renders `AskAnswer` (verdict / why / timing / confidence / advice).
- `web/components/ask/FollowUpSuggestions.tsx` — contextual suggestions after each answer.
- `web/components/ask/AskHistoryList.tsx` — list of past sessions (on `/ask` index).
- `web/components/ask/ThreadView.tsx` — scrollable list of messages in a session.
- `web/hooks/useAskSession.ts` — client hook managing session state + posting to `/api/ask`.
- `web/app/api/ask/sessions/route.ts` — GET list of sessions.
- `web/app/api/ask/sessions/[id]/route.ts` — GET one session with messages.

## Specification

### URL params

`/ask?topic={topic}&tone={tone}&question={text}` — all optional. Used by Life Area CTAs (phase 06) and Dashboard Ask CTA (phase 03).

### Empty state

If user has no sessions:

- Large Ask input centered.
- 4–6 starter questions rendered as clickable chips, sourced from `lib/ask/starters.ts` which picks starters based on the derived bundle (e.g. if career house is stressed → "Why has my career felt stuck?").

### Submission flow

1. Client creates `pending` message locally, shows skeleton.
2. POST `/api/ask` with `{ question, tone, depth, session_id? }`.
3. Stream not required for MVP — simple request/response.
4. On response, append both user + assistant messages to local state.
5. If this was a new session, update URL to `/ask/[session_id]` via `router.replace`.
6. On error (e.g. `LlmProviderError` surfaced), show a graceful error card with "retry".

### Answer card

Renders `AskAnswer` with these sections in order:

```
[Verdict]
   One blunt sentence (prominent).

[Why]
   Bullet list.

[Timing]
   summary + type chips.

[Confidence]
   level badge + note.

[What to do]
   Bullet list.

[Show reasoning]  ← disclosure (expanded by phase 09)
```

### Tone selector

- Persists user's choice within the session (sticky).
- Does NOT change the user's global default (that's set in `/profile` settings, phase 13).
- Tooltips on each option describe what changes. Brutal tooltip: "Blunt, grounded in the chart. Not cruel for its own sake."

### Depth toggle

Only affects the request, not the saved message. Simple = concise advice + short why. Technical = adds cited factor names in why strings.

### Follow-up suggestions

After each answer, show 3 contextual chips:

- "Ask about timing"
- "Ask about long-term pattern"
- "Explain this technically" / "Give me the brutal version" (exclusive depending on current state)

Clicking populates `QuestionInput` with the suggestion as a starter — user can edit before sending.

### Session persistence

Every `/api/ask` call either creates or appends to an `ask_sessions` row. Session list at `/ask` shows last 20 ordered by `created_at desc`. Each session shows: topic badge, tone badge, first-question preview, last-updated.

### Mobile

Question input sticky bottom; answer thread scrolls above it. Same pattern as any chat UI.

### Share

Phase 12 adds share-as-image. This phase wires the share button placeholder (disabled with "Coming next").

## Acceptance criteria

- [ ] Empty-state Ask page renders 4–6 chart-derived starter questions.
- [ ] Submitting a question shows a skeleton, then the structured answer card.
- [ ] Tone toggle actually changes the response style (verify manually with same question across all three tones).
- [ ] Depth toggle changes technical-basis inclusion in `why`.
- [ ] Follow-ups land in the same session; URL updates to `/ask/[session_id]`.
- [ ] Session list at `/ask` shows prior sessions; clicking one resumes it.
- [ ] Provider-failure error state is graceful, retryable.
- [ ] Query params prefill question and tone (life-area CTA smoke test).
- [ ] Typecheck + lint + component tests pass.

## Out of scope

- Transparency panel expansion beyond collapsed state (phase 09).
- Share-as-image (phase 12).
- Rate limits / quota UI (phase 13).
- Streaming responses.

## Verification

1. From `/life-areas/career`, click "Ask about your career" — lands on `/ask?topic=career&tone=direct&question=` with tone and topic prefilled.
2. Ask "Why has my career felt stuck?" in all three tones. Eyeball that Brutal is blunter than Balanced, grounded in the same chart factors.
3. Refresh page after a session exists — prior conversation visible.
4. Kill GEMINI_API_KEY, ask a question — Groq fallback renders the answer (verified via `llm_metadata.provider` in DB).

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
