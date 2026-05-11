from app.calc.compatibility import compute_compatibility
from app.schemas.common import ChartOut, HouseOut, PlanetInChartOut, PlanetPlacementOut
from app.schemas.requests import CompatibilityPersonInput


def _houses() -> list[HouseOut]:
    signs = [
        "Aries",
        "Taurus",
        "Gemini",
        "Cancer",
        "Leo",
        "Virgo",
        "Libra",
        "Scorpio",
        "Sagittarius",
        "Capricorn",
        "Aquarius",
        "Pisces",
    ]
    lords = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]
    return [HouseOut(house=index + 1, sign=sign, lord=lords[index]) for index, sign in enumerate(signs)]


def _placement(planet: str, sign: str, house: int) -> PlanetPlacementOut:
    return PlanetPlacementOut(
        planet=planet,
        longitude_deg=house * 10,
        sign=sign,
        house=house,
        nakshatra="Ashwini",
        pada=1,
        retrograde=False,
        combust=False,
        dignity="neutral",
    )


def _person(label: str, moon_sign: str, venus_sign: str, mars_sign: str) -> CompatibilityPersonInput:
    positions = [
        _placement("Moon", moon_sign, 1),
        _placement("Venus", venus_sign, 2),
        _placement("Mars", mars_sign, 3),
        _placement("Mercury", "Gemini", 4),
        _placement("Saturn", "Aquarius", 5),
    ]
    chart = ChartOut(
        chart_key="D1",
        ascendant_sign="Aries",
        houses=_houses(),
        planets=[
            PlanetInChartOut(planet=position.planet, sign=position.sign, house=position.house)
            for position in positions
        ],
    )
    d9 = ChartOut(
        chart_key="D9",
        ascendant_sign="Libra",
        houses=_houses(),
        planets=[PlanetInChartOut(planet="Saturn", sign="Aquarius", house=5)],
    )
    return CompatibilityPersonInput(
        label=label,
        summary={"lagna": "Aries", "moon_sign": moon_sign, "nakshatra": "Ashwini", "pada": 1},
        charts={"D1": chart, "D9": d9},
        planetary_positions=positions,
    )


def test_romantic_compatibility_returns_label_aware_factors() -> None:
    result = compute_compatibility(
        _person("romantic_partner", "Cancer", "Leo", "Scorpio"),
        _person("romantic_partner", "Cancer", "Taurus", "Leo"),
        "romantic_partner",
    )

    assert result["relationship_label"] == "romantic_partner"
    assert result["polarity"] == "supportive"
    assert any(factor["category"] == "attraction" for factor in result["factors"])
    assert any(factor["title"] == "Shared emotional weather" for factor in result["factors"])
