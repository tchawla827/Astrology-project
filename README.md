# Astri Project

Astri is a Vedic astrology web app backed by a stateless FastAPI astrology engine.

## Local Development

Run the web app:

```bash
cd web
pnpm install
pnpm dev
```

Run the astrology engine:

```bash
cd astro-engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Checks

Web:

```bash
cd web
pnpm typecheck
pnpm lint
pnpm test
```

Astro engine:

```bash
cd astro-engine
ruff check .
mypy app
pytest -q
```

## Services

- `web/`: Next.js App Router app, Supabase Auth, Supabase Postgres access, UI shell.
- `astro-engine/`: FastAPI service for chart calculations. It is stateless and does not access the database.

Copy `.env.example` to the relevant local env files before running services.

## Supabase

Use a hosted Supabase project for database, auth, and storage verification.

```bash
cd web
npx supabase db push --db-url "$DATABASE_URL"
```
