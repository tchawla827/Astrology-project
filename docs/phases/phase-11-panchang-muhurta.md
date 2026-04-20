# Phase 11 — Panchang + Muhurta

**Status:** Not started
**Depends on:** 01
**Scope:** S
**Recommended model:** `claude-haiku-4-5-20251001` — calls an engine endpoint that already exists, renders the response into a card with a timeline. Simple data display with light caching.

## Goal

Daily panchang card: tithi, nakshatra, yoga, karana, vaara, sunrise/sunset, and muhurta windows for any date + location.

## Deliverables

- `web/app/(app)/panchang/page.tsx` — today's panchang.
- `web/app/(app)/panchang/[date]/page.tsx` — any-date panchang.
- `web/components/panchang/PanchangCard.tsx` — five-element display (tithi / nakshatra / yoga / karana / vaara).
- `web/components/panchang/SunTimes.tsx` — sunrise / sunset / solar-noon.
- `web/components/panchang/MuhurtaTimeline.tsx` — a horizontal strip showing auspicious/inauspicious windows (Rahu kaal, Abhijit, etc.).
- `web/components/panchang/LocationPicker.tsx` — override default location.
- `web/app/api/panchang/route.ts` — `GET /api/panchang?date=...&lat=...&lon=...&tz=...`.
- `web/lib/server/loadPanchang.ts` — calls `astro.panchang(...)` with default = user's birth location, overridable.
- `web/lib/panchang/cache.ts` — cache by `(date, lat_rounded, lon_rounded)` for 7 days (panchang is deterministic).

## Specification

### Data source

All from `astro-engine`'s `POST /panchang` (shipped in phase 01). Response shape = `Panchang` in [../data-model.md](../data-model.md).

### Location default

Default = user's birth location. Override via `LocationPicker` (Mapbox autocomplete, same component from phase 02). Override persists in URL query.

### Card layout

```
[date picker]  [location display with "Change" link]

Tithi:      Shukla Panchami    until 14:32
Nakshatra:  Rohini             until 18:04
Yoga:       Vishkambha         until 11:47
Karana:     Bava               until 10:15
Vaara:      Monday

Sunrise:    05:42   Sunset: 19:18

Muhurta
─────────────────────────────────────
[auspicious green | caution red | neutral grey bars]
Abhijit:       11:45 – 12:33
Rahu Kaal:     07:30 – 09:00  (avoid)
Yamaganda:     10:30 – 12:00  (avoid)
Gulika Kaal:   13:30 – 15:00  (avoid)
```

### Muhurta windows (MVP set)

- Abhijit Muhurta (auspicious)
- Rahu Kaal (inauspicious)
- Yamaganda (inauspicious)
- Gulika Kaal (inauspicious)

Phase 01's `panchang.py` computes these from sunrise/sunset and weekday.

### Caching

7-day cache by `(date, lat_rounded, lon_rounded)` — panchang doesn't change once computed. Cache layer is the simplest possible: Supabase table or KV. Default = Supabase table `panchang_cache` added in this phase's migration.

### Empty / error states

If engine is down, show last-cached value with a "may be stale" note. If never cached + engine down, show a retryable error card.

### Integration with Dashboard

Phase 03's dashboard gets a thin panchang strip once this phase ships. The strip links to `/panchang`. Strip shows only: tithi name, nakshatra name, current muhurta status ("auspicious" / "avoid").

## Acceptance criteria

- [ ] `/panchang` renders today's five elements + sun times + 4 muhurta bars for the user's birth location.
- [ ] Date picker loads a different date correctly.
- [ ] Location override switches location and redraws.
- [ ] Cache hit on second view of the same (date, location).
- [ ] Dashboard strip renders and links to `/panchang` (requires phase 03 to be shipped — integration is a small patch).
- [ ] Typecheck + lint + tests pass.

## Out of scope

- Muhurta search ("best day for X in the next 90 days") — post-MVP.
- Event-specific muhurta (marriage, travel, surgery) — post-MVP.
- Hora divisions or choghadiya — post-MVP.
- User-curated "my muhurta alerts" — post-MVP.

## Verification

1. Open `/panchang` — eyeball tithi/nakshatra/yoga/karana match a known panchang reference (e.g. [Drik Panchang](https://www.drikpanchang.com)) for the same date + location.
2. Change location to another city — values update correctly.
3. Force engine down (kill astro-engine) — cached panchang for today still renders with a muted "may be stale" note.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
