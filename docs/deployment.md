# Deployment

This repo deploys as three free-tier services:

- `web/` on Vercel Hobby for the Next.js app.
- `astro-engine/` on Hugging Face Spaces using the root Dockerfile.
- Supabase Free for Auth, Postgres, and Storage.

The free setup is suitable for demos, testing, and light personal use. Hugging Face Spaces on free hardware can sleep after idle time, and Supabase Free projects can pause after inactivity, so this is not a production-grade paid setup.

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

## 2. Astro Engine on Hugging Face Spaces

Create a Docker Space at `https://huggingface.co/new-space`, then push this repo to the Space git remote. The root `README.md` includes the required Space metadata:

- `sdk: docker`
- `app_port: 7860`

The root `Dockerfile` builds only the FastAPI backend and starts:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 7860
```

Set these Space secrets in Settings:

- `ASTRO_ENGINE_SECRET`: a long random secret shared only with the web app.

Set these Space variables in Settings:

- `ENVIRONMENT`: `production`

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
- `ASTRO_ENGINE_URL`: your Space app URL, for example `https://tchawla827-naksha-astrology.hf.space`.
- `ASTRO_ENGINE_SECRET`: the same secret configured on Hugging Face Spaces.
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
