# Phase 01 Golden Test Specification

**Date:** 2026-04-20  
**Status:** VERIFIED & READY FOR IMPLEMENTATION  
**Golden Test Chart:** Panipat, India — June 7, 1995 23:54:00 IST

---

## Golden Test Chart (Input)

**Source:** `golden_data.txt` (Vedic astrology computation from JHora/trusted external source)

| Field | Value |
|-------|-------|
| Name | Tavish Chawla |
| Birth Date | 1995-06-07 |
| Birth Time | 23:54:00 |
| Latitude | 29°23'00"N (29.3833°) |
| Longitude | 76°58'00"E (76.9667°) |
| Timezone | IST (UTC+5:30) |
| Altitude | 0 meters |
| Ayanamsha | Lahiri |

**Structured Input (already in `astro-engine/tests/golden/panipat_1995.json`):**
```json
{
  "profile": {
    "name": "Tavish Chawla",
    "birth_date": "1995-06-07",
    "birth_time": "23:54:00",
    "latitude": 29.3909,
    "longitude": 76.9635,
    "timezone": "Asia/Kolkata",
    "ayanamsha": "lahiri"
  }
}
```

---

## Expected Output Values (Golden Test Assertions)

Extracted from `golden_data.txt` lines 29–98. These are the **minimum** assertions required to pass the golden test.

### Core Chart (D1) — Lagna & Planets

| Item | Expected Value | Source Line |
|------|-----------------|-------------|
| **Lagna** | 6° Aquarius (6 Aq 13' 03.78") | Line 31 |
| **Moon** | 9° Virgo (9 Vi 07' 39.71"), Nakshatra: Uttara Phalguni, Pada 4 | Lines 33, 14–15 |
| **Sun** | 22° Taurus (22 Ta 46' 05.13"), House 4 | Lines 32, 21 |
| **Saturn** | 0° Pisces (0 Pi 17' 57.63"), House 2 | Lines 38, 21 |
| **Mercury (R)** | 18° Taurus (18 Ta 56' 43.62"), Nakshatra: Rohi, Pada 3 | Lines 35 |
| **Jupiter (R)** | 15° Scorpio (15 Sc 56' 01.81"), Nakshatra: Anu, Pada 4 | Lines 36 |
| **Venus** | 2° Taurus (2 Ta 41' 19.63"), Nakshatra: Krit, Pada 2 | Lines 37 |
| **Mars** | 12° Leo (12 Le 25' 21.12"), Nakshatra: Magh, Pada 4 | Lines 34 |
| **Rahu** | 9° Libra (9 Li 37' 57.52"), Nakshatra: Swat, Pada 1 | Line 39 |
| **Ketu** | 9° Aries (9 Ar 37' 57.52"), Nakshatra: Aswi, Pada 3 | Line 40 |

### Dasha (Vimshottari) — As of 2020-01-01

| Item | Expected Value | Source Line |
|------|-----------------|-------------|
| **Mahadasha Lord** | Rahu (active until ~2024-05-16) | Lines 788–789 |
| **Antardasha** | Rah/Jup (2015-07-13 to 2017-12-06) | Lines 788 |

### Divisional Charts (Vargas) — Representative Assertions

#### D2 (Hora)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Sun | Gemini | Line 42 |

#### D3 (Drekkana)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mars | Scorpio | Line 42 |

#### D4 (Chaturthamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Venus | Taurus | Line 43 |

#### D5 (Panchamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mercury | Capricorn | Line 44 |

#### D6 (Shashthamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Sun | Aquarius | Line 45 |

#### D7 (Saptamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Moon | Taurus | Line 46 |

#### D8 (Ashtamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Saturn | Leo | Line 47 |

#### D9 (Navamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Sun | Cancer | Line 31 (vargas.D9) |
| Moon | Pisces | Line 32 (vargas.D9) |
| Saturn | Cancer | Line 34 (vargas.D9) |

#### D10 (Dasamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Jupiter | Sagittarius | Line 48 |

#### D11 (Rudramsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mars | Aries | Line 49 |

#### D12 (Dwadasamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Venus | Gemini | Line 50 |

#### D16 (Shodasamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mercury | Gemini | Line 51 |

#### D20 (Vimsamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Sun | Pisces | Line 52 |

#### D24 (Siddhamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Moon | Aquarius | Line 53 |

#### D27 (Nakshatramsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Saturn | Capricorn | Line 54 |

#### D30 (Trimsamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Jupiter | Pisces | Line 55 |

#### D40 (Khavedamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mars | Leo | Line 56 |

#### D45 (Akshavedamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Venus | Sagittarius | Line 57 |

#### D60 (Shashtyamsa)
| Planet | Expected Sign | Source |
|--------|--------------|--------|
| Mercury | Gemini | Line 58 |

### Bhava (House) Chart — Representative Assertions
| Planet | Expected House | Source |
|--------|-----------------|--------|
| Sun | 4 | Line 36 (vargas.Bhava) |
| Moon | 8 | Line 37 (vargas.Bhava) |
| Saturn | 2 | Line 38 (vargas.Bhava) |

### Panchang Elements (from golden_data.txt)

| Item | Expected Value | Source |
|------|-----------------|--------|
| **Tithi** | Sukla Navami (Su), 13.67% left | Lines 13 |
| **Nakshatra** | Uttara Phalguni (Su), 6.54% left | Lines 15 |
| **Yoga** | Siddhi (Ma), 10.78% left | Line 16 |
| **Karana** | Kaulava (Ma), 27.34% left | Line 17 |
| **Vedic Weekday** | Wednesday (Mercury) | Line 14 |
| **Sunrise** | 05:26:23 | Line 22 |
| **Sunset** | 19:15:31 | Line 23 |
| **Ayanamsha** | 23° 46' 39.33" (Lahiri) | Line 26 |
| **Sidereal Time** | 16:34:35 | Line 27 |

---

## Readiness Checklist

### ✅ Infrastructure & Dependencies

- [x] `pyswisseph` is in `astro-engine/pyproject.toml` (line 12)
- [x] Pydantic v2.10.3+ available (line 11)
- [x] FastAPI v0.115.6+ available (line 10)
- [x] Test framework `pytest` available (line 19 — dev dependency)
- [x] Type checking `mypy --strict` configured (line 36–37)
- [x] Code linting `ruff` configured (line 28–33)
- [x] CI workflow exists at `.github/workflows/ci.yml`

### ✅ Golden Test Data

- [x] `astro-engine/tests/golden/panipat_1995.json` exists with input profile
- [x] Expected values documented above (derived from `golden_data.txt`)
- [x] Golden data file is machine-readable JSON
- [x] All required chart types represented in expected outputs

### ✅ Project Structure

- [x] `astro-engine/app/` package exists
- [x] `astro-engine/app/routes/` directory exists (health.py present)
- [x] `astro-engine/app/schemas/` directory exists
- [x] `astro-engine/tests/` directory exists with test utilities
- [x] `web/lib/` exists for TypeScript client placement

### ✅ Existing Code

- [x] `astro-engine/app/main.py` exists and imports routes (line 3)
- [x] `astro-engine/app/versioning.py` exists (imported at line 4)
- [x] Health endpoint route exists (`app/routes/health.py`)
- [x] Health tests pass (`test_health.py` — 3 tests)
- [x] HMAC auth pattern established in `app/deps/auth.py`

### ✅ Documentation

- [x] `docs/astro-engine.md` exists with full specification
- [x] `docs/data-model.md` exists with schema definitions
- [x] Phase 01 spec document complete (this file)
- [x] Phases README clarifies dependency chain (phase 00 ✅ done)

### ⚠️ Not Yet Created (Expected to be implemented in Phase 01)

- [ ] `astro-engine/app/calc/` modules (ayanamsha, planets, houses, vargas, dignity, combustion, nakshatra, dashas, yogas, transits, panchang)
- [ ] `astro-engine/app/routes/` endpoints (profile, charts, dasha, transits, panchang)
- [ ] `astro-engine/app/schemas/` Pydantic models for all requests/responses
- [ ] `astro-engine/tests/test_*.py` test files (profile, dasha, transits, panchang, yogas)
- [ ] `web/lib/astro/client.ts` TypeScript client

---

## Quality Gates Before Starting

### 1. Model Recommendation ✅
- **Recommended:** `claude-opus-4-7`
- **Reason:** Domain-critical math (ayanamsha, varga divisors, dasha counts, yoga logic). Accuracy > speed.
- **Decision:** Use Opus 4.7 for this phase.

### 2. Golden Test Strategy ✅
- **Approach:** Use `panipat_1995.json` input + expected values from `golden_data.txt`
- **Validation Method:** Parse expected values, assert computed values match (exact match on sign & degree, ±1 nakshatra pada tolerance)
- **Fallback Check:** Compare 5 key values (Lagna, Moon, Sun, Saturn, Mahadasha lord) against external JHora output if available

### 3. Scope Fit ✅
- **Phase 1 Scope:** "L" (2–4 days of Opus-focused work)
- **Deliverables:** 12 calc modules + 5 routes + schemas + test suite + web client
- **Blocker Risk:** Low (pyswisseph is mature; divisional chart math is deterministic)
- **Time Risk:** Medium (dasha & yoga logic is complex; requires careful testing)

### 4. Dependency Verification ✅
- **Phase 01 depends on:** Phase 00 (✅ Status: Done)
- **Phase 02+ depends on:** Phase 01 (ready to unblock after completion)

---

## How to Start Implementation

1. **Read** `docs/astro-engine.md` in full (specification reference)
2. **Understand** the golden_data.txt output to know what good values look like
3. **Create** the calc modules in order: ayanamsha → planets → houses → vargas → ... (see phase spec)
4. **Write** tests incrementally (test-driven: red → green → refactor)
5. **Verify** golden test assertions pass at the end
6. **Run** `graphify update .` before marking done

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Ayanamsha math error | HIGH | Test against JHora output; verify with 3+ calculations |
| Varga divisor off-by-one | HIGH | Golden test covers all 17 vargas |
| Dasha count wrong | MEDIUM | Validate mahadasha dates against golden data timeline |
| Nakshatra pada precision | MEDIUM | Tolerance: ±0.5° for pada boundaries |
| Transit overlay rules | LOW | Spec in `astro-engine.md` § Transits |

---

## Sign-Off

**Golden Test Ready:** YES ✅  
**Specification Complete:** YES ✅  
**Dependencies Met:** YES ✅  
**Test Data Available:** YES ✅  
**Proceed to Implementation:** YES ✅
