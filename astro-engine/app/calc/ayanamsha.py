from __future__ import annotations

from typing import Literal

import swisseph as swe

Ayanamsha = Literal["lahiri", "raman", "kp"]

_AYANAMSHA_MAP: dict[str, int] = {
    "lahiri": swe.SIDM_LAHIRI,
    "raman": swe.SIDM_RAMAN,
    "kp": swe.SIDM_KRISHNAMURTI,
}


def sidmode_for(name: str) -> int:
    try:
        return _AYANAMSHA_MAP[name.lower()]
    except KeyError as exc:
        raise ValueError(f"Unknown ayanamsha: {name}") from exc


def apply(name: str) -> None:
    swe.set_sid_mode(sidmode_for(name), 0, 0)


def value(jd_ut: float, name: str = "lahiri") -> float:
    apply(name)
    return swe.get_ayanamsa_ut(jd_ut)
