from __future__ import annotations

import pytest

from app.calc.vargas import SUPPORTED_CHART_KEYS, VARGA_REGISTRY, varga_sign


def test_d1_is_sign_directly() -> None:
    assert varga_sign("D1", 0.0) == "Aries"
    assert varga_sign("D1", 359.9) == "Pisces"
    assert varga_sign("D1", 120.0) == "Leo"


def test_d9_movable_starts_same_sign() -> None:
    # Aries 0°–3°20' navamsa → Aries
    assert varga_sign("D9", 0.1) == "Aries"
    # Aries 3°20'–6°40' → Taurus
    assert varga_sign("D9", 4.0) == "Taurus"


def test_d9_fixed_starts_ninth() -> None:
    # Taurus is fixed → Navamsa starts from Capricorn.
    assert varga_sign("D9", 30.1) == "Capricorn"


def test_d9_dual_starts_fifth() -> None:
    # Gemini (dual) → Navamsa starts from Libra.
    assert varga_sign("D9", 60.1) == "Libra"


@pytest.mark.parametrize("key", list(SUPPORTED_CHART_KEYS))
def test_every_chart_key_has_handler(key: str) -> None:
    if key in ("D1", "Bhava", "Moon"):
        return
    assert key in VARGA_REGISTRY


def test_d60_is_sign_plus_segment() -> None:
    # D60: 0.5° each segment, parivritti style; at 0° → Aries.
    assert varga_sign("D60", 0.0) == "Aries"
    # 0.5° → Taurus (second 30" of Aries maps forward one sign)
    assert varga_sign("D60", 0.5) == "Taurus"


def test_d30_odd_sign_mars_segment() -> None:
    # Aries 0–5° → Mars's sign = Aries
    assert varga_sign("D30", 2.0) == "Aries"
    # Aries 5–10° → Saturn's sign = Aquarius
    assert varga_sign("D30", 7.0) == "Aquarius"
