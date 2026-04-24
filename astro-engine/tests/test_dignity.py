from __future__ import annotations

from app.calc.dignity import dignity_for


def test_sun_in_early_leo_is_moolatrikona() -> None:
    assert dignity_for("Sun", "Leo", 125.0) == "moolatrikona"


def test_sun_in_late_leo_falls_back_to_own_sign() -> None:
    assert dignity_for("Sun", "Leo", 145.0) == "own"


def test_mercury_virgo_range_distinguishes_moolatrikona_from_exaltation() -> None:
    assert dignity_for("Mercury", "Virgo", 166.0) == "moolatrikona"
    assert dignity_for("Mercury", "Virgo", 160.0) == "exalted"
