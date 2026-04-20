from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends

from ..calc import ephemeris
from ..calc.chart_snapshot import BirthInput
from ..calc.dashas import antardasha_sequence, mahadasha_sequence, pratyantardasha_sequence
from ..calc.planets import compute_positions
from ..deps.auth import require_hmac
from ..schemas.requests import DashaRequest

router = APIRouter()


def _parse_iso_date(text: str) -> datetime:
    dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt


@router.post("/dasha", dependencies=[Depends(require_hmac)])
def compute_dasha(req: DashaRequest) -> dict[str, Any]:
    birth = BirthInput(
        birth_date=req.birth_date,
        birth_time=req.birth_time,
        timezone=req.timezone,
        latitude=req.latitude,
        longitude=req.longitude,
        ayanamsha=req.ayanamsha,
    )
    birth_utc = ephemeris.local_to_utc(birth.birth_date, birth.birth_time, birth.timezone)
    jd = ephemeris.julian_day(birth_utc)
    positions = compute_positions(jd, birth.ayanamsha)
    moon_lon = positions["Moon"].longitude_deg
    start = _parse_iso_date(req.from_) if req.from_ else birth_utc
    end = _parse_iso_date(req.to) if req.to else birth_utc.replace(year=birth_utc.year + 120)

    mahas = mahadasha_sequence(moon_lon, birth_utc, end)
    mahas = [m for m in mahas if m.end > start]

    periods: list[dict[str, str]] = []
    for maha in mahas:
        periods.append(
            {
                "level": "mahadasha",
                "lord": maha.lord,
                "start": maha.start.date().isoformat(),
                "end": maha.end.date().isoformat(),
            }
        )
        if req.depth in ("antardasha", "pratyantardasha"):
            for antar in antardasha_sequence(maha):
                if antar.end <= start or antar.start >= end:
                    continue
                periods.append(
                    {
                        "level": "antardasha",
                        "lord": antar.lord,
                        "start": antar.start.date().isoformat(),
                        "end": antar.end.date().isoformat(),
                    }
                )
                if req.depth == "pratyantardasha":
                    for praty in pratyantardasha_sequence(antar, maha.lord):
                        if praty.end <= start or praty.start >= end:
                            continue
                        periods.append(
                            {
                                "level": "pratyantardasha",
                                "lord": praty.lord,
                                "start": praty.start.date().isoformat(),
                                "end": praty.end.date().isoformat(),
                            }
                        )
    return {"system": "vimshottari", "periods": periods}
