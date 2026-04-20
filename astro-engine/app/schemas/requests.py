from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .common import Ayanamsha, BirthProfileInput, ChartKey, PlanetPlacementOut


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


class PanchangRequest(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str
    ayanamsha: Ayanamsha = "lahiri"
