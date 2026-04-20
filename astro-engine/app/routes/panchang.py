from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ..calc.panchang import compute_panchang
from ..deps.auth import require_hmac
from ..schemas.requests import PanchangRequest

router = APIRouter()


@router.post("/panchang", dependencies=[Depends(require_hmac)])
def compute_panchang_endpoint(req: PanchangRequest) -> dict[str, Any]:
    result = compute_panchang(
        date_str=req.date,
        latitude=req.latitude,
        longitude=req.longitude,
        timezone_name=req.timezone,
        ayan=req.ayanamsha,
    )
    return {
        "date": result.date,
        "latitude": result.latitude,
        "longitude": result.longitude,
        "tithi": result.tithi,
        "nakshatra": result.nakshatra,
        "yoga": result.yoga,
        "karana": result.karana,
        "vaara": result.vaara,
        "sunrise": result.sunrise,
        "sunset": result.sunset,
        "ayanamsha_deg": result.ayanamsha_deg,
        "sidereal_time": result.sidereal_time,
    }
