from __future__ import annotations

from typing import Literal

from .constants import (
    DEBILITATION_SIGN,
    ENEMIES,
    EXALTATION_SIGN,
    FRIENDS,
    MOOLATRIKONA_RANGES,
    OWN_SIGNS,
    SIGN_LORDS,
    Planet,
)

Dignity = Literal["exalted", "moolatrikona", "own", "friendly", "neutral", "enemy", "debilitated"]


def dignity_for(planet: Planet, sign: str, longitude_deg: float | None = None) -> Dignity:
    if longitude_deg is not None:
        range_spec = MOOLATRIKONA_RANGES.get(planet)
        if range_spec is not None:
            range_sign, start_deg, end_deg = range_spec
            degree_in_sign = longitude_deg % 30.0
            if sign == range_sign and start_deg <= degree_in_sign < end_deg:
                return "moolatrikona"
    if EXALTATION_SIGN.get(planet) == sign:
        return "exalted"
    if DEBILITATION_SIGN.get(planet) == sign:
        return "debilitated"
    if sign in OWN_SIGNS.get(planet, ()):
        return "own"
    if planet in ("Rahu", "Ketu"):
        return "neutral"
    sign_lord = SIGN_LORDS[sign]
    if sign_lord == planet:
        return "own"
    if sign_lord in FRIENDS.get(planet, frozenset()):
        return "friendly"
    if sign_lord in ENEMIES.get(planet, frozenset()):
        return "enemy"
    return "neutral"
