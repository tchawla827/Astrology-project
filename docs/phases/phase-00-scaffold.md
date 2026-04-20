# Phase 00 — Scaffold

**Status:** Done
**Depends on:** —
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — boilerplate-heavy setup (configs, migrations, shell routes). No complex reasoning required.

## Goal

Stand up the monorepo skeleton so every later phase has a working dev environment to land code in.

## Deliverables

- `web/` — Next.js 14 App Router app with TypeScript strict, Tailwind, shadcn/ui initialized, Supabase client wired, ESLint + Prettier configured.
- `web/lib/supabase/` — `server.ts` and `browser.ts` clients using `@supabase/ssr`.
- `web/lib/schemas/index.ts` — Zod schemas for all entities in [../data-model.md](../data-model.md) (types only, no logic yet).
- `web/lib/astro/client.ts` — typed fetch wrapper for the astro-engine with HMAC header injection. Stub functions that will be implemented in phase 01.
- `web/supabase/migrations/001_init.sql` — creates every table listed in [../data-model.md](../data-model.md) § Supabase schema sketch. Enables RLS. Basic `user_id = auth.uid()` policies on user-scoped tables.
- `web/app/layout.tsx` — root layout with font, `<Providers>`, `<Toaster>`.
- `web/app/page.tsx` — signed-out landing redirect-to-signup stub.
- `web/app/(auth)/login/page.tsx`, `web/app/(auth)/signup/page.tsx` — Supabase Auth email + one OAuth provider (Google).
- `web/app/(app)/layout.tsx` — authenticated app shell with top nav (`Dashboard`, `Charts`, `Life Areas`, `Ask`, `Daily`, `Panchang`, `Profile`). Tabs are placeholders until their phases ship.
- `astro-engine/` — FastAPI project:
  - `pyproject.toml` with `fastapi`, `uvicorn`, `pyswisseph`, `pydantic`, `ruff`, `mypy`, `pytest`.
  - `app/main.py` — FastAPI app with HMAC dependency.
  - `app/versioning.py` — `ENGINE_VERSION = 'astro_engine_v1'`.
  - `app/routes/health.py` — `GET /health`.
  - `app/deps/auth.py` — `require_hmac` dependency reading `X-Astro-Secret`.
  - `ephe/` — download Swiss Ephemeris files (`sepl_*.se1`, `semo_*.se1`, `seas_*.se1`).
- `.github/workflows/ci.yml` — CI: typecheck + lint + vitest for `web/`, ruff + mypy + pytest for `astro-engine/`.
- Root `package.json` with `pnpm` workspaces OR just two independent projects. Default: two independent projects with a root `README.md` listing dev commands.
- Root `.env.example` listing every env var from [../architecture.md](../architecture.md) § Environment variables.
- Root `README.md` replaces no existing content — describes how to run both services locally.

## Specification

### Next.js setup

Use `create-next-app` with `--ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"`. Then:

1. Install shadcn/ui via CLI. Initialize with neutral base color.
2. Add shadcn primitives needed across phases: `button`, `card`, `dialog`, `input`, `select`, `toast`, `tabs`, `skeleton`, `toggle-group`, `badge`, `separator`.
3. Add `@supabase/ssr` and `@supabase/supabase-js`. Implement `server.ts` and `browser.ts` per Supabase docs.
4. Add `zod`.
5. Strict `tsconfig`: `"strict": true, "noUncheckedIndexedAccess": true`.

### Auth

Protect `/app/(app)/*` routes via middleware. Redirect unauthenticated to `/login`. `middleware.ts` uses Supabase session refresh.

On signup, create a matching `user_profiles` row via a Postgres trigger:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### RLS

Every user-scoped table gets:

```sql
alter table public.<table> enable row level security;
create policy "user owns row" on public.<table> for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```

For tables keyed by `birth_profile_id` (chart_snapshots, derived_feature_snapshots, ask_sessions, ask_messages, exports):

```sql
create policy "user owns related profile" on public.<table> for all
  using (exists (
    select 1 from public.birth_profiles bp
    where bp.id = <table>.birth_profile_id and bp.user_id = auth.uid()
  )) with check (...);
```

### FastAPI

`main.py` skeleton:

```python
from fastapi import FastAPI
from app.routes import health
from app.versioning import ENGINE_VERSION

app = FastAPI(title="astri-astro-engine", version=ENGINE_VERSION)
app.include_router(health.router)
```

HMAC dependency reads `X-Astro-Secret` and compares to `os.environ["ASTRO_ENGINE_SECRET"]` with `hmac.compare_digest`. Missing/wrong → raise `HTTPException(401)`.

### CI

`.github/workflows/ci.yml` runs two jobs:

- `web`: `pnpm i`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- `engine`: `pip install`, `ruff check`, `mypy app`, `pytest -q`.

## Acceptance criteria

- [x] `cd web && pnpm dev` boots and `/login` renders.
- [ ] A new signup creates matching row in `user_profiles`. (Implemented in migration trigger; verify against the hosted Supabase project.)
- [x] Protected `/app/(app)/dashboard` redirects to `/login` when signed out.
- [x] `cd astro-engine && uvicorn app.main:app --reload` boots and `GET /health` returns 200 with `engine_version`.
- [x] `POST /health` without `X-Astro-Secret` returns 401. (Even though health is GET — confirm HMAC dep works on a throwaway protected route.)
- [x] All entity Zod schemas compile. `pnpm typecheck` passes.
- [ ] `npx supabase db push --db-url "$DATABASE_URL"` applies cleanly against the hosted Supabase project.
- [ ] CI passes on push. (Workflow is configured; not run locally.)

## Out of scope

- Real astrology calculations (phase 01).
- Any UI beyond placeholder routes (later phases).
- Stripe / billing (phase 13).
- Ask functionality (phases 07–08).

## Verification

1. `pnpm --filter web dev` (or `cd web && pnpm dev`) — visit `/login`, sign up, land on `/dashboard` placeholder.
2. `cd astro-engine && uvicorn app.main:app --reload` — `curl localhost:8000/health` returns JSON with engine_version.
3. `npx supabase db push --db-url "$DATABASE_URL"` against the hosted Supabase project — all tables exist with RLS enabled (`\d+ public.birth_profiles` in psql shows the RLS line).

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
