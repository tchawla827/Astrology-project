# Phase 14 — Polish + Launch

**Status:** Not started
**Depends on:** all previous phases
**Scope:** M
**Recommended model:** `claude-sonnet-4-6` — checklist execution: Lighthouse fixes, Axe remediation, rate limits, deploy config. Broad surface area but each task is concrete and well-bounded.

## Goal

Everything that separates "works on localhost" from "ready for real users": performance, accessibility, SEO, error boundaries, rate limits, deploy pipeline, production secrets, and a final graphify refresh.

## Deliverables

### Performance

- Lighthouse pass on the 6 key routes (`/`, `/login`, `/dashboard`, `/ask`, `/charts/D1`, `/daily`). Targets: Performance ≥ 90, Best Practices ≥ 95, Accessibility ≥ 95.
- Image optimization audit — every `<Image>` has explicit width/height.
- Font subsetting — only ship glyphs used.
- Next.js route segment `revalidate` + `dynamic` correctness audit.
- Bundle analyzer run; remove unused dependencies; aim `<First Load JS>` < 200KB on `/dashboard`.

### Accessibility

- Axe DevTools zero serious issues on all key routes.
- Every interactive element reachable via keyboard.
- All charts have table fallbacks (phase 04 laid the groundwork — confirm all paths).
- Focus management on modals and drawers.
- Color contrast AA on all text (including on chart SVGs).

### SEO + marketing pages

- `web/app/(public)/page.tsx` — public landing page (uses existing `index.html` as a reference — replace it with Next.js).
- `web/app/(public)/how-it-works/page.tsx` — explainer.
- `web/app/(public)/pricing/page.tsx` — pricing (already exists in phase 13 inside app shell; this creates a public-facing mirror).
- Sitemap + robots.txt.
- OG meta tags on every public route.

### Error boundaries + observability

- `web/app/error.tsx` + per-segment `error.tsx` for `dashboard/`, `ask/`, `charts/`, `daily/`.
- Sentry (or equivalent) wired for both `web/` (Next.js) and `astro-engine/` (FastAPI).
- Log structured JSON in production.

### Rate limiting

- `/api/ask` — 10 requests/min per user (above quota check from phase 13).
- `/api/daily` — 30 requests/min per user.
- `/api/profile` — 5 creations/hour per user.
- `/api/share-card` — 20 per hour per user.
- Implement via Supabase / Upstash Redis or a simple `ask_usage`-style counter.

### Deploy

- Web → Vercel production. Env vars set via Vercel dashboard.
- Astro-engine → Render or Fly.io. Health check wired to `/health`.
- Supabase → production project, `supabase db push`, RLS verified on every table.
- Stripe → production keys, products created, webhook endpoint registered.
- Domain: `astri.app` (or as decided).
- HTTPS enforced. HSTS on.

### Monitoring + alerting

- Uptime check on `/health` and `/`.
- Alert on astro-engine 5xx > 1% over 5 min.
- Alert on `/api/ask` p95 > 10s.
- Daily summary email of signups, subscriptions, Ask volume (simple cron + Supabase query).

### Security pass

- Run `npm audit` — resolve criticals.
- Run `pip-audit` in astro-engine — resolve criticals.
- Confirm no service role key shipped to client (`grep` check in CI).
- Confirm HMAC validation present on every astro-engine route.
- Pen-test basics: IDOR on every `birth_profile_id` param, SQL injection on all user inputs, XSS on all rendered strings (verdict/why/headline).

### Legal / admin

- Privacy policy page (`/privacy`) — covers birth data, retention, deletion.
- Terms of service page (`/terms`).
- Cookie banner if analytics uses cookies.
- `/contact` — support email address.

### Graphify

- Final `graphify update .` after everything merges.
- Verify `graphify-out/GRAPH_REPORT.md` exists and references the new `web/` and `astro-engine/` trees.

## Specification

Every item above is a checklist. No design here — just hardening and polish. If something in this phase surfaces a bug in an earlier phase, fix it in the earlier phase's code (create a patch commit on the appropriate branch) rather than piling patches into phase 14.

### Launch readiness gate

Before flipping DNS to prod, verify by script (`scripts/launch-checklist.ts`):

- [ ] Can sign up with a fresh email in prod.
- [ ] Profile generates end-to-end.
- [ ] Ask returns a valid answer.
- [ ] Stripe test-mode purchase flips tier (switch to live keys last).
- [ ] Delete account removes all data.
- [ ] Graphify report is current.

## Acceptance criteria

- [ ] Lighthouse targets met on the 6 key routes.
- [ ] Axe clean on all key routes.
- [ ] All error boundaries catch and render graceful messages (simulated with a force-throw component).
- [ ] Rate limits measured and visible in logs (manually tested at the limit).
- [ ] Web + astro-engine deployed to production URLs.
- [ ] Stripe in live mode with at least one real test subscription (founder's own card is fine).
- [ ] Privacy policy + terms pages exist and are linked from the footer.
- [ ] Sentry is receiving events from both services.
- [ ] Final `graphify update .` run clean.

## Out of scope

- Paid marketing / launch campaigns (product side only).
- Internationalization (post-MVP).
- Native mobile app (post-MVP).
- Compatibility / remedies / rectification / annual reports (post-MVP).

## Verification

Ship it. Sign up with a non-dev email. Complete the full journey: onboarding → dashboard → chart → life area → ask question → share card → delete account. If any step feels slow, ugly, or broken, fix it before announcing.

## After completing

- Run `graphify update .` (final).
- Flip status to Done in [README.md](README.md).
- Tag release `v0.1.0` in git.
