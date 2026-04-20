from __future__ import annotations

from typing import Literal

from .constants import (
    DEBILITATION_SIGN,
    ENEMIES,
    EXALTATION_SIGN,
    FRIENDS,
    OWN_SIGNS,
    SIGN_LORDS,
    Planet,
)

Dignity = Literal["exalted", "own", "friendly", "neutral", "enemy", "debilitated"]


def dignity_for(planet: Planet, sign: str) -> Dignity:
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
