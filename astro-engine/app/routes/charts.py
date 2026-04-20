from __future__ import annotations

from typing import Any, cast

from fastapi import APIRouter, Depends, HTTPException

from ..calc.chart_snapshot import BirthInput, build_snapshot
from ..calc.vargas import SUPPORTED_CHART_KEYS
from ..deps.auth import require_hmac
from ..schemas.requests import ChartRequest

router = APIRouter()


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
