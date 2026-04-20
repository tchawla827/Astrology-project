from __future__ import annotations

import os
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import swisseph as swe

_EPHE_INITIALISED = False


def ephe_dir() -> Path:
    override = os.environ.get("ASTRO_ENGINE_EPHE_PATH")
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[2] / "ephe"


def init_ephemeris() -> None:
    global _EPHE_INITIALISED
    if _EPHE_INITIALISED:
        return
    path = ephe_dir()
    swe.set_ephe_path(str(path))
    _EPHE_INITIALISED = True


def julian_day(dt_utc: datetime) -> float:
    init_ephemeris()
    if dt_utc.tzinfo is None:
        raise ValueError("julian_day requires a timezone-aware datetime")
    utc = dt_utc.astimezone(UTC)
    hour = utc.hour + utc.minute / 60 + (utc.second + utc.microsecond / 1e6) / 3600
    return swe.julday(utc.year, utc.month, utc.day, hour)


def local_to_utc(date_str: str, time_str: str, tz_name: str) -> datetime:
    year, month, day = (int(p) for p in date_str.split("-"))
    hour, minute, second = (int(p) for p in time_str.split(":"))
    local = datetime(year, month, day, hour, minute, second, tzinfo=ZoneInfo(tz_name))
    return local.astimezone(UTC)


def jd_for(date_str: str, time_str: str, tz_name: str) -> float:
    return julian_day(local_to_utc(date_str, time_str, tz_name))
