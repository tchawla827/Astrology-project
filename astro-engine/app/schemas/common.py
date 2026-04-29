from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

Planet = Literal[
    "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"
]
Ayanamsha = Literal["lahiri", "raman", "kp"]
ChartKey = Literal[
    "D1", "Bhava", "Moon",
    "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12",
    "D16", "D20", "D24", "D27", "D30", "D40", "D45", "D60",
]


class BirthProfileInput(BaseModel):
    birth_date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    birth_time: str = Field(pattern=r"^\d{2}:\d{2}:\d{2}$")
    timezone: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    ayanamsha: Ayanamsha = "lahiri"

    @field_validator("birth_time")
    @classmethod
    def validate_birth_time(cls, value: str) -> str:
        hour_text, minute_text, second_text = value.split(":")
        hour = int(hour_text)
        minute = int(minute_text)
        second = int(second_text)
        if hour > 23 or minute > 59 or second > 59:
            raise ValueError("birth_time must be a valid 24-hour time")
        return value


class PlanetPlacementOut(BaseModel):
    planet: Planet
    longitude_deg: float
    sign: str
    house: int
    nakshatra: str
    pada: int
    retrograde: bool
    combust: bool
    dignity: Literal[
        "exalted",
        "moolatrikona",
        "own",
        "friendly",
        "neutral",
        "enemy",
        "debilitated",
    ]


class HouseOut(BaseModel):
    house: int
    sign: str
    lord: Planet


class PlanetInChartOut(BaseModel):
    planet: Planet
    sign: str
    house: int
    longitude_deg: float | None = None
    retrograde: bool | None = None
    combust: bool | None = None
    varga_symbolic_combust: bool | None = None
    dignity: Literal[
        "exalted",
        "moolatrikona",
        "own",
        "friendly",
        "neutral",
        "enemy",
        "debilitated",
    ] | None = None


class ChartOut(BaseModel):
    chart_key: ChartKey
    ascendant_sign: str
    ascendant_longitude_deg: float | None = None
    houses: list[HouseOut]
    planets: list[PlanetInChartOut]
    aspects: list[dict[str, object]] | None = None


class YogaOut(BaseModel):
    name: str
    confidence: Literal["low", "medium", "high"]
    source_charts: list[str]
    planets_involved: list[Planet]
    notes: list[str]


class DashaPeriodOut(BaseModel):
    lord: Planet
    start: str
    end: str


class DashaSummaryOut(BaseModel):
    system: Literal["vimshottari"] = "vimshottari"
    current_mahadasha: DashaPeriodOut
    current_antardasha: DashaPeriodOut
    upcoming: list[DashaPeriodOut]


class TransitSummaryOut(BaseModel):
    as_of: str
    positions: list[PlanetPlacementOut]
    highlights: list[str]
    overlay: dict[str, object] | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, str] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
