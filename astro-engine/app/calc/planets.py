from __future__ import annotations

from dataclasses import dataclass

import swisseph as swe

from . import ayanamsha
from .constants import PLANETS, SIGNS, Planet

_SWE_IDS: dict[Planet, int] = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
}

_SIDEREAL_FLAGS = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED


@dataclass
class PlanetPosition:
    planet: Planet
    longitude_deg: float
    latitude_deg: float
    speed_deg_per_day: float
    retrograde: bool

    @property
    def sign(self) -> str:
        return SIGNS[int(self.longitude_deg // 30) % 12]

    @property
    def sign_index(self) -> int:
        return int(self.longitude_deg // 30) % 12

    @property
    def degree_in_sign(self) -> float:
        return self.longitude_deg - self.sign_index * 30.0


def _calc(jd_ut: float, body: int, flags: int) -> tuple[float, float, float]:
    xx, _ = swe.calc_ut(jd_ut, body, flags)
    return float(xx[0]), float(xx[1]), float(xx[3])


def compute_positions(jd_ut: float, ayan: str = "lahiri") -> dict[Planet, PlanetPosition]:
    ayanamsha.apply(ayan)
    out: dict[Planet, PlanetPosition] = {}
    for planet in PLANETS:
        if planet == "Rahu":
            lon, lat, speed = _calc(jd_ut, swe.MEAN_NODE, _SIDEREAL_FLAGS)
        elif planet == "Ketu":
            rahu_lon, _, rahu_speed = _calc(jd_ut, swe.MEAN_NODE, _SIDEREAL_FLAGS)
            lon = (rahu_lon + 180.0) % 360.0
            lat = 0.0
            speed = rahu_speed
        else:
            lon, lat, speed = _calc(jd_ut, _SWE_IDS[planet], _SIDEREAL_FLAGS)
        out[planet] = PlanetPosition(
            planet=planet,
            longitude_deg=lon % 360.0,
            latitude_deg=lat,
            speed_deg_per_day=speed,
            retrograde=speed < 0,
        )
    return out


def compute_tropical(jd_ut: float, planet: Planet) -> float:
    flags = swe.FLG_SWIEPH | swe.FLG_SPEED
    if planet == "Rahu":
        lon, _, _ = _calc(jd_ut, swe.MEAN_NODE, flags)
    elif planet == "Ketu":
        lon, _, _ = _calc(jd_ut, swe.MEAN_NODE, flags)
        lon = (lon + 180.0) % 360.0
    else:
        lon, _, _ = _calc(jd_ut, _SWE_IDS[planet], flags)
    return lon % 360.0
