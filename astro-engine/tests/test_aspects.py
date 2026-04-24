from __future__ import annotations

from datetime import UTC, datetime

from app.calc.chart_snapshot import BirthInput, build_snapshot


def _snapshot() -> dict[str, object]:
    return build_snapshot(
        BirthInput(
            birth_date="1995-06-07",
            birth_time="23:54:00",
            timezone="Asia/Kolkata",
            latitude=29.3909,
            longitude=76.9635,
            ayanamsha="lahiri",
        ),
        as_of=datetime(2020, 1, 1, tzinfo=UTC),
    )


def test_snapshot_includes_planetary_aspects_and_graha_drishti() -> None:
    snapshot = _snapshot()
    aspects = snapshot["aspects"]

    assert any(
        aspect["from"] == "Sun" and aspect["to"] == "Mercury" and aspect["kind"] == "conjunction"
        for aspect in aspects
    )
    assert any(
        aspect["from"] == "Saturn" and aspect["to"] == 4 and aspect["kind"] == "graha_drishti"
        for aspect in aspects
    )
    assert any(
        aspect["from"] == "Saturn" and aspect["to"] == "Sun" and aspect["kind"] == "graha_drishti"
        for aspect in aspects
    )
