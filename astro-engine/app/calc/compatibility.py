from __future__ import annotations

from typing import Any

from app.schemas.common import ChartOut, PlanetPlacementOut
from app.schemas.requests import CompatibilityPersonInput
from app.versioning import ENGINE_VERSION

RELATIONSHIP_CATEGORIES: dict[str, list[str]] = {
    "romantic_partner": ["attraction", "emotional rhythm", "commitment", "conflict", "repair"],
    "spouse": ["attraction", "emotional rhythm", "commitment", "conflict", "repair"],
    "ex": ["residue", "emotional rhythm", "unfinished patterns", "conflict", "repair potential"],
    "friend": ["trust", "communication", "support", "boundaries", "timing"],
    "sibling": ["trust", "communication", "responsibility", "boundaries", "timing"],
    "parent": ["support", "responsibility", "boundaries", "emotional rhythm", "timing"],
    "child": ["support", "responsibility", "boundaries", "emotional rhythm", "timing"],
    "colleague": ["communication", "reliability", "support", "boundaries", "timing"],
}


def _planet_by_name(positions: list[PlanetPlacementOut], name: str) -> PlanetPlacementOut | None:
    return next((position for position in positions if position.planet == name), None)


def _chart_planet(chart: ChartOut | None, name: str) -> Any | None:
    if chart is None:
        return None
    return next((position for position in chart.planets if position.planet == name), None)


def _same_sign(left: PlanetPlacementOut | None, right: PlanetPlacementOut | None) -> bool:
    return bool(left and right and left.sign == right.sign)


def _house_gap(left: int, right: int) -> int:
    direct = abs(left - right)
    return min(direct, 12 - direct)


def _factor(
    category: str,
    polarity: str,
    title: str,
    summary: str,
    planets: list[str],
    charts: list[str],
    confidence: str = "medium",
) -> dict[str, Any]:
    return {
        "category": category,
        "polarity": polarity,
        "title": title,
        "summary": summary,
        "citations": [
            {"person": "both", "charts": charts, "houses": [], "planets": planets},
        ],
        "confidence": confidence,
    }


def compute_compatibility(
    person_a: CompatibilityPersonInput,
    person_b: CompatibilityPersonInput,
    relationship_label: str,
) -> dict[str, Any]:
    categories = RELATIONSHIP_CATEGORIES.get(relationship_label, RELATIONSHIP_CATEGORIES["friend"])
    d1_a = person_a.charts.get("D1")
    d1_b = person_b.charts.get("D1")
    d9_a = person_a.charts.get("D9")
    d9_b = person_b.charts.get("D9")
    moon_a = _planet_by_name(person_a.planetary_positions, "Moon")
    moon_b = _planet_by_name(person_b.planetary_positions, "Moon")
    venus_a = _planet_by_name(person_a.planetary_positions, "Venus")
    venus_b = _planet_by_name(person_b.planetary_positions, "Venus")
    mars_a = _planet_by_name(person_a.planetary_positions, "Mars")
    mars_b = _planet_by_name(person_b.planetary_positions, "Mars")
    mercury_a = _planet_by_name(person_a.planetary_positions, "Mercury")
    mercury_b = _planet_by_name(person_b.planetary_positions, "Mercury")
    saturn_a_d9 = _chart_planet(d9_a, "Saturn")
    saturn_b_d9 = _chart_planet(d9_b, "Saturn")

    factors: list[dict[str, Any]] = []
    score = 0

    if _same_sign(moon_a, moon_b):
        score += 2
        factors.append(
            _factor(
                categories[1],
                "strength",
                "Shared emotional weather",
                "Both Moons fall in the same sign, so instinctive reactions are easier to recognize.",
                ["Moon"],
                ["D1"],
                "high",
            )
        )
    elif moon_a and moon_b and _house_gap(moon_a.house, moon_b.house) <= 2:
        score += 1
        factors.append(
            _factor(
                categories[1],
                "mixed",
                "Close emotional pacing",
                "The Moon houses are near each other, which can create familiarity but also quick mirroring.",
                ["Moon"],
                ["D1"],
            )
        )
    else:
        score -= 1
        factors.append(
            _factor(
                categories[1],
                "friction",
                "Different emotional timing",
                "The Moon placements do not naturally echo each other, so moods may need translation.",
                ["Moon"],
                ["D1"],
            )
        )

    if relationship_label in {"romantic_partner", "spouse", "ex"}:
        if _same_sign(venus_a, mars_b) or _same_sign(venus_b, mars_a):
            score += 2
            factors.append(
                _factor(
                    categories[0],
                    "strength",
                    "Direct attraction signature",
                    "One person's Venus links with the other's Mars by sign, creating a clear attraction channel.",
                    ["Venus", "Mars"],
                    ["D1"],
                    "high",
                )
            )
        else:
            factors.append(
                _factor(
                    categories[0],
                    "mixed",
                    "Attraction needs context",
                    "Venus and Mars do not form the simplest sign-level lock, so attraction depends more on the wider chart.",
                    ["Venus", "Mars"],
                    ["D1"],
                )
            )
    elif _same_sign(mercury_a, mercury_b):
        score += 2
        factors.append(
            _factor(
                categories[1],
                "strength",
                "Similar communication style",
                "Both Mercury placements share a sign, so language and problem-solving can feel familiar.",
                ["Mercury"],
                ["D1"],
                "high",
            )
        )
    else:
        factors.append(
            _factor(
                categories[1],
                "mixed",
                "Different communication wiring",
                "Mercury placements differ by sign, so misunderstandings are more likely when stress is high.",
                ["Mercury"],
                ["D1"],
            )
        )

    if saturn_a_d9 and saturn_b_d9 and saturn_a_d9.house == saturn_b_d9.house:
        score += 1
        factors.append(
            _factor(
                categories[2],
                "strength",
                "Shared maturity lesson",
                "Saturn occupies the same Navamsa house for both charts, giving the bond a similar growth pressure.",
                ["Saturn"],
                ["D9"],
            )
        )
    elif d9_a and d9_b:
        factors.append(
            _factor(
                categories[2],
                "mixed",
                "Different long-term lessons",
                "The Navamsa Saturn signatures are not identical, so stability comes from negotiation rather than sameness.",
                ["Saturn"],
                ["D9"],
            )
        )

    if d1_a and d1_b and d1_a.ascendant_sign == d1_b.ascendant_sign:
        score += 1
        factors.append(
            _factor(
                categories[3],
                "mixed",
                "Similar operating style",
                "Both ascendants share a sign, which creates recognition but can also double the same blind spots.",
                [],
                ["D1"],
            )
        )

    polarity = "supportive" if score >= 3 else "mixed" if score >= 0 else "challenging"
    return {
        "engine_version": ENGINE_VERSION,
        "relationship_label": relationship_label,
        "polarity": polarity,
        "score_band": score,
        "factors": factors,
    }
