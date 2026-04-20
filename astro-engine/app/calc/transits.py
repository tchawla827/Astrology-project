from __future__ import annotations

from dataclasses import dataclass

from .constants import Planet


@dataclass
class TransitHighlight:
    planet: Planet
    note: str
    house: int | None = None


def overlay(
    transit_house: dict[Planet, int],
    natal_planet_house: dict[Planet, int],
    natal_planet_longitude: dict[Planet, float] | None = None,
    transit_longitude: dict[Planet, float] | None = None,
) -> list[TransitHighlight]:
    highlights: list[TransitHighlight] = []
    saturn_h = transit_house.get("Saturn")
    if saturn_h in {1, 4, 7, 10}:
        highlights.append(
            TransitHighlight(
                planet="Saturn",
                note=f"Saturn pressure on kendra {saturn_h}",
                house=saturn_h,
            )
        )
    jup_h = transit_house.get("Jupiter")
    if jup_h in {1, 5, 9}:
        highlights.append(
            TransitHighlight(
                planet="Jupiter",
                note=f"Jupiter support on trine {jup_h}",
                house=jup_h,
            )
        )
    rahu_h = transit_house.get("Rahu")
    moon_h = natal_planet_house.get("Moon")
    if rahu_h is not None and moon_h is not None and rahu_h == moon_h:
        highlights.append(
            TransitHighlight(
                planet="Rahu",
                note="Rahu-Moon conjunction in transit",
                house=rahu_h,
            )
        )
    if natal_planet_longitude and transit_longitude:
        malefics: tuple[Planet, ...] = ("Mars", "Saturn", "Rahu", "Ketu")
        luminaries: tuple[Planet, ...] = ("Sun", "Moon")
        for m in malefics:
            tl = transit_longitude.get(m)
            if tl is None:
                continue
            for lum in luminaries:
                nl = natal_planet_longitude.get(lum)
                if nl is None:
                    continue
                diff = abs((tl - nl + 180.0) % 360.0 - 180.0)
                if diff <= 3.0:
                    highlights.append(
                        TransitHighlight(
                            planet=m,
                            note=f"{m} within 3° of natal {lum}",
                        )
                    )
    return highlights
