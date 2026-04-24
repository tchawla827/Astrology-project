from __future__ import annotations

from typing import Any

from .constants import PLANETS, Planet
from .planets import PlanetPosition

_MAJOR_ASPECTS: tuple[tuple[str, float, float], ...] = (
    ("conjunction", 0.0, 8.0),
    ("square", 90.0, 7.0),
    ("trine", 120.0, 8.0),
    ("opposition", 180.0, 8.0),
)

_GRAHA_DRISHTI_OFFSETS: dict[Planet, tuple[int, ...]] = {
    "Sun": (7,),
    "Moon": (7,),
    "Mars": (4, 7, 8),
    "Mercury": (7,),
    "Jupiter": (5, 7, 9),
    "Venus": (7,),
    "Saturn": (3, 7, 10),
    "Rahu": (7,),
    "Ketu": (7,),
}

_KIND_ORDER = {
    "conjunction": 0,
    "opposition": 1,
    "trine": 2,
    "square": 3,
    "graha_drishti": 4,
}

_PLANET_ORDER = {planet: index for index, planet in enumerate(PLANETS)}


def _angular_distance(left: float, right: float) -> float:
    return abs((left - right + 180.0) % 360.0 - 180.0)


def _target_house(source_house: int, offset: int) -> int:
    return ((source_house + offset - 2) % 12) + 1


def _planetary_aspects(positions: dict[Planet, PlanetPosition]) -> list[dict[str, Any]]:
    aspects: list[dict[str, Any]] = []
    ordered = [positions[planet] for planet in PLANETS if planet in positions]

    for index, left in enumerate(ordered):
        for right in ordered[index + 1 :]:
            distance = _angular_distance(left.longitude_deg, right.longitude_deg)
            for kind, exact_distance, max_orb in _MAJOR_ASPECTS:
                orb = abs(distance - exact_distance)
                if orb > max_orb:
                    continue
                aspects.append(
                    {
                        "from": left.planet,
                        "to": right.planet,
                        "kind": kind,
                        "orb_deg": round(orb, 6),
                    }
                )
                break

    return aspects


def _graha_drishti_aspects(planet_house: dict[Planet, int]) -> list[dict[str, Any]]:
    aspects: list[dict[str, Any]] = []
    occupants_by_house: dict[int, list[Planet]] = {}

    for planet, house in planet_house.items():
        occupants_by_house.setdefault(house, []).append(planet)

    for planet in PLANETS:
        source_house = planet_house.get(planet)
        if source_house is None:
            continue
        for offset in _GRAHA_DRISHTI_OFFSETS[planet]:
            target_house = _target_house(source_house, offset)
            aspects.append({"from": planet, "to": target_house, "kind": "graha_drishti"})
            for target_planet in occupants_by_house.get(target_house, []):
                if target_planet == planet:
                    continue
                aspects.append({"from": planet, "to": target_planet, "kind": "graha_drishti"})

    return aspects


def _sort_key(aspect: dict[str, Any]) -> tuple[int, int, int, int, float]:
    target = aspect["to"]
    if isinstance(target, int):
        target_group = 0
        target_value = target
    else:
        target_group = 1
        target_value = _PLANET_ORDER[target]

    return (
        _PLANET_ORDER[aspect["from"]],
        _KIND_ORDER[aspect["kind"]],
        target_group,
        target_value,
        float(aspect.get("orb_deg", 999.0)),
    )


def build_aspects(
    positions: dict[Planet, PlanetPosition],
    planet_house: dict[Planet, int],
) -> list[dict[str, Any]]:
    seen: set[tuple[Planet, Planet | int, str]] = set()
    aspects: list[dict[str, Any]] = []

    for aspect in _planetary_aspects(positions) + _graha_drishti_aspects(planet_house):
        key = (aspect["from"], aspect["to"], aspect["kind"])
        if key in seen:
            continue
        seen.add(key)
        aspects.append(aspect)

    return sorted(aspects, key=_sort_key)
