from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .constants import DEBILITATION_SIGN, SIGN_LORDS, Planet

KENDRA_HOUSES = {1, 4, 7, 10}
TRIKONA_HOUSES = {1, 5, 9}
DHANA_HOUSES = {2, 5, 9, 11}


@dataclass
class Yoga:
    name: str
    confidence: Literal["low", "medium", "high"]
    source_charts: list[str]
    planets_involved: list[Planet]
    notes: list[str]


def _sign_of_house(house: int, asc_sign_index: int) -> str:
    from .constants import SIGNS

    return SIGNS[(asc_sign_index + house - 1) % 12]


def _house_of_planet(planet_house: dict[Planet, int], planet: Planet) -> int | None:
    return planet_house.get(planet)


def detect_raja_yoga(
    planet_house: dict[Planet, int],
    asc_sign_index: int,
) -> list[Yoga]:
    kendra_lords = {SIGN_LORDS[_sign_of_house(h, asc_sign_index)] for h in KENDRA_HOUSES}
    trikona_lords = {SIGN_LORDS[_sign_of_house(h, asc_sign_index)] for h in TRIKONA_HOUSES}
    out: list[Yoga] = []
    for k in kendra_lords:
        for t in trikona_lords:
            if k == t:
                continue
            hk = planet_house.get(k)
            ht = planet_house.get(t)
            if hk is not None and ht is not None and hk == ht:
                out.append(
                    Yoga(
                        name="Raja Yoga",
                        confidence="medium",
                        source_charts=["D1"],
                        planets_involved=sorted([k, t]),
                        notes=[f"Kendra lord {k} conjunct trikona lord {t} in house {hk}"],
                    )
                )
    return out


def detect_dhana_yoga(
    planet_house: dict[Planet, int],
    asc_sign_index: int,
) -> list[Yoga]:
    lords = [SIGN_LORDS[_sign_of_house(h, asc_sign_index)] for h in DHANA_HOUSES]
    out: list[Yoga] = []
    seen: set[tuple[Planet, Planet, int]] = set()
    for i, a in enumerate(lords):
        for b in lords[i + 1 :]:
            if a == b:
                continue
            ha = planet_house.get(a)
            hb = planet_house.get(b)
            if ha is not None and ha == hb:
                key = (min(a, b), max(a, b), ha)
                if key in seen:
                    continue
                seen.add(key)
                out.append(
                    Yoga(
                        name="Dhana Yoga",
                        confidence="medium",
                        source_charts=["D1"],
                        planets_involved=sorted([a, b]),
                        notes=[f"Dhana lords {a} & {b} conjunct in house {ha}"],
                    )
                )
    return out


def detect_kemadruma(planet_house: dict[Planet, int]) -> list[Yoga]:
    moon_house = planet_house.get("Moon")
    if moon_house is None:
        return []
    h2 = (moon_house % 12) + 1
    h12 = ((moon_house - 2) % 12) + 1
    occupied_others = {
        planet
        for planet, house in planet_house.items()
        if planet not in {"Moon", "Sun", "Rahu", "Ketu"} and house in (h2, h12)
    }
    if not occupied_others:
        return [
            Yoga(
                name="Kemadruma",
                confidence="high",
                source_charts=["D1"],
                planets_involved=["Moon"],
                notes=["No planets in 2nd or 12th from Moon"],
            )
        ]
    return []


def detect_gajakesari(planet_house: dict[Planet, int]) -> list[Yoga]:
    mh = planet_house.get("Moon")
    jh = planet_house.get("Jupiter")
    if mh is None or jh is None:
        return []
    diff = abs(mh - jh)
    diff = min(diff, 12 - diff)
    if diff in (0, 3, 6, 9):
        return [
            Yoga(
                name="Gajakesari",
                confidence="high",
                source_charts=["D1"],
                planets_involved=["Jupiter", "Moon"],
                notes=[f"Moon in house {mh}, Jupiter in house {jh} (kendra relation)"],
            )
        ]
    return []


def detect_neechabhanga(
    planet_sign: dict[Planet, str],
    planet_house: dict[Planet, int],
    asc_sign_index: int,
) -> list[Yoga]:
    out: list[Yoga] = []
    for planet, sign in planet_sign.items():
        if planet in ("Rahu", "Ketu"):
            continue
        if DEBILITATION_SIGN.get(planet) != sign:
            continue
        debil_lord = SIGN_LORDS[sign]
        from .constants import EXALTATION_SIGN

        exalt_sign = EXALTATION_SIGN.get(planet)
        exalt_lord = SIGN_LORDS[exalt_sign] if exalt_sign else None
        candidates: set[Planet] = set()
        if debil_lord is not None:
            candidates.add(debil_lord)
        if exalt_lord is not None:
            candidates.add(exalt_lord)
        for c in candidates:
            house = planet_house.get(c)
            if house in KENDRA_HOUSES:
                out.append(
                    Yoga(
                        name="Neechabhanga Raja Yoga",
                        confidence="medium",
                        source_charts=["D1"],
                        planets_involved=sorted([planet, c]),
                        notes=[
                            f"{planet} debilitated in {sign}; "
                            f"cancelled by {c} in kendra {house}"
                        ],
                    )
                )
                break
    return out


def detect_all(
    planet_sign: dict[Planet, str],
    planet_house: dict[Planet, int],
    asc_sign_index: int,
) -> list[Yoga]:
    yogas: list[Yoga] = []
    yogas.extend(detect_raja_yoga(planet_house, asc_sign_index))
    yogas.extend(detect_dhana_yoga(planet_house, asc_sign_index))
    yogas.extend(detect_kemadruma(planet_house))
    yogas.extend(detect_gajakesari(planet_house))
    yogas.extend(detect_neechabhanga(planet_sign, planet_house, asc_sign_index))
    return yogas
