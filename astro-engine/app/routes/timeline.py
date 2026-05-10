from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends

from ..calc import ayanamsha, ephemeris
from ..calc.chart_snapshot import BirthInput
from ..calc.combustion import is_combust
from ..calc.constants import SIGNS, Planet
from ..calc.dashas import antardasha_sequence, mahadasha_sequence, pratyantardasha_sequence
from ..calc.dignity import dignity_for
from ..calc.houses import house_of_sign
from ..calc.nakshatra import nakshatra_name, pada
from ..calc.panchang import compute_sunrise_time
from ..calc.planets import compute_positions
from ..calc.transits import overlay
from ..deps.auth import require_hmac
from ..schemas.requests import NatalOverlayInput, TimelineYearRequest

router = APIRouter()


def _format_period_dt(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def _dasha_timeline(req: TimelineYearRequest) -> dict[str, Any]:
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
    start = datetime(req.year, 1, 1, tzinfo=UTC)
    end = datetime(req.year + 1, 1, 1, tzinfo=UTC)

    periods: list[dict[str, str]] = []
    for maha in [m for m in mahadasha_sequence(moon_lon, birth_utc, end) if m.end > start]:
        periods.append(
            {
                "level": "mahadasha",
                "lord": maha.lord,
                "start": _format_period_dt(maha.start),
                "end": _format_period_dt(maha.end),
            }
        )
        for antar in antardasha_sequence(maha):
            if antar.end <= start or antar.start >= end:
                continue
            periods.append(
                {
                    "level": "antardasha",
                    "lord": antar.lord,
                    "start": _format_period_dt(antar.start),
                    "end": _format_period_dt(antar.end),
                }
            )
            for praty in pratyantardasha_sequence(antar, maha.lord):
                if praty.end <= start or praty.start >= end:
                    continue
                periods.append(
                    {
                        "level": "pratyantardasha",
                        "lord": praty.lord,
                        "start": _format_period_dt(praty.start),
                        "end": _format_period_dt(praty.end),
                    }
                )
    return {"system": "vimshottari", "periods": periods}


def _transit_summary(
    *,
    at: datetime,
    latitude: float,
    longitude: float,
    ayan: str,
    natal: NatalOverlayInput | None,
) -> dict[str, Any]:
    jd = ephemeris.julian_day(at)
    ayanamsha.apply(ayan)
    positions = compute_positions(jd, ayan)
    sun_lon = positions["Sun"].longitude_deg
    asc_sign_index = SIGNS.index(natal.lagna_sign) if natal is not None else 0
    transit_house: dict[Planet, int] = {
        p: house_of_sign(pos.sign_index, asc_sign_index) for p, pos in positions.items()
    }

    payload: dict[str, Any] = {
        "as_of": at.isoformat(),
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
                "dignity": dignity_for(p, pos.sign, pos.longitude_deg),
            }
            for p, pos in positions.items()
        ],
        "highlights": [],
        "overlay": None,
    }

    if natal is None:
        return payload

    natal_house: dict[Planet, int] = {}
    natal_lon: dict[Planet, float] = {}
    for np in natal.planetary_positions:
        sign_index = SIGNS.index(np.sign)
        natal_house[np.planet] = house_of_sign(sign_index, asc_sign_index)
        natal_lon[np.planet] = np.longitude_deg
    transit_lon = {p: pos.longitude_deg for p, pos in positions.items()}
    highlights = overlay(transit_house, natal_house, natal_lon, transit_lon)
    payload["highlights"] = [h.note for h in highlights]
    payload["overlay"] = {
        "triggered_houses": sorted({h.house for h in highlights if h.house is not None}),
        "planet_to_house": transit_house,
        "hits": [
            {
                "rule": h.rule,
                "planet": h.planet,
                "house": h.house,
                "kind": h.kind,
                "severity": h.severity,
                "score_delta": h.score_delta,
                "orb_deg": h.orb_deg,
                "note": h.note,
            }
            for h in highlights
        ],
    }
    return payload


@router.post("/timeline/year", dependencies=[Depends(require_hmac)])
def compute_timeline_year(req: TimelineYearRequest) -> dict[str, Any]:
    days: list[dict[str, Any]] = []
    current = date(req.year, 1, 1)
    end = date(req.year + 1, 1, 1)
    while current < end:
        date_text = current.isoformat()
        sunrise = compute_sunrise_time(
            date_str=date_text,
            latitude=req.latitude,
            longitude=req.longitude,
            timezone_name=req.timezone,
        )
        scoring_instant = ephemeris.local_to_utc(date_text, sunrise, req.timezone)
        days.append(
            {
                "date": date_text,
                "scoring_instant": scoring_instant.isoformat().replace("+00:00", "Z"),
                "transits": _transit_summary(
                    at=scoring_instant,
                    latitude=req.latitude,
                    longitude=req.longitude,
                    ayan=req.ayanamsha,
                    natal=req.natal,
                ),
            }
        )
        current += timedelta(days=1)

    return {
        "year": req.year,
        "timezone": req.timezone,
        "dasha": _dasha_timeline(req),
        "days": days,
    }
