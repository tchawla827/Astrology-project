# Architecture

## Stack (locked)

| Layer | Tech |
|---|---|
| Web app | Next.js 14+ (App Router), TypeScript strict, React Server Components where sensible |
| UI | Tailwind CSS, shadcn/ui, lucide-react icons |
| Client data | React Server Components + Server Actions; TanStack Query only if needed for Ask chat |
| Backend (Next.js) | Route Handlers under `app/api/*`, Server Actions for mutations |
| Astro engine | Python 3.11, FastAPI, `pyswisseph` (Swiss Ephemeris), `pydantic` for I/O |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + OAuth) |
| Storage | Supabase Storage (exports, share cards) |
| LLM | Gemini (primary), Groq (fallback) — behind provider adapter |
| Payments | Stripe (phase 13) |
| Deploy | Vercel (web), Render or Fly.io (astro-engine) |
| Telemetry | Vercel Analytics + Supabase logs + custom `analytics_events` table |

## Supabase environment rule

We are using a hosted Supabase project (in-browser) instead of Docker and local Supabase.
Database connection is set via `DATABASE_URL` in `.env`.
Example connection string: `postgresql://postgres.woefztezxjrkdpkmxdnt:[YOUR-PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`

## Repo layout

```
astri-project/
├── web/                          # Next.js app
│   ├── app/                      # App Router routes
│   │   ├── (auth)/               # login, signup
│   │   ├── (onboarding)/         # birth intake flow
│   │   ├── (app)/                # authenticated app shell
│   │   │   ├── dashboard/
│   │   │   ├── charts/
│   │   │   ├── life-areas/[topic]/
│   │   │   ├── ask/
│   │   │   ├── daily/            # daily predictions + date machine
│   │   │   └── panchang/
│   │   └── api/
│   │       ├── profile/
│   │       ├── charts/
│   │       ├── ask/
│   │       ├── daily/
│   │       └── export/
│   ├── components/
│   │   ├── ui/                   # shadcn primitives
│   │   ├── charts/               # chart renderers
│   │   ├── ask/                  # chat UI, tone toggle, answer card
│   │   └── insights/             # dashboard cards
│   ├── lib/
│   │   ├── supabase/             # server + browser clients
│   │   ├── astro/                # typed client for astro-engine
│   │   ├── llm/                  # provider adapter, classifier, bundler
│   │   ├── schemas/              # Zod schemas (shared with API)
│   │   └── utils/
│   ├── supabase/
│   │   └── migrations/           # numbered SQL migrations
│   └── tests/                    # Vitest
├── astro-engine/                 # Python FastAPI service
│   ├── app/
│   │   ├── main.py               # FastAPI app
│   │   ├── routes/               # /profile, /charts, /dasha, /transits, /panchang
│   │   ├── calc/                 # planets, houses, vargas, dashas, yogas
│   │   ├── schemas/              # pydantic models
│   │   └── versioning.py
│   ├── tests/                    # pytest + golden charts
│   └── pyproject.toml
├── docs/                         # this folder
├── graphify-out/                 # knowledge graph — do not manually edit
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

## Service boundaries

```
  User browser
       |
       v
  +----------+        +------------------+
  |  web/    |  HTTP  |   astro-engine   |
  | Next.js  | -----> |     FastAPI      |
  |          | <----- |   pyswisseph     |
  +----------+        +------------------+
       |                     ^
       | Supabase SDK        | (no direct client access)
       v                     |
  +----------+                |
  | Supabase |<---------------+  (engine does not touch DB)
  |Postgres  |
  | + Auth   |
  +----------+
       ^
       |  provider adapter
       v
  +----------+
  | LLM      |  Gemini (primary)
  | providers|  Groq   (fallback)
  +----------+
```

Key rules:

- `astro-engine` is stateless. It never reads/writes Supabase. `web/` is the only DB caller.
- `web/` never calls LLM providers directly — always through the provider adapter in `web/lib/llm/`.
- Birth data never leaves our stack. No analytics pixel sees it.

## Data flow — profile generation

1. User submits birth details via Server Action.
2. `web/` validates + geocodes place (Mapbox or Nominatim — see env below).
3. `web/` inserts `birth_profiles` row with `status = 'processing'`.
4. `web/` calls `astro-engine` `/profile` with resolved lat/lon/tz/ayanamsha.
5. Engine returns full `ChartSnapshot` (D1, Bhava, Moon, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D16, D20, D24, D27, D30, D40, D45, D60, planets, houses, Vimshottari dasha, current transits).
6. `web/` stores `chart_snapshots` row + flips `birth_profiles.status = 'ready'`.
7. (Phase 05) Derived-feature job enqueued — precomputes topic bundles.

## Data flow — Ask Astrology

1. User types question in `/ask`.
2. `web/` calls `lib/llm/classify` → returns `{topic, needs_timing, birth_time_sensitive}`.
3. `web/` calls `lib/llm/buildContext(profile_id, topic)` → loads precomputed topic bundle from Supabase.
4. `web/` calls `lib/llm/generateAnswer({bundle, question, tone, depth})` via provider adapter.
5. Adapter tries Gemini, falls back to Groq on failure.
6. Response is validated against the Zod `AskAnswer` schema. Repair pass on malformed output; reject on second failure.
7. `ask_messages` row stored with full `llm_metadata`.
8. UI renders structured answer. Transparency panel reads `technical_basis`.

## Versioning

Four independent version strings travel with data:

| Version | Owned by | Example |
|---|---|---|
| `engine_version` | astro-engine | `astro_engine_v1` |
| `derived_schema_version` | web derived-features job | `derived_v1` |
| `prompt_version` | web llm layer | `ask_v1` |
| `answer_schema_version` | web llm layer | `answer_v1` |

Stored on every row that depends on them. Lets us roll prompts / recompute bundles without corrupting history.

## Caching

- **ChartSnapshot** — recomputed only on birth-detail edits or engine version bump.
- **Topic bundles** — precomputed once per `(profile_id, derived_schema_version)`.
- **Dashboard summary** — same cache as topic bundles.
- **Ask answers** — not cached in MVP. (Answer variance is a feature, not a bug.)
- **Transit data for daily view** — cache per `(date, lat, lon)` for 24h. Transit positions don't depend on the user.

## Environment variables

```
# web/.env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # server only
ASTRO_ENGINE_URL=                  # e.g. https://astro-engine.fly.dev
ASTRO_ENGINE_SECRET=               # shared HMAC for service-to-service auth
GEMINI_API_KEY=
GROQ_API_KEY=
MAPBOX_TOKEN=                      # for place autocomplete
STRIPE_SECRET_KEY=                 # phase 13
STRIPE_WEBHOOK_SECRET=             # phase 13

# astro-engine/.env
ASTRO_ENGINE_SECRET=               # must match web
SWISS_EPHEMERIS_PATH=./ephe        # bundled ephemeris files
```

## Failure modes

| Failure | Behavior |
|---|---|
| Place resolution fails | Return disambiguation list to user |
| Birth time missing / weak | Compute what's possible; mark time-sensitive outputs low confidence; UI shows a banner |
| Astro-engine timeout | Retry once, then surface error. Don't degrade to fake data. |
| LLM provider failure | Provider adapter tries primary → fallback. If both fail, return a graceful error card. |
| LLM output malformed | Validate against Zod. Repair pass. Reject on second failure. |

## Security

- Supabase Row Level Security on every user-scoped table. A user can only read/write their own profiles, chat sessions, exports.
- Service role key is server-only, never shipped to browser.
- `astro-engine` accepts only requests signed with `ASTRO_ENGINE_SECRET` (simple HMAC header).
- Birth data at rest: rely on Supabase encryption. Add column-level encryption only if compliance requires it.
- Users can delete their account + all data (phase 13).

## Architecture rule

**Compute once. Store structurally. Interpret selectively.** If a change violates this, stop and revisit before writing code.
