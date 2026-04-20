from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends

from ..calc.chart_snapshot import BirthInput, build_snapshot
from ..deps.auth import require_hmac
from ..schemas.requests import ProfileRequest

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
    include_charts = [str(key) for key in req.include_charts] if req.include_charts else None
    return build_snapshot(birth, include_charts=include_charts, as_of=as_of)
