from __future__ import annotations

from dataclasses import dataclass

import swisseph as swe

from . import ayanamsha
from .constants import SIGN_LORDS, SIGNS, Planet


@dataclass
class Ascendant:
    longitude_deg: float
    sign: str
    sign_index: int
    degree_in_sign: float


def compute_ascendant(
    jd_ut: float,
    latitude: float,
    longitude: float,
    ayan: str = "lahiri",
) -> Ascendant:
    ayanamsha.apply(ayan)
    ayan_value = swe.get_ayanamsa_ut(jd_ut)
    # Use Placidus just to pull ascmc[0] (ascendant); sidereal conversion done manually.
    _, ascmc = swe.houses_ex(
        jd_ut, latitude, longitude, b"P", swe.FLG_SWIEPH
    )
    tropical_asc = float(ascmc[0])
    sidereal_asc = (tropical_asc - ayan_value) % 360.0
    idx = int(sidereal_asc // 30) % 12
    return Ascendant(
        longitude_deg=sidereal_asc,
        sign=SIGNS[idx],
        sign_index=idx,
        degree_in_sign=sidereal_asc - idx * 30.0,
    )


@dataclass
class HousePlacement:
    house: int
    sign: str
    lord: Planet


def whole_sign_houses(asc_sign_index: int) -> list[HousePlacement]:
    out: list[HousePlacement] = []
    for i in range(12):
        sign = SIGNS[(asc_sign_index + i) % 12]
        out.append(HousePlacement(house=i + 1, sign=sign, lord=SIGN_LORDS[sign]))
    return out


def house_of_sign(sign_index: int, asc_sign_index: int) -> int:
    return ((sign_index - asc_sign_index) % 12) + 1
