from __future__ import annotations

from .constants import NAKSHATRA_LORDS, NAKSHATRAS, Planet

NAKSHATRA_ARC = 360.0 / 27.0
PADA_ARC = NAKSHATRA_ARC / 4.0


def nakshatra_index(longitude_deg: float) -> int:
    lon = longitude_deg % 360.0
    return int(lon // NAKSHATRA_ARC)


def nakshatra_name(longitude_deg: float) -> str:
    return NAKSHATRAS[nakshatra_index(longitude_deg)]


def nakshatra_lord(longitude_deg: float) -> Planet:
    return NAKSHATRA_LORDS[nakshatra_index(longitude_deg)]


def pada(longitude_deg: float) -> int:
    lon = longitude_deg % 360.0
    offset_in_nak = lon - (lon // NAKSHATRA_ARC) * NAKSHATRA_ARC
    return int(offset_in_nak // PADA_ARC) + 1


def nakshatra_progress(longitude_deg: float) -> float:
    """Return fraction of current nakshatra traversed [0, 1)."""
    lon = longitude_deg % 360.0
    offset = lon - (lon // NAKSHATRA_ARC) * NAKSHATRA_ARC
    return offset / NAKSHATRA_ARC
