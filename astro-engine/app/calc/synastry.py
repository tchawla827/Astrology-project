from __future__ import annotations

from typing import Any

from app.calc.constants import SIGNS, FRIENDS, ENEMIES, Planet
from app.schemas.common import ChartOut, PlanetPlacementOut
from app.schemas.requests import CompatibilityPersonInput

def _sign_distance(sign1: str, sign2: str) -> int:
    idx1 = SIGNS.index(sign1)
    idx2 = SIGNS.index(sign2)
    return ((idx2 - idx1) % 12) + 1

def calculate_house_overlays(
    person_a: CompatibilityPersonInput,
    person_b: CompatibilityPersonInput
) -> dict[str, dict[str, int]]:
    overlays_a_in_b: dict[str, int] = {}
    overlays_b_in_a: dict[str, int] = {}

    d1_a = person_a.charts.get("D1")
    d1_b = person_b.charts.get("D1")

    if not d1_a or not d1_b:
        return {"a_in_b": overlays_a_in_b, "b_in_a": overlays_b_in_a}

    asc_a = d1_a.ascendant_sign
    asc_b = d1_b.ascendant_sign

    for p in person_a.planetary_positions:
        house_in_b = _sign_distance(asc_b, p.sign)
        overlays_a_in_b[p.planet] = house_in_b

    for p in person_b.planetary_positions:
        house_in_a = _sign_distance(asc_a, p.sign)
        overlays_b_in_a[p.planet] = house_in_a

    return {"a_in_b": overlays_a_in_b, "b_in_a": overlays_b_in_a}

def calculate_cross_aspects(
    person_a: CompatibilityPersonInput,
    person_b: CompatibilityPersonInput
) -> list[dict[str, Any]]:
    cross_aspects: list[dict[str, Any]] = []

    drishti_offsets: dict[str, tuple[int, ...]] = {
        "Sun": (7,),
        "Moon": (7,),
        "Mars": (4, 7, 8),
        "Mercury": (7,),
        "Jupiter": (5, 7, 9),
        "Venus": (7,),
        "Saturn": (3, 7, 10),
        "Rahu": (5, 7, 9),
        "Ketu": (5, 7, 9),
    }

    for p_a in person_a.planetary_positions:
        if p_a.planet not in drishti_offsets:
            continue
        for offset in drishti_offsets[p_a.planet]:
            target_sign_idx = (SIGNS.index(p_a.sign) + offset - 1) % 12
            target_sign = SIGNS[target_sign_idx]

            for p_b in person_b.planetary_positions:
                if p_b.sign == target_sign:
                    cross_aspects.append({
                        "from_person": "A",
                        "to_person": "B",
                        "from_planet": p_a.planet,
                        "to_planet": p_b.planet,
                        "type": "aspect" if offset != 1 else "conjunction"
                    })

    for p_b in person_b.planetary_positions:
        if p_b.planet not in drishti_offsets:
            continue
        for offset in drishti_offsets[p_b.planet]:
            target_sign_idx = (SIGNS.index(p_b.sign) + offset - 1) % 12
            target_sign = SIGNS[target_sign_idx]

            for p_a in person_a.planetary_positions:
                if p_a.sign == target_sign:
                    cross_aspects.append({
                        "from_person": "B",
                        "to_person": "A",
                        "from_planet": p_b.planet,
                        "to_planet": p_a.planet,
                        "type": "aspect" if offset != 1 else "conjunction"
                    })

    for p_a in person_a.planetary_positions:
        for p_b in person_b.planetary_positions:
            if p_a.sign == p_b.sign:
                cross_aspects.append({
                    "from_person": "A",
                    "to_person": "B",
                    "from_planet": p_a.planet,
                    "to_planet": p_b.planet,
                    "type": "conjunction"
                })

    return cross_aspects

def _get_planet(positions: list[PlanetPlacementOut], name: str) -> PlanetPlacementOut | None:
    return next((position for position in positions if position.planet == name), None)

def calculate_bhakoot(moon_a: PlanetPlacementOut | None, moon_b: PlanetPlacementOut | None) -> int:
    if not moon_a or not moon_b:
        return 0
    distance = _sign_distance(moon_a.sign, moon_b.sign)
    if distance in (1, 3, 4, 7, 10, 11):
        return 7
    return 0

def calculate_graha_maitri(moon_a: PlanetPlacementOut | None, moon_b: PlanetPlacementOut | None) -> float:
    if not moon_a or not moon_b:
        return 0.0

    from app.calc.constants import SIGN_LORDS
    lord_a = SIGN_LORDS[moon_a.sign]
    lord_b = SIGN_LORDS[moon_b.sign]

    if lord_a == lord_b:
        return 5.0

    a_views_b = 1.0 if lord_b in FRIENDS.get(lord_a, []) else (0.0 if lord_b in ENEMIES.get(lord_a, []) else 0.5)
    b_views_a = 1.0 if lord_a in FRIENDS.get(lord_b, []) else (0.0 if lord_a in ENEMIES.get(lord_b, []) else 0.5)

    score_map = {
        (1.0, 1.0): 5.0,
        (1.0, 0.5): 4.0,
        (0.5, 1.0): 4.0,
        (0.5, 0.5): 3.0,
        (1.0, 0.0): 1.0,
        (0.0, 1.0): 1.0,
        (0.5, 0.0): 0.5,
        (0.0, 0.5): 0.5,
        (0.0, 0.0): 0.0,
    }
    return score_map.get((a_views_b, b_views_a), 0.0)

def _clamp(val: float) -> int:
    return max(0, min(100, int(round(val))))

def calculate_dimensional_scores(
    bhakoot: int, 
    maitri: float, 
    cross_aspects: list[dict[str, Any]],
    moon_a: PlanetPlacementOut | None,
    moon_b: PlanetPlacementOut | None,
    venus_a: PlanetPlacementOut | None,
    venus_b: PlanetPlacementOut | None,
    mars_a: PlanetPlacementOut | None,
    mars_b: PlanetPlacementOut | None,
    mercury_a: PlanetPlacementOut | None,
    mercury_b: PlanetPlacementOut | None
) -> dict[str, int]:
    # Emotional Score: Relies heavily on Moon
    emotional_base = 30 + (bhakoot / 7.0) * 40 + (maitri / 5.0) * 30
    emotional_bonus = 0
    if moon_a and moon_b and moon_a.sign == moon_b.sign:
        emotional_bonus += 15
    for asp in cross_aspects:
        if "Moon" in (asp["from_planet"], asp["to_planet"]):
            other = asp["to_planet"] if asp["from_planet"] == "Moon" else asp["from_planet"]
            if other in ("Jupiter", "Venus"):
                emotional_bonus += 5
            elif other in ("Saturn", "Rahu", "Ketu", "Mars"):
                emotional_bonus -= 5

    # Communication Score: Relies on Mercury and Moon
    comm_base = 40 + (maitri / 5.0) * 30
    comm_bonus = 0
    if mercury_a and mercury_b and mercury_a.sign == mercury_b.sign:
        comm_bonus += 20
    for asp in cross_aspects:
        if "Mercury" in (asp["from_planet"], asp["to_planet"]):
            other = asp["to_planet"] if asp["from_planet"] == "Mercury" else asp["from_planet"]
            if other in ("Jupiter", "Venus", "Moon"):
                comm_bonus += 5
            elif other in ("Mars", "Saturn"):
                comm_bonus -= 5

    # Physical Score: Relies on Mars and Venus
    phys_base = 50
    phys_bonus = 0
    if venus_a and mars_b and venus_a.sign == mars_b.sign:
        phys_bonus += 20
    if venus_b and mars_a and venus_b.sign == mars_a.sign:
        phys_bonus += 20
    for asp in cross_aspects:
        planets = {asp["from_planet"], asp["to_planet"]}
        if {"Venus", "Mars"}.issubset(planets):
            phys_bonus += 10
        elif "Venus" in planets and "Rahu" in planets:
            phys_bonus += 5
        elif "Mars" in planets and "Rahu" in planets:
            phys_bonus += 5
        elif {"Venus", "Saturn"}.issubset(planets):
            phys_bonus -= 10

    # Long-term Score: Relies on Jupiter and Saturn connections to luminaries
    lt_base = 40 + (bhakoot / 7.0) * 20
    lt_bonus = 0
    for asp in cross_aspects:
        planets = {asp["from_planet"], asp["to_planet"]}
        if "Saturn" in planets and {"Sun", "Moon", "Venus"}.intersection(planets):
            # Saturn aspects bind long term
            lt_bonus += 10
        if "Jupiter" in planets and {"Sun", "Moon"}.intersection(planets):
            lt_bonus += 10
        if "Rahu" in planets and {"Sun", "Moon"}.intersection(planets):
            lt_bonus -= 5

    return {
        "emotional": _clamp(emotional_base + emotional_bonus),
        "communication": _clamp(comm_base + comm_bonus),
        "physical": _clamp(phys_base + phys_bonus),
        "long_term": _clamp(lt_base + lt_bonus)
    }

def compute_synastry_metrics(
    person_a: CompatibilityPersonInput,
    person_b: CompatibilityPersonInput
) -> dict[str, Any]:
    moon_a = _get_planet(person_a.planetary_positions, "Moon")
    moon_b = _get_planet(person_b.planetary_positions, "Moon")
    venus_a = _get_planet(person_a.planetary_positions, "Venus")
    venus_b = _get_planet(person_b.planetary_positions, "Venus")
    mars_a = _get_planet(person_a.planetary_positions, "Mars")
    mars_b = _get_planet(person_b.planetary_positions, "Mars")
    mercury_a = _get_planet(person_a.planetary_positions, "Mercury")
    mercury_b = _get_planet(person_b.planetary_positions, "Mercury")

    bhakoot = calculate_bhakoot(moon_a, moon_b)
    maitri = calculate_graha_maitri(moon_a, moon_b)

    overlays = calculate_house_overlays(person_a, person_b)
    cross_aspects = calculate_cross_aspects(person_a, person_b)

    dimensional_scores = calculate_dimensional_scores(
        bhakoot, maitri, cross_aspects,
        moon_a, moon_b, venus_a, venus_b, mars_a, mars_b, mercury_a, mercury_b
    )

    return {
        "ashtakoota": {
            "bhakoot_score": bhakoot,
            "graha_maitri_score": maitri,
        },
        "house_overlays": overlays,
        "cross_aspects": cross_aspects,
        "dimensional_scores": dimensional_scores
    }
