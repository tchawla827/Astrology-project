from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from .constants import VIMSHOTTARI_ORDER, VIMSHOTTARI_YEARS, Planet
from .nakshatra import nakshatra_lord, nakshatra_progress

TROPICAL_YEAR_DAYS = 365.2422  # Vedic convention for dasha year length


@dataclass
class DashaPeriod:
    level: Literal["mahadasha", "antardasha", "pratyantardasha"]
    lord: Planet
    start: datetime
    end: datetime


def _add_years(start: datetime, years: float) -> datetime:
    return start + timedelta(days=years * TROPICAL_YEAR_DAYS)


def balance_at_birth(moon_longitude_deg: float) -> tuple[Planet, float]:
    """Return (starting_maha_lord, remaining_years) at birth."""
    lord = nakshatra_lord(moon_longitude_deg)
    progress = nakshatra_progress(moon_longitude_deg)
    total = VIMSHOTTARI_YEARS[lord]
    remaining = total * (1.0 - progress)
    return lord, remaining


def mahadasha_sequence(
    moon_longitude_deg: float,
    birth_dt_utc: datetime,
    until: datetime,
) -> list[DashaPeriod]:
    if birth_dt_utc.tzinfo is None:
        raise ValueError("birth_dt_utc must be tz-aware")
    first_lord, remaining = balance_at_birth(moon_longitude_deg)
    idx = VIMSHOTTARI_ORDER.index(first_lord)
    periods: list[DashaPeriod] = []
    start = birth_dt_utc
    end = _add_years(start, remaining)
    periods.append(DashaPeriod("mahadasha", first_lord, start, end))
    start = end
    while start < until:
        idx = (idx + 1) % len(VIMSHOTTARI_ORDER)
        lord = VIMSHOTTARI_ORDER[idx]
        end = _add_years(start, VIMSHOTTARI_YEARS[lord])
        periods.append(DashaPeriod("mahadasha", lord, start, end))
        start = end
    return periods


def antardasha_sequence(maha: DashaPeriod) -> list[DashaPeriod]:
    total_years = VIMSHOTTARI_YEARS[maha.lord]
    start_idx = VIMSHOTTARI_ORDER.index(maha.lord)
    cursor = maha.start
    out: list[DashaPeriod] = []
    for i in range(len(VIMSHOTTARI_ORDER)):
        lord = VIMSHOTTARI_ORDER[(start_idx + i) % len(VIMSHOTTARI_ORDER)]
        years = total_years * VIMSHOTTARI_YEARS[lord] / 120.0
        end = _add_years(cursor, years)
        out.append(DashaPeriod("antardasha", lord, cursor, end))
        cursor = end
    return out


def pratyantardasha_sequence(antar: DashaPeriod, maha_lord: Planet) -> list[DashaPeriod]:
    maha_years = VIMSHOTTARI_YEARS[maha_lord]
    antar_years = VIMSHOTTARI_YEARS[antar.lord]
    antar_total = maha_years * antar_years / 120.0
    start_idx = VIMSHOTTARI_ORDER.index(antar.lord)
    cursor = antar.start
    out: list[DashaPeriod] = []
    for i in range(len(VIMSHOTTARI_ORDER)):
        lord = VIMSHOTTARI_ORDER[(start_idx + i) % len(VIMSHOTTARI_ORDER)]
        years = antar_total * VIMSHOTTARI_YEARS[lord] / 120.0
        end = _add_years(cursor, years)
        out.append(DashaPeriod("pratyantardasha", lord, cursor, end))
        cursor = end
    return out


def active_period(periods: list[DashaPeriod], at: datetime) -> DashaPeriod | None:
    for period in periods:
        if period.start <= at < period.end:
            return period
    return None


def active_maha_and_antar(
    moon_longitude_deg: float, birth_dt_utc: datetime, at: datetime
) -> tuple[DashaPeriod, DashaPeriod]:
    mahas = mahadasha_sequence(moon_longitude_deg, birth_dt_utc, at + timedelta(days=400 * 365))
    maha = active_period(mahas, at)
    if maha is None:
        raise ValueError("No active mahadasha for requested datetime")
    antars = antardasha_sequence(maha)
    antar = active_period(antars, at) or antars[0]
    return maha, antar
