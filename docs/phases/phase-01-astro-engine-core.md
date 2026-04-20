# Phase 01 — Astro Engine Core

**Status:** Not started
**Depends on:** 00
**Scope:** L
**Recommended model:** `claude-opus-4-7` — domain-critical: Vedic ayanamsha math, divisional chart formulas, Vimshottari dasha arithmetic, golden-test assertions. Errors here break the entire product; accuracy matters more than speed.

## Goal

Make `astro-engine` actually compute Vedic astrology: the full supported chart catalog, Vimshottari dasha, transits, and a comprehensive yoga set — all through documented endpoints that `web/` can call.

Supported chart catalog:

- **Base views:** D1, Bhava, Moon.
- **Classical divisional charts:** D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60.
- **Common extras:** D5, D6, D8, D11.

## Deliverables

- `astro-engine/app/calc/ayanamsha.py` — set sidereal mode (Lahiri default), support `raman` and `kp`.
- `astro-engine/app/calc/planets.py` — compute planetary positions at a datetime.
- `astro-engine/app/calc/houses.py` — whole-sign house placement from ascendant.
- `astro-engine/app/calc/vargas.py` — full chart registry for D1, Bhava, Moon, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11, D12, D16, D20, D24, D27, D30, D40, D45, D60.
- `astro-engine/app/calc/dignity.py` — exaltation, debilitation, moolatrikona, own-sign, friend/enemy tables.
- `astro-engine/app/calc/combustion.py` — orb-based combustion detection.
- `astro-engine/app/calc/nakshatra.py` — nakshatra + pada for any longitude.
- `astro-engine/app/calc/dashas.py` — Vimshottari mahadasha + antardasha.
- `astro-engine/app/calc/yogas.py` — the five yogas listed in [../astro-engine.md](../astro-engine.md) § Yogas.
- `astro-engine/app/calc/transits.py` — transit positions + natal overlay rules.
- `astro-engine/app/calc/panchang.py` — tithi, nakshatra, yoga, karana, vaara, sunrise/sunset, muhurta windows.
- `astro-engine/app/schemas/` — pydantic models for requests and responses of every endpoint.
- `astro-engine/app/routes/profile.py` — `POST /profile`.
- `astro-engine/app/routes/charts.py` — `POST /charts/{key}`.
- `astro-engine/app/routes/dasha.py` — `POST /dasha`.
- `astro-engine/app/routes/transits.py` — `POST /transits`.
- `astro-engine/app/routes/panchang.py` — `POST /panchang`.
- `astro-engine/tests/golden/` — fixture JSON for at least one known chart (suggest: 1995-06-07 23:54 Panipat, India), with expected values for every supported chart key, dasha, and nakshatra values.
- `astro-engine/tests/test_profile.py`, `test_dasha.py`, `test_transits.py`, `test_panchang.py`, `test_yogas.py` — pytest suite.
- `web/lib/astro/client.ts` — full typed client for all five endpoints, Zod-validated responses.

## Specification

All contracts, defaults, calculation rules, error codes, versioning, and performance targets are defined in [../astro-engine.md](../astro-engine.md). Do not redefine them here. Implement them.

Key reminders:

- `pyswisseph` is the only astrology dependency.
- Ayanamsha default = Lahiri. Call `swe.set_sid_mode` once per request.
- Whole-sign houses. Lagna's sign is house 1.
- Rahu/Ketu = mean node. Ketu = Rahu + 180°.
- Yoga list capped at the 5 detectors in [../astro-engine.md](../astro-engine.md). No fancy additions yet.
- Transit highlights capped at the 4 rules in [../astro-engine.md](../astro-engine.md).

Request/response shapes match [../data-model.md](../data-model.md) types exactly. Names must align so `web/lib/schemas/` types work against the engine output without translation.

### Golden test rule

For the fixture chart, at least these values must match known-good outputs:

- Lagna sign
- Moon sign + nakshatra + pada
- Sun's sign and house
- Saturn's sign and house
- Current Mahadasha lord (for a fixed "as of" date in the test)
- D9 sign for Sun, Moon, Saturn
- Bhava house for Sun, Moon, Saturn
- One representative assertion each for D2, D3, D4, D7, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60
- One representative assertion each for D5, D6, D8, D11

Use [JHora](http://www.vedicastrologer.org/jh/), Parashara's Light, or another trusted source to generate expected values. Hand-enter into JSON in `tests/golden/`.

### web client

```ts
// web/lib/astro/client.ts
export const astro = {
  profile: (input: ProfileRequest) => post('/profile', input, ChartSnapshotSchema),
  chart:   (key: string, input: ChartRequest) => post(`/charts/${key}`, input, ChartSchema),
  dasha:   (input: DashaRequest) => post('/dasha', input, DashaResponseSchema),
  transits:(input: TransitRequest) => post('/transits', input, TransitResponseSchema),
  panchang:(input: PanchangRequest) => post('/panchang', input, PanchangSchema),
};
```

`post()` signs the HMAC header, validates the response with Zod, throws on failure.

## Acceptance criteria

- [ ] `pytest -q` passes with zero warnings. Every golden-test assertion green.
- [ ] `ruff check` + `mypy --strict app` pass.
- [ ] Hitting `POST /profile` with the fixture birth details returns a response that round-trips through `ChartSnapshotSchema` on the web side.
- [ ] `web/lib/astro/client.ts` methods return fully typed responses; `pnpm typecheck` passes.
- [ ] Engine rejects requests without `X-Astro-Secret` with 401.
- [ ] `/profile` responds in < 600ms p95 on a local run.

## Out of scope

- Additional chart keys beyond the supported catalog listed above.
- Storing anything in Supabase (phase 02 does that).
- Any UI rendering (phase 04).
- Advanced strength systems (Shadbala, Ashtakavarga) — post-MVP.

## Verification

1. `cd astro-engine && pytest -q` — all tests pass.
2. `uvicorn app.main:app --reload`, then from `web/`: run a throwaway script that calls `astro.profile(...)` with the fixture data and pretty-prints the result. Eyeball against golden JSON.
3. Run the Panipat 1995-06-07 23:54 chart and compare 5 key values against JHora output. Any mismatch = stop, fix calculation.

## After completing

- Run `graphify update .`.
- Flip status to Done in [README.md](README.md).
