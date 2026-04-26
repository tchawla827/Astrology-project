# Astri Project

Astri is a Vedic astrology web app backed by a stateless FastAPI astrology engine.

## Local Development

Run the web app:

```bash
cd web
pnpm install
pnpm dev
```

Run the web app with all routes compiled before the server starts:

```bash
cd web
pnpm start
```

`pnpm dev` uses Next.js development mode, which compiles routes on first access. `pnpm start` now runs a full `next build` first, then serves the precompiled app with `next start`.

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

Google OAuth is hidden by default. To enable it:

1. In Google Cloud, create a Web application OAuth client and add this authorized redirect URI:
   `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase Auth > Providers > Google, enable Google and paste the Google client ID and secret.
3. In Supabase Auth > URL Configuration, set the local Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL.
4. Set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` in the web environment.
