from __future__ import annotations

from datetime import UTC, datetime

from app.calc.dashas import (
    active_maha_and_antar,
    antardasha_sequence,
    balance_at_birth,
    mahadasha_sequence,
)


def test_balance_at_birth_returns_nakshatra_lord() -> None:
    # Moon at 159.11° → Uttara Phalguni, ruled by Sun.
    lord, remaining = balance_at_birth(159.11)
    assert lord == "Sun"
    assert 0 < remaining < 6.0


def test_mahadasha_starts_with_balance_lord() -> None:
    birth = datetime(1995, 6, 7, 18, 24, tzinfo=UTC)
    periods = mahadasha_sequence(159.11, birth, datetime(2050, 1, 1, tzinfo=UTC))
    assert periods[0].lord == "Sun"
    # After Sun → Moon → Mars → Rahu → ...
    assert periods[1].lord == "Moon"
    assert periods[2].lord == "Mars"
    assert periods[3].lord == "Rahu"


def test_rahu_mahadasha_active_at_2020() -> None:
    birth = datetime(1995, 6, 7, 18, 24, tzinfo=UTC)
    at = datetime(2020, 1, 1, tzinfo=UTC)
    maha, antar = active_maha_and_antar(159.11, birth, at)
    assert maha.lord == "Rahu"
    assert maha.start.year == 2012
    # Antardasha at 2020-01-01 should be Saturn (per JHora golden timeline)
    assert antar.lord == "Saturn"


def test_antardasha_sequence_sums_to_mahadasha_length() -> None:
    birth = datetime(1995, 6, 7, 18, 24, tzinfo=UTC)
    mahas = mahadasha_sequence(159.11, birth, datetime(2050, 1, 1, tzinfo=UTC))
    rahu = next(m for m in mahas if m.lord == "Rahu")
    antars = antardasha_sequence(rahu)
    assert antars[0].lord == "Rahu"
    assert antars[-1].end == rahu.end
    assert antars[0].start == rahu.start
