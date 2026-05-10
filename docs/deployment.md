# Deployment

This repo deploys as three free-tier services:

- `web/` on Vercel Hobby for the Next.js app.
- `astro-engine/` on Render Free for the FastAPI astrology engine.
- Supabase Free for Auth, Postgres, and Storage.

The free setup is suitable for demos, testing, and light personal use. Render Free web services sleep after idle time, and Supabase Free projects can pause after inactivity, so this is not a production-grade paid setup.

## 1. Supabase

Create a Supabase project and apply the migrations from `web/supabase/migrations`.

```bash
cd web
npx supabase db push --db-url "$DATABASE_URL"
```

Keep these values for the Vercel environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## 2. Astro Engine on Render

Use the root `render.yaml` Blueprint, or create a Render Web Service manually with:

- Root directory: `astro-engine`
- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Set these Render environment variables:

- `ASTRO_ENGINE_SECRET`: a long random secret shared only with the web app.
- `ENVIRONMENT`: `production`
- `PYTHON_VERSION`: `3.11.9`

Commit the Swiss Ephemeris files in `astro-engine/ephe/*.se1` before deploying. The engine defaults to `astro-engine/ephe`; override with `ASTRO_ENGINE_EPHE_PATH` only if your host uses a different path.

## 3. Web on Vercel

Import the repo into Vercel and set the project root directory to `web`.

Vercel will use `web/vercel.json`:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Framework: Next.js

Set these Vercel environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`: your Vercel production URL or custom domain.
- `NEXT_PUBLIC_APP_URL`: same as `NEXT_PUBLIC_SITE_URL`.
- `ASTRO_ENGINE_URL`: the Render service URL.
- `ASTRO_ENGINE_SECRET`: the same secret configured on Render.
- `NOMINATIM_USER_AGENT`: a unique app user agent.
- `NOMINATIM_EMAIL`: contact email for geocoding requests.

Optional feature variables:

- `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` if Google OAuth is configured in Supabase.
- `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, or `GROQ_API_KEY` for Ask/LLM features.
- `STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` for billing.

## Predeploy Checks

Run these before pushing:

```bash
pnpm --dir web run build
python -m pytest tests -q
```

Run the Python command from `astro-engine/`.
