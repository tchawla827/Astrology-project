# Data Model

Single source of truth for entity shapes, Supabase schema, and REST contracts. Phase files reference this doc — do not redefine types inside phase files.

## Design rule

Every important astrology conclusion is representable as structured data before it becomes prose. If a feature wants to output free text, it must first output a JSON object that the UI can render.

## Core entities (TypeScript)

```ts
// web/lib/schemas/index.ts exports Zod + inferred TS types for all of these.

export type User = {
  id: string;                        // matches auth.users.id
  email: string;
  name?: string;
  default_tone_mode: ToneMode;       // 'balanced' | 'direct' | 'brutal'
  subscription_tier: 'free' | 'premium';
  created_at: string;
};

export type BirthProfile = {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;                // ISO date
  birth_time: string;                // HH:mm:ss, local clock time
  birth_time_confidence: 'exact' | 'approximate' | 'unknown';
  birth_place_text: string;
  latitude: number;
  longitude: number;
  timezone: string;                  // IANA, e.g. 'Asia/Kolkata'
  ayanamsha: 'lahiri' | 'raman' | 'kp';
  engine_version: string;
  status: 'processing' | 'ready' | 'error';
  created_at: string;
};

export type ChartSnapshot = {
  id: string;
  birth_profile_id: string;
  engine_version: string;
  computed_at: string;
  summary: {
    lagna: string;                   // sign name
    moon_sign: string;
    nakshatra: string;
    pada: 1 | 2 | 3 | 4;
  };
  charts: {
    D1: Chart;
    D9: Chart;
    Moon: Chart;                     // moon chart (chandra lagna)
    // MVP = these three. Additional D-charts unlock in later phases.
  };
  planetary_positions: PlanetPlacement[];
  aspects: Aspect[];
  yogas: Yoga[];
  dasha: DashaSummary;
  transits: TransitSummary;          // as of computed_at
};

export type Chart = {
  chart_key: 'D1' | 'D9' | 'Moon' | 'D10' | string;
  ascendant_sign: string;
  houses: HousePlacement[];          // 12 entries
  planets: PlanetInChart[];          // planet sign+house inside this chart
};

export type PlanetPlacement = {
  planet: Planet;                    // 'Sun'|'Moon'|...|'Ketu'
  longitude_deg: number;
  sign: string;
  house: number;                     // 1..12 in D1
  nakshatra: string;
  pada: 1 | 2 | 3 | 4;
  retrograde: boolean;
  combust: boolean;
  dignity: 'exalted'|'own'|'friendly'|'neutral'|'enemy'|'debilitated';
};

export type PlanetInChart = {
  planet: Planet;
  sign: string;
  house: number;
};

export type HousePlacement = {
  house: number;
  sign: string;
  lord: Planet;
};

export type Aspect = {
  from: Planet;
  to: Planet | number;               // target can be planet or house
  kind: 'conjunction' | 'opposition' | 'trine' | 'square' | 'graha_drishti';
  orb_deg?: number;
};

export type Yoga = {
  name: string;
  confidence: 'low' | 'medium' | 'high';
  source_charts: string[];
  notes: string[];
};

export type DashaSummary = {
  system: 'vimshottari';
  current_mahadasha: DashaPeriod;
  current_antardasha: DashaPeriod;
  upcoming: DashaPeriod[];           // next 3
};

export type DashaPeriod = {
  lord: Planet;
  start: string;                     // ISO date
  end: string;
};

export type TransitSummary = {
  as_of: string;                     // ISO datetime
  positions: PlanetPlacement[];      // transit positions
  highlights: string[];              // e.g. 'Saturn over natal 10th house'
};

export type Planet =
  | 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter'
  | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

export type ToneMode = 'balanced' | 'direct' | 'brutal';
export type DepthMode = 'simple' | 'technical';
```

## Derived features (topic bundles)

```ts
export type DerivedFeatureSnapshot = {
  id: string;
  birth_profile_id: string;
  chart_snapshot_id: string;
  schema_version: string;            // e.g. 'derived_v1'
  topic_bundles: Record<Topic, TopicBundle>;
  dashboard_summary: DashboardSummary;
  time_sensitivity: { overall: 'low' | 'medium' | 'high'; note: string };
  computed_at: string;
};

export type Topic =
  | 'personality' | 'career' | 'wealth' | 'relationships'
  | 'marriage' | 'family' | 'health' | 'education'
  | 'spirituality' | 'relocation';

export type TopicBundle = {
  topic: Topic;
  charts_used: string[];             // e.g. ['D1', 'D9']
  headline_signals: string[];
  houses: Record<number, { summary: string; strength: 'low'|'medium'|'high' }>;
  planets: Record<Planet, { role: string; summary: string }>;
  timing: {
    current_mahadasha: string;
    current_antardasha: string;
    current_trigger_notes: string[];
  };
  confidence_note: string;
};

export type DashboardSummary = {
  top_themes: string[];              // 2-4 short strings
  focus_cards: FocusCard[];          // 1-3 cards
};

export type FocusCard = {
  id: string;
  title: string;
  body: string;
  why: { charts: string[]; houses: number[]; planets: Planet[] };
};
```

## Ask session / message

```ts
export type AskSession = {
  id: string;
  birth_profile_id: string;
  topic: Topic | 'mixed';
  tone_mode: ToneMode;
  created_at: string;
};

export type AskMessage =
  | { id: string; ask_session_id: string; role: 'user'; content: string; created_at: string }
  | {
      id: string;
      ask_session_id: string;
      role: 'assistant';
      content_structured: AskAnswer;
      llm_metadata: LlmMetadata;
      created_at: string;
    };

export type AskAnswer = {
  verdict: string;                   // one blunt sentence
  why: string[];                     // each tied to a chart factor
  timing: {
    summary: string;
    type: Array<'natal' | 'dasha' | 'transit'>;
  };
  confidence: {
    level: 'high' | 'medium' | 'low';
    note: string;
  };
  advice: string[];
  technical_basis: {
    charts_used: string[];
    houses_used: number[];
    planets_used: Planet[];
  };
};

export type LlmMetadata = {
  provider: 'gemini' | 'groq';
  model: string;
  prompt_version: string;
  answer_schema_version: string;
  context_bundle_type: Topic | 'mixed';
  latency_ms: number;
  tokens_in?: number;
  tokens_out?: number;
};
```

## Daily prediction + panchang (phases 10, 11)

```ts
export type DailyPrediction = {
  birth_profile_id: string;
  date: string;                      // ISO date, user-selected
  transits: TransitSummary;
  natal_overlays: {                  // where transits hit natal chart
    triggered_houses: number[];
    key_notes: string[];
  };
  tone: ToneMode;
  interpretation: {                  // LLM-generated, structured
    verdict: string;
    favorable: string[];
    caution: string[];
    technical_basis: { planets_used: Planet[]; houses_used: number[] };
  };
};

export type Panchang = {
  date: string;
  latitude: number;
  longitude: number;
  tithi: { name: string; end_time: string };
  nakshatra: { name: string; end_time: string };
  yoga: { name: string; end_time: string };
  karana: { name: string; end_time: string };
  vaara: string;                     // weekday
  sunrise: string;
  sunset: string;
  muhurta_windows: Array<{ name: string; start: string; end: string; kind: 'auspicious'|'inauspicious' }>;
};
```

## Supabase schema sketch

Phase 00 writes the actual migrations. This is the reference shape.

```sql
-- auth.users is managed by Supabase Auth.

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  default_tone_mode text not null default 'direct',
  subscription_tier text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  birth_date date not null,
  birth_time time not null,
  birth_time_confidence text not null,
  birth_place_text text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  ayanamsha text not null default 'lahiri',
  engine_version text not null,
  status text not null default 'processing',
  created_at timestamptz not null default now()
);

create table public.chart_snapshots (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  engine_version text not null,
  computed_at timestamptz not null default now(),
  payload jsonb not null            -- full ChartSnapshot shape above
);

create table public.derived_feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_snapshot_id uuid not null references public.chart_snapshots(id) on delete cascade,
  schema_version text not null,
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

create table public.ask_sessions (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  topic text not null,
  tone_mode text not null,
  created_at timestamptz not null default now()
);

create table public.ask_messages (
  id uuid primary key default gen_random_uuid(),
  ask_session_id uuid not null references public.ask_sessions(id) on delete cascade,
  role text not null,
  content text,                      -- user messages
  content_structured jsonb,          -- assistant AskAnswer
  llm_metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  birth_profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  kind text not null,                -- 'basic_report_pdf' | 'share_card_png'
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigserial primary key,
  user_id uuid references public.user_profiles(id) on delete set null,
  event_name text not null,
  properties jsonb,
  occurred_at timestamptz not null default now()
);

-- Enable RLS on every table. Policies: user_id must match auth.uid().
```

## REST contracts

All live under `web/app/api/`. Request/response bodies are Zod-validated.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/profile` | Create BirthProfile → enqueues generation |
| GET | `/api/profile/:id/summary` | ChartSnapshot summary card |
| GET | `/api/profile/:id/charts/:key` | One chart (D1, D9, Moon, etc.) |
| GET | `/api/profile/:id/life-areas/:topic` | Rendered life-area report |
| POST | `/api/ask` | Ask Astrology — returns `AskAnswer` |
| GET | `/api/ask/sessions` | List Ask sessions for current user |
| GET | `/api/ask/sessions/:id` | Load one session + its messages |
| GET | `/api/daily?date=YYYY-MM-DD` | Daily prediction (time machine) |
| GET | `/api/panchang?date=YYYY-MM-DD&lat=&lon=` | Panchang for a date/place |
| POST | `/api/export` | Request a PDF or share-card export |
| POST | `/api/share-card` | Render an AskAnswer to PNG |
| POST | `/api/account/delete` | Soft-delete user + cascade |

Contracts for `astro-engine` are specified in [astro-engine.md](astro-engine.md).

## Changelog rule

When a new field is added to any entity, increment the relevant `*_version` constant and write a new migration — do not mutate existing rows.
