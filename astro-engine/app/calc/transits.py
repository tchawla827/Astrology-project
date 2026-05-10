from __future__ import annotations

from dataclasses import dataclass

from .constants import Planet


@dataclass
class TransitHighlight:
    planet: Planet
    note: str
    house: int | None = None
    rule: str = ""
    kind: str = "major"
    severity: str = "medium"
    score_delta: float = 0.0
    orb_deg: float | None = None


def _angular_diff(left: float, right: float) -> float:
    return abs((left - right + 180.0) % 360.0 - 180.0)


def _orb_delta(orb_deg: float, exact: float, close: float, near: float) -> float:
    if orb_deg <= 1.0:
        return exact
    if orb_deg <= 2.0:
        return close
    return near


def overlay(
    transit_house: dict[Planet, int],
    natal_planet_house: dict[Planet, int],
    natal_planet_longitude: dict[Planet, float] | None = None,
    transit_longitude: dict[Planet, float] | None = None,
) -> list[TransitHighlight]:
    highlights: list[TransitHighlight] = []
    saturn_h = transit_house.get("Saturn")
    if saturn_h in {1, 4, 7, 10}:
        delta = -4.5 if saturn_h in {1, 10} else -3.5
        highlights.append(
            TransitHighlight(
                planet="Saturn",
                note=f"Saturn pressure on kendra {saturn_h}",
                house=saturn_h,
                rule="saturn_kendra_pressure",
                severity="high" if saturn_h in {1, 10} else "medium",
                score_delta=delta,
            )
        )

    jup_h = transit_house.get("Jupiter")
    if jup_h in {1, 5, 9}:
        delta = 4.5 if jup_h in {1, 9} else 3.5
        highlights.append(
            TransitHighlight(
                planet="Jupiter",
                note=f"Jupiter support on trine {jup_h}",
                house=jup_h,
                rule="jupiter_trine_support",
                severity="high" if jup_h in {1, 9} else "medium",
                score_delta=delta,
            )
        )

    rahu_h = transit_house.get("Rahu")
    moon_h = natal_planet_house.get("Moon")
    rahu_lon = transit_longitude.get("Rahu") if transit_longitude else None
    moon_lon = natal_planet_longitude.get("Moon") if natal_planet_longitude else None
    rahu_moon_orb = (
        _angular_diff(rahu_lon, moon_lon)
        if rahu_lon is not None and moon_lon is not None
        else None
    )
    if rahu_h is not None and moon_h is not None and rahu_moon_orb is not None and rahu_moon_orb <= 3.0:
        highlights.append(
            TransitHighlight(
                planet="Rahu",
                note="Rahu-Moon conjunction in transit",
                house=moon_h,
                rule="rahu_moon_conjunction",
                severity="high",
                score_delta=_orb_delta(rahu_moon_orb, -7.0, -5.5, -4.0),
                orb_deg=round(rahu_moon_orb, 3),
            )
        )

    if natal_planet_longitude and transit_longitude:
        malefics: tuple[Planet, ...] = ("Mars", "Saturn", "Rahu", "Ketu")
        luminaries: tuple[Planet, ...] = ("Sun", "Moon")
        for malefic in malefics:
            transit_lon = transit_longitude.get(malefic)
            if transit_lon is None:
                continue
            for luminary in luminaries:
                natal_lon = natal_planet_longitude.get(luminary)
                if natal_lon is None:
                    continue
                diff = _angular_diff(transit_lon, natal_lon)
                if diff > 3.0:
                    continue
                if malefic == "Rahu" and luminary == "Moon" and rahu_moon_orb is not None and rahu_moon_orb <= 3.0:
                    continue
                delta = _orb_delta(
                    diff,
                    -6.0 if malefic in {"Saturn", "Rahu", "Ketu"} else -4.5,
                    -4.5 if malefic in {"Saturn", "Rahu", "Ketu"} else -3.5,
                    -3.0 if malefic in {"Saturn", "Rahu", "Ketu"} else -2.5,
                )
                highlights.append(
                    TransitHighlight(
                        planet=malefic,
                        house=natal_planet_house.get(luminary),
                        note=f"{malefic} within 3 degrees of natal {luminary}",
                        rule=f"{malefic.lower()}_near_natal_{luminary.lower()}",
                        severity="high" if diff <= 1.0 else "medium",
                        score_delta=delta,
                        orb_deg=round(diff, 3),
                    )
                )
    return highlights
