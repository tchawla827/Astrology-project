from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException

from ..calc.chart_snapshot import BirthInput, build_snapshot
from ..calc.vargas import SUPPORTED_CHART_KEYS
from ..deps.auth import require_hmac
from ..schemas.requests import ChartRequest, ProfileRequest

router = APIRouter()


@router.post("/profile", dependencies=[Depends(require_hmac)])
def compute_profile(req: ProfileRequest) -> dict[str, Any]:
    birth = BirthInput(
        birth_date=req.birth_date,
        birth_time=req.birth_time,
        timezone=req.timezone,
        latitude=req.latitude,
        longitude=req.longitude,
        ayanamsha=req.ayanamsha,
    )
    as_of = None
    if req.as_of:
        as_of = datetime.fromisoformat(req.as_of.replace("Z", "+00:00"))
        if as_of.tzinfo is None:
            as_of = as_of.replace(tzinfo=UTC)
    return build_snapshot(
        birth, 
        include_charts=cast(list[str] | None, req.include_charts), 
        as_of=as_of
    )


@router.post("/charts/{chart_key}", dependencies=[Depends(require_hmac)])
def compute_chart(chart_key: str, req: ChartRequest) -> dict[str, Any]:
    if chart_key not in SUPPORTED_CHART_KEYS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "UNSUPPORTED_CHART",
                    "message": f"Chart {chart_key} not supported.",
                }
            },
        )
    birth = BirthInput(
        birth_date=req.birth_date,
        birth_time=req.birth_time,
        timezone=req.timezone,
        latitude=req.latitude,
        longitude=req.longitude,
        ayanamsha=req.ayanamsha,
    )
    snapshot = build_snapshot(birth, include_charts=[chart_key])
    return cast(dict[str, Any], snapshot["charts"][chart_key])
