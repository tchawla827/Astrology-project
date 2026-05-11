from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from .common import Ayanamsha, BirthProfileInput, ChartKey, ChartOut, PlanetPlacementOut


class ProfileRequest(BirthProfileInput):
    include_charts: list[ChartKey] | None = None
    as_of: str | None = None


class ChartRequest(BirthProfileInput):
    pass


class DashaRequest(BirthProfileInput):
    depth: Literal["mahadasha", "antardasha", "pratyantardasha"] = "antardasha"
    from_: str | None = Field(default=None, alias="from")
    to: str | None = None

    model_config = {"populate_by_name": True}


class NatalOverlayInput(BaseModel):
    lagna_sign: str
    planetary_positions: list[PlanetPlacementOut]


class TransitRequest(BaseModel):
    at: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    ayanamsha: Ayanamsha = "lahiri"
    natal: NatalOverlayInput | None = None


class TimelineYearRequest(BirthProfileInput):
    year: int = Field(ge=1900, le=2200)
    natal: NatalOverlayInput | None = None


class PanchangRequest(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str
    ayanamsha: Ayanamsha = "lahiri"

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        try:
            date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError("date must be a valid calendar date") from exc
        return value


class CompatibilityPersonInput(BaseModel):
    label: str
    summary: dict[str, object]
    charts: dict[str, ChartOut]
    planetary_positions: list[PlanetPlacementOut]


class CompatibilityRequest(BaseModel):
    person_a: CompatibilityPersonInput
    person_b: CompatibilityPersonInput
    relationship_label: str
