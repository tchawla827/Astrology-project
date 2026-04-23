from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends

from ..calc import ayanamsha, ephemeris
from ..calc.combustion import is_combust
from ..calc.constants import SIGNS, Planet
from ..calc.dignity import dignity_for
from ..calc.houses import house_of_sign
from ..calc.nakshatra import nakshatra_name, pada
from ..calc.planets import compute_positions
from ..calc.transits import overlay
from ..deps.auth import require_hmac
from ..schemas.requests import TransitRequest

router = APIRouter()


@router.post("/transits", dependencies=[Depends(require_hmac)])
def compute_transits(req: TransitRequest) -> dict[str, Any]:
    dt = datetime.fromisoformat(req.at.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    jd = ephemeris.julian_day(dt)
    ayanamsha.apply(req.ayanamsha)
    positions = compute_positions(jd, req.ayanamsha)
    sun_lon = positions["Sun"].longitude_deg
    asc_sign_index = SIGNS.index(req.natal.lagna_sign) if req.natal is not None else 0
    transit_house: dict[Planet, int] = {
        p: house_of_sign(pos.sign_index, asc_sign_index) for p, pos in positions.items()
    }

    payload: dict[str, Any] = {
        "as_of": dt.isoformat(),
        "positions": [
            {
                "planet": p,
                "longitude_deg": round(pos.longitude_deg, 6),
                "sign": pos.sign,
                "house": transit_house[p],
                "nakshatra": nakshatra_name(pos.longitude_deg),
                "pada": pada(pos.longitude_deg),
                "retrograde": pos.retrograde,
                "combust": is_combust(p, pos.longitude_deg, sun_lon),
                "dignity": dignity_for(p, pos.sign),
            }
            for p, pos in positions.items()
        ],
        "highlights": [],
        "overlay": None,
    }

    if req.natal is None:
        return payload

    natal_house: dict[Planet, int] = {}
    natal_lon: dict[Planet, float] = {}
    for np in req.natal.planetary_positions:
        sign_index = SIGNS.index(np.sign)
        natal_house[np.planet] = house_of_sign(sign_index, asc_sign_index)
        natal_lon[np.planet] = np.longitude_deg
    transit_lon = {p: pos.longitude_deg for p, pos in positions.items()}
    highlights = overlay(transit_house, natal_house, natal_lon, transit_lon)
    payload["highlights"] = [h.note for h in highlights]
    payload["overlay"] = {
        "triggered_houses": sorted({h.house for h in highlights if h.house is not None}),
        "planet_to_house": transit_house,
    }
    return payload
