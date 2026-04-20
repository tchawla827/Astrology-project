from __future__ import annotations

from .constants import COMBUSTION_ORBS, Planet


def is_combust(planet: Planet, planet_longitude: float, sun_longitude: float) -> bool:
    if planet == "Sun":
        return False
    orb = COMBUSTION_ORBS.get(planet)
    if orb is None:
        return False
    diff = abs((planet_longitude - sun_longitude + 180.0) % 360.0 - 180.0)
    return diff <= orb
