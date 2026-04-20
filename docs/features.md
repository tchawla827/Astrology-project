# Feature Catalog

Grouped by module. Each feature points at the phase that owns it. The phase file is the implementation contract — this doc is a map, not a spec.

## Onboarding & account

| Feature | Phase | Notes |
|---|---|---|
| Sign up / login (email + OAuth) | 00 | Supabase Auth |
| Intent selection (know-self / career / marriage / etc.) | 02 | Seeds first dashboard emphasis |
| Birth details intake (name, date, time, place) | 02 | Mapbox place autocomplete, tz resolution |
| Birth-time confidence (exact / approximate / unknown) | 02 | Drives `confidence` downstream |
| Profile generation loading screen | 02 | Animated labels of compute stages |
| Tone default preference | 02 | Stored on `user_profiles.default_tone_mode` |
| Account deletion (hard delete with cascade) | 13 | GDPR path |

## Home dashboard

| Feature | Phase |
|---|---|
| Profile summary card (Lagna, Moon, Nakshatra) | 03 |
| Current Mahadasha + Antardasha card | 03 |
| Current transit pressure/support card | 03 |
| Dominant themes card | 03 |
| Focus insight card with "why this?" | 03 |
| Ask Astrology CTA card | 03 |
| Daily panchang strip | 11 |
| Daily prediction card | 10 |
| Next favorable / caution window | 10 |

## Chart explorer

| Feature | Phase |
|---|---|
| D1 / D9 / Moon chart viewer | 04 |
| North / South chart style toggle | 04 |
| Simple / Technical view toggle | 04 |
| Planet drilldown (sign, house, dignity, retrograde, combustion) | 04 |
| House drilldown (lord, occupants, aspects) | 04 |
| Yoga list with detection notes | 04 |
| Compare D1 vs D9 side-by-side | 04 |
| Additional D-charts (D10, D7, D12, D60 etc.) | Post-MVP |

## Life areas

| Feature | Phase |
|---|---|
| Personality report | 06 |
| Career report | 06 |
| Money / Wealth report | 06 |
| Relationships report | 06 |
| Marriage / family / health / education / spirituality / relocation reports | Post-MVP |
| Each report uses a derived topic bundle | 05 (data), 06 (UI) |

## Ask Astrology

| Feature | Phase |
|---|---|
| Free-text question input | 08 |
| Starter questions | 08 |
| Question classifier | 07 |
| Topic bundle selection | 07 |
| Provider adapter (Gemini primary, Groq fallback) | 07 |
| Answer schema validation + repair | 07 |
| Structured answer card (verdict / why / timing / confidence / advice) | 08 |
| Tone toggle (Balanced / Direct / Brutal) | 08 |
| Depth toggle (Simple / Technical) | 08 |
| Follow-up questions within session | 08 |
| Smart follow-up suggestions | 08 |
| "Why this answer?" transparency panel | 09 |
| Birth-time sensitivity banner | 09 |

## Daily predictions + date machine

| Feature | Phase |
|---|---|
| Today's transit summary against natal chart | 10 |
| Pick any date (past or future) and see the day's prediction | 10 |
| Structured output (favorable / caution / technical basis) | 10 |
| Tone-aware rendering | 10 |

## Panchang + muhurta

| Feature | Phase |
|---|---|
| Daily panchang (tithi, nakshatra, yoga, karana, vaara) | 11 |
| Sunrise / sunset | 11 |
| Muhurta windows (auspicious / inauspicious) | 11 |
| Use device location by default, switchable | 11 |

## Share + export

| Feature | Phase |
|---|---|
| Share-card PNG of an Ask answer | 12 |
| Basic profile PDF export | 13 |
| Answer share via copy link | 13 |
| OG-image for shared answer URLs | 12 |

## Premium + monetization

| Feature | Phase |
|---|---|
| Free vs premium tier gating | 13 |
| Stripe subscription | 13 |
| Ask usage quota on free tier | 13 |
| Analytics events (activation, Ask usage, conversion) | 13 |

## Post-MVP (explicitly not in phases 00–14)

- Compatibility module
- Remedies module (mantras, donations, discipline)
- Full divisional chart library (D10/D12/D30/D60 deep drilldown)
- Notifications and alerts (dasha change, transit shift)
- Saved insights / bookmarks / journaling
- Rectification assistant
- Annual forecast reports
- Consultation prep export
- Voice / audio reports
- Mobile app (Expo)
- Multi-profile (partner / family / friends) — scaffolded in data model, not surfaced in UI

## Feature → product-rule mapping

Every feature must answer one of these:

- What does my chart show?
- Why is this happening?
- What is active now?
- What is likely next?
- Which part of the chart says that?

If a proposed feature doesn't map to one of these, it doesn't ship.
