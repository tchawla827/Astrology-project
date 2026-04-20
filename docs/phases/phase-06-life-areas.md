# Phase 06 — Life Area Reports

**Status:** Not started
**Depends on:** 05
**Scope:** M
**Recommended model:** `claude-haiku-4-5-20251001` — pure rendering work: read a bundle, map it to a view model, render sections. No novel logic; just turning a known data shape into a page.

## Goal

Readable, structured life-area pages that turn derived topic bundles into the "tell me about my career/marriage/money/personality" experience.

## Deliverables

- `web/app/(app)/life-areas/page.tsx` — index listing all available areas.
- `web/app/(app)/life-areas/[topic]/page.tsx` — single life-area report (Server Component).
- `web/components/life-areas/LifeAreaHeader.tsx` — title, subtitle, confidence badge.
- `web/components/life-areas/HeadlineSignals.tsx` — renders `headline_signals[]` as a numbered list.
- `web/components/life-areas/HouseBreakdown.tsx` — each relevant house with summary + strength chip.
- `web/components/life-areas/PlanetBreakdown.tsx` — each relevant planet with role + summary.
- `web/components/life-areas/CurrentTiming.tsx` — maha/antar lord + transit notes from the bundle.
- `web/components/life-areas/AskThisTopicCta.tsx` — "Ask about your {topic}" button, deeplinks to `/ask?topic=career&tone=direct`.
- `web/app/api/profile/[id]/life-areas/[topic]/route.ts` — GET handler returning the bundle payload + a view model.
- `web/lib/life-areas/render.ts` — pure function: `TopicBundle → LifeAreaViewModel`.

## Specification

### MVP topics

MVP ships four pages (fastest-value subset of the ten bundles):

- `personality`
- `career`
- `wealth`
- `relationships`

Every other topic has a bundle but no dedicated page yet — hidden from `/life-areas` index until shipped. This is the right scope-control move: bundles are already computed; surfacing more is a one-file-per-topic change later.

### Page structure

```
LifeAreaHeader
  title ("Career")
  subtitle (first headline signal)
  confidence badge (from bundle.confidence_note + profile.birth_time_confidence)

HeadlineSignals
  2–3 bullet points (bundle.headline_signals)

HouseBreakdown
  foreach house in bundle.houses:
    house number + sign
    strength chip (high/medium/low)
    summary sentence

PlanetBreakdown
  foreach planet in bundle.planets:
    planet name + role (e.g. "Saturn — 10th lord")
    summary sentence

CurrentTiming
  "Currently running: {maha lord} Mahadasha, {antar lord} Antardasha"
  bullet list of transit notes relevant to this topic

AskThisTopicCta
  "Ask a question about your {topic} →"
```

### View model

`LifeAreaViewModel`:

```ts
type LifeAreaViewModel = {
  topic: Topic;
  title: string;              // display name
  confidence: { level: 'high'|'medium'|'low'; note: string };
  headline_signals: string[];
  houses: Array<{ number: number; sign: string; strength: 'high'|'medium'|'low'; summary: string }>;
  planets: Array<{ name: Planet; role: string; summary: string }>;
  timing: { mahadasha: string; antardasha: string; notes: string[] };
};
```

`render.ts` is the pure mapping from bundle + chart snapshot → view model. Keep it 100% deterministic — no LLM involvement in life-area pages.

### Tone on life-area pages

Life-area pages render in **direct** tone by default (not user's tone preference). They describe structure, not conclusions. Brutal-mode interpretation is reserved for Ask.

### Deeplink from CTA

`AskThisTopicCta` → `/ask?topic={topic}&tone={user.default_tone_mode}`. Phase 08 reads these params and prefills.

## Acceptance criteria

- [ ] `/life-areas` shows 4 tiles: Personality, Career, Wealth, Relationships.
- [ ] `/life-areas/career` renders all sections with real data from the derived bundle.
- [ ] Confidence badge reflects both bundle signal consistency and birth-time confidence.
- [ ] CTA deeplink opens `/ask` with topic and tone prefilled (verified in phase 08).
- [ ] Typecheck + lint + tests pass.

## Out of scope

- The other 6 topic pages (marriage, family, health, education, spirituality, relocation) — bundles exist; pages are a post-MVP shelf.
- LLM interpretation on this page (Ask handles that).
- Saving / bookmarking reports (post-MVP).
- PDF export of a life-area (phase 13 covers profile PDF; life-area PDF is post-MVP).

## Verification

1. Navigate to each of the 4 pages. Confirm content renders and matches what's in the derived snapshot.
2. Tap the Ask CTA — confirm phase 08's Ask page receives the topic and tone (phase 08 must be shipped first to verify fully, but the link format is locked).
3. Check accessibility: headings hierarchical, strength chips have ARIA labels.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
