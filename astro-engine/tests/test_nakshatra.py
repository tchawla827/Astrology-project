from __future__ import annotations

from app.calc.nakshatra import nakshatra_name, pada


def test_first_nakshatra_is_ashwini() -> None:
    assert nakshatra_name(0.0) == "Ashwini"
    assert pada(0.0) == 1


def test_uttara_phalguni_boundary() -> None:
    # Uttara Phalguni = index 11; spans 146.666°–160°.
    assert nakshatra_name(155.0) == "Uttara Phalguni"
    assert nakshatra_name(159.11) == "Uttara Phalguni"


def test_pada_progresses_through_nakshatra() -> None:
    # Uttara Phalguni pada boundaries inside nakshatra: 0°-3.33°, 3.33°-6.66°, 6.66°-10°, 10°-13.33°.
    # Nakshatra starts at 146.666°.
    assert pada(148.0) == 1
    assert pada(151.0) == 2
    assert pada(154.0) == 3
    assert pada(159.11) == 4


def test_last_nakshatra_revati() -> None:
    assert nakshatra_name(359.9) == "Revati"
    assert pada(359.9) == 4
