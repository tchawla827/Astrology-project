# Astrology Engine

Python FastAPI microservice that computes everything astrological. Stateless. No DB. The single source of astrological truth.

## Library choice

- **`pyswisseph`** — Python binding for Swiss Ephemeris. Gold standard for accuracy. Ships as a pip package; ephemeris files are downloaded and stored under `astro-engine/ephe/`.
- **`pydantic`** for request/response models.
- **`pytz` / `zoneinfo`** for timezone handling.

No other astrology library. If a calculation is missing, add it to `calc/` — do not introduce a second dependency.

## Defaults

| Setting | Default |
|---|---|
| Ayanamsha | Lahiri (`swisseph.SIDM_LAHIRI`) |
| House system | Whole sign (Vedic standard). Optional: Placidus for non-Vedic users later. |
| Node | Mean node (Rahu/Ketu). True node toggleable later. |
| Epoch | Apparent positions with aberration + nutation applied. |

## Security

Every request must include header `X-Astro-Secret: <shared HMAC>`. Engine rejects unsigned requests with 401. See [architecture.md](architecture.md) § Environment variables.

## Endpoints

All requests are POST with JSON body.

### `POST /profile`

Generate a full `ChartSnapshot` from birth details.

**Request**

```json
{
  "birth_date": "1995-06-07",
  "birth_time": "23:54:00",
  "timezone": "Asia/Kolkata",
  "latitude": 29.3909,
  "longitude": 76.9635,
  "ayanamsha": "lahiri",
    "include_charts": [
      "D1", "Bhava", "Moon",
      "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12",
      "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60"
    ]
}
```

**Response** — matches `ChartSnapshot.payload` in [data-model.md](data-model.md):

```json
{
  "engine_version": "astro_engine_v1",
  "summary": { "lagna": "...", "moon_sign": "...", "nakshatra": "...", "pada": 3 },
  "charts": {
    "D1": {...},
    "Bhava": {...},
    "Moon": {...},
    "D2": {...},
    "D3": {...},
    "D4": {...},
    "D5": {...},
    "D6": {...},
    "D7": {...},
    "D8": {...},
    "D9": {...},
    "D10": {...},
    "D11": {...},
    "D12": {...},
    "D16": {...},
    "D20": {...},
    "D24": {...},
    "D27": {...},
    "D30": {...},
    "D40": {...},
    "D45": {...},
    "D60": {...}
  },
  "planetary_positions": [...],
  "aspects": [...],
  "yogas": [...],
  "dasha": { "system": "vimshottari", "current_mahadasha": {...}, "current_antardasha": {...}, "upcoming": [...] },
  "transits": { "as_of": "2026-04-20T10:00:00Z", "positions": [...], "highlights": [...] }
}
```

Chart keys supported by the product:

- **Base views:** `D1`, `Bhava`, `Moon`.
- **Classical divisional charts:** `D2`, `D3`, `D4`, `D7`, `D9`, `D10`, `D12`, `D16`, `D20`, `D24`, `D27`, `D30`, `D40`, `D45`, `D60`.
- **Common extras:** `D5`, `D6`, `D8`, `D11`.

Every chart key must be accepted by `POST /charts/:key`. `/profile` should compute the full supported set unless `include_charts` narrows the response.

### `POST /charts/:key`

Compute one divisional chart on demand. Faster than recomputing everything.

**Request**

```json
{
  "birth_date": "...", "birth_time": "...", "timezone": "...",
  "latitude": ..., "longitude": ..., "ayanamsha": "lahiri"
}
```

**Response** — single `Chart` object.

### `POST /dasha`

Compute Vimshottari dasha periods.

**Request**

```json
{
  "birth_date": "...", "birth_time": "...", "timezone": "...",
  "latitude": ..., "longitude": ...,
  "ayanamsha": "lahiri",
  "depth": "antardasha",     // "mahadasha" | "antardasha" | "pratyantardasha"
  "from": "2020-01-01",      // optional
  "to": "2050-01-01"         // optional
}
```

**Response**

```json
{
  "system": "vimshottari",
  "periods": [
    { "level": "mahadasha", "lord": "Saturn", "start": "2018-...", "end": "2037-..." },
    { "level": "antardasha", "lord": "Mercury", "start": "...", "end": "..." }
  ]
}
```

### `POST /transits`

Planetary positions for any datetime, with optional overlay against a natal chart.

**Request**

```json
{
  "at": "2026-04-20T06:00:00Z",
  "latitude": 29.3909,
  "longitude": 76.9635,
  "natal": {                          // optional — if present, engine overlays transits on natal houses
    "lagna_sign": "Aries",
    "planetary_positions": [...]      // from the user's ChartSnapshot
  }
}
```

**Response**

```json
{
  "as_of": "2026-04-20T06:00:00Z",
  "positions": [ { "planet": "Sun", "longitude_deg": ..., "sign": "Aries", "retrograde": false } ],
  "highlights": [
    "Saturn over natal 10th house",
    "Jupiter aspecting natal Moon"
  ],
  "overlay": {
    "triggered_houses": [10, 7],
    "planet_to_house": { "Saturn": 10, "Jupiter": 4 }
  }
}
```

### `POST /panchang`

Daily panchang for any (date, lat, lon).

**Request**

```json
{ "date": "2026-04-20", "latitude": 29.3909, "longitude": 76.9635, "timezone": "Asia/Kolkata" }
```

**Response** — matches `Panchang` type in [data-model.md](data-model.md).

### `GET /health`

Returns `{ "status": "ok", "engine_version": "astro_engine_v1" }`. No auth required — used by deploy health checks.

## Calculation rules

### Ascendant (Lagna)

Use sidereal longitude of the ascendant at birth datetime, converted with ayanamsha. Round to the nearest degree only for display; store precise longitude internally.

### Planetary positions

- Compute geocentric apparent longitudes.
- Convert tropical to sidereal by subtracting ayanamsha.
- Retrograde flag from `swe_calc_ut` speed longitude < 0.
- Combustion: Sun within orbs (Moon 12°, Mars 17°, Mercury 14°, Jupiter 11°, Venus 10°, Saturn 15°).
- Dignity: exaltation/debilitation signs, moolatrikona, own sign, friend/enemy using standard Jyotish tables.
- Rahu/Ketu: mean node. Ketu is always exactly opposite Rahu.

### Chart catalog

Supported chart keys are grouped by product role:

| Group | Keys | Role |
|---|---|---|
| Base views | `D1`, `Bhava`, `Moon` | Primary chart reading, house-level reading, Chandra Lagna reading |
| Classical divisional charts | `D2`, `D3`, `D4`, `D7`, `D9`, `D10`, `D12`, `D16`, `D20`, `D24`, `D27`, `D30`, `D40`, `D45`, `D60` | Standard Vedic varga library |
| Common extras | `D5`, `D6`, `D8`, `D11` | Useful extended analysis charts |

Implementation rules:

- **D1 (Rashi):** sign placement as-is.
- **Bhava:** house-centered view derived from the selected house system. MVP uses whole-sign houses; if a future house system is added, Bhava is the chart that changes.
- **Moon chart:** D1 but rotated so Moon's sign becomes house 1.
- **D9 (Navamsa):** each 30° sign divided into 9 parts of 3°20'. Starting sign varies by movable/fixed/dual.
- All varga logic lives in `calc/vargas.py` behind a registry keyed by chart key. Do not scatter chart formulas across routes or UI code.
- `POST /charts/:key` returns `UNSUPPORTED_CHART` only for keys outside the supported catalog above.
- Golden tests use Panipat 1995-06-07 23:54 as a known chart.

### Yogas (phase 01 ships a minimal set)

MVP list — detect and return only these to keep noise low:
- Raja Yoga (quadrant lord + trine lord conjunct or aspecting)
- Dhana Yoga (2nd/5th/9th/11th lords interconnected)
- Kemadruma (Moon isolated — no planets in 2nd/12th from Moon)
- Gajakesari (Moon + Jupiter in quadrants from each other)
- Neechabhanga Raja Yoga (debilitated planet whose debilitation is cancelled)

Each yoga: `{ name, confidence, source_charts, notes }`. Document detection rule inline in `calc/yogas.py`.

### Vimshottari dasha

- Order: Ketu(7) → Venus(20) → Sun(6) → Moon(10) → Mars(7) → Rahu(18) → Jupiter(16) → Saturn(19) → Mercury(17).
- Start determined by Moon's nakshatra at birth.
- Balance of first dasha prorated by remaining nakshatra arc.
- Antardasha length = `(maha_length × antar_lord_years) / 120`.

### Transits

Compute planetary positions at the requested datetime. For `highlights`, apply these rules to natal overlay:
- Saturn over any natal kendra (1/4/7/10) → "Saturn pressure on kendra N".
- Jupiter over natal trine (1/5/9) → "Jupiter support on trine N".
- Rahu over natal Moon → "Rahu-Moon conjunction in transit".
- Any major malefic within 3° of a natal luminary → highlight as stress.

Phase 01 ships these four rules only. More rules go in `calc/transit_rules.py`.

## Error shapes

All errors return JSON:

```json
{ "error": { "code": "INVALID_INPUT", "message": "birth_time_confidence is required" } }
```

Error codes:

- `INVALID_INPUT` (400) — pydantic validation failure.
- `UNAUTHORIZED` (401) — missing or bad `X-Astro-Secret`.
- `COMPUTATION_ERROR` (500) — swisseph call failed. Includes `details.planet` or `details.calculation` when known.
- `UNSUPPORTED_CHART` (400) — chart key not implemented in current phase.

## Versioning

`engine_version` is a module constant in `astro-engine/app/versioning.py`. Bump when:
- A calculation rule changes in a way that would alter any stored `ChartSnapshot`.
- Chart keys are added/removed.
- Yoga detection rules change.

The web app stores the version on every `chart_snapshots` row. Recomputation is triggered lazily on profile view when versions mismatch.

## Testing

- `astro-engine/tests/golden/` holds fixture charts computed by independent sources (JHora or Parashara's Light exports) for several famous birth data. Every PR must pass these.
- At least one golden test per supported chart key. Golden coverage can be staged, but a chart key is not considered production-ready until it has an independent expected fixture.
- `pytest -q` must pass with no warnings in CI.
- No network calls in tests — ephemeris files are bundled.

## Performance targets

- `/profile` — < 600ms p95 on a small single-region deploy.
- `/transits` (no overlay) — < 150ms p95.
- `/panchang` — < 200ms p95.

If a target is missed, profile before adding cache — the bottleneck is usually redundant `swe_set_sid_mode` calls.
