"""Assemble a full ChartSnapshot payload for the golden test and /profile endpoint."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from ..versioning import ENGINE_VERSION
from . import ayanamsha, ephemeris
from .aspects import build_aspects
from .combustion import is_combust
from .constants import SIGNS, Planet
from .dashas import (
    active_maha_and_antar,
    mahadasha_sequence,
)
from .dignity import dignity_for
from .houses import compute_ascendant, house_of_sign, whole_sign_houses
from .nakshatra import nakshatra_name, pada
from .planets import PlanetPosition, compute_positions
from .transits import overlay
from .vargas import SUPPORTED_CHART_KEYS, VARGA_REGISTRY, varga_longitude


@dataclass
class BirthInput:
    birth_date: str
    birth_time: str
    timezone: str
    latitude: float
    longitude: float
    ayanamsha: str = "lahiri"


@dataclass
class ChartAspectPosition:
    planet: Planet
    longitude_deg: float


def _planet_placement(pos: PlanetPosition, asc_sign_index: int, sun_lon: float) -> dict[str, Any]:
    return {
        "planet": pos.planet,
        "longitude_deg": round(pos.longitude_deg, 6),
        "sign": pos.sign,
        "house": house_of_sign(pos.sign_index, asc_sign_index),
        "nakshatra": nakshatra_name(pos.longitude_deg),
        "pada": pada(pos.longitude_deg),
        "retrograde": pos.retrograde,
        "combust": is_combust(pos.planet, pos.longitude_deg, sun_lon),
        "dignity": dignity_for(pos.planet, pos.sign, pos.longitude_deg),
    }


def _build_chart(
    chart_key: str,
    positions: dict[Planet, PlanetPosition],
    asc_sign_index: int,
    asc_longitude: float,
    sun_lon: float,
) -> dict[str, Any]:
    if chart_key == "D1":
        chart_asc_index = asc_sign_index
        chart_asc_longitude = asc_longitude % 360.0
    elif chart_key == "Moon":
        moon_sign_index = positions["Moon"].sign_index
        chart_asc_index = moon_sign_index
        chart_asc_longitude = positions["Moon"].longitude_deg
    elif chart_key == "Bhava":
        chart_asc_index = asc_sign_index
        chart_asc_longitude = asc_longitude % 360.0
    else:
        fn = VARGA_REGISTRY[chart_key]
        chart_asc_index = fn(asc_longitude)
        chart_asc_longitude = varga_longitude(chart_key, asc_longitude)
    houses = whole_sign_houses(chart_asc_index)
    planet_entries: list[dict[str, Any]] = []
    chart_aspect_positions: dict[Planet, ChartAspectPosition] = {}
    chart_planet_house: dict[Planet, int] = {}
    uses_symbolic_varga = chart_key not in ("D1", "Bhava", "Moon")
    sun_chart_lon = sun_lon if not uses_symbolic_varga else varga_longitude(chart_key, sun_lon)
    for planet, pos in positions.items():
        if chart_key in ("D1", "Bhava"):
            sign_index = pos.sign_index
            chart_lon = pos.longitude_deg
        elif chart_key == "Moon":
            sign_index = pos.sign_index
            chart_lon = pos.longitude_deg
        else:
            sign_index = VARGA_REGISTRY[chart_key](pos.longitude_deg)
            chart_lon = varga_longitude(chart_key, pos.longitude_deg)
        house = ((sign_index - chart_asc_index) % 12) + 1
        sign = SIGNS[sign_index]
        chart_aspect_positions[planet] = ChartAspectPosition(
            planet=planet,
            longitude_deg=round(chart_lon, 6),
        )
        chart_planet_house[planet] = house
        planet_entries.append(
            {
                "planet": planet,
                "sign": sign,
                "house": house,
                "longitude_deg": round(chart_lon, 6),
                "retrograde": pos.retrograde,
                "combust": is_combust(planet, pos.longitude_deg, sun_lon),
                "varga_symbolic_combust": uses_symbolic_varga and is_combust(planet, chart_lon, sun_chart_lon),
                "dignity": dignity_for(planet, sign, chart_lon),
            }
        )
    return {
        "chart_key": chart_key,
        "ascendant_sign": SIGNS[chart_asc_index],
        "ascendant_longitude_deg": round(chart_asc_longitude, 6),
        "houses": [
            {"house": h.house, "sign": h.sign, "lord": h.lord}
            for h in houses
        ],
        "planets": planet_entries,
        "aspects": build_aspects(chart_aspect_positions, chart_planet_house),
    }


def _dasha_summary(
    moon_lon: float,
    birth_utc: datetime,
    as_of: datetime,
) -> dict[str, Any]:
    maha, antar = active_maha_and_antar(moon_lon, birth_utc, as_of)
    upcoming_maha = mahadasha_sequence(
        moon_lon, birth_utc, as_of.replace(year=as_of.year + 60)
    )
    idx = next((i for i, p in enumerate(upcoming_maha) if p.lord == maha.lord), 0)
    upcoming = upcoming_maha[idx + 1 : idx + 4]
    return {
        "system": "vimshottari",
        "current_mahadasha": {
            "lord": maha.lord,
            "start": maha.start.date().isoformat(),
            "end": maha.end.date().isoformat(),
        },
        "current_antardasha": {
            "lord": antar.lord,
            "start": antar.start.date().isoformat(),
            "end": antar.end.date().isoformat(),
        },
        "upcoming": [
            {
                "lord": p.lord,
                "start": p.start.date().isoformat(),
                "end": p.end.date().isoformat(),
            }
            for p in upcoming
        ],
    }


def _transit_summary(
    birth: BirthInput,
    natal_positions: dict[Planet, PlanetPosition],
    asc_sign_index: int,
    at: datetime,
) -> dict[str, Any]:
    jd = ephemeris.julian_day(at)
    transit_positions = compute_positions(jd, birth.ayanamsha)
    sun_lon = transit_positions["Sun"].longitude_deg
    transit_house = {
        p: house_of_sign(pos.sign_index, asc_sign_index)
        for p, pos in transit_positions.items()
    }
    natal_house = {
        p: house_of_sign(pos.sign_index, asc_sign_index)
        for p, pos in natal_positions.items()
    }
    natal_lon = {p: pos.longitude_deg for p, pos in natal_positions.items()}
    transit_lon = {p: pos.longitude_deg for p, pos in transit_positions.items()}
    highlights = overlay(transit_house, natal_house, natal_lon, transit_lon)
    return {
        "as_of": at.isoformat(),
        "positions": [
            _planet_placement(pos, asc_sign_index, sun_lon)
            for pos in transit_positions.values()
        ],
        "highlights": [h.note for h in highlights],
    }


def build_snapshot(
    birth: BirthInput,
    include_charts: list[str] | None = None,
    as_of: datetime | None = None,
) -> dict[str, Any]:
    ephemeris.init_ephemeris()
    ayanamsha.apply(birth.ayanamsha)
    birth_utc = ephemeris.local_to_utc(birth.birth_date, birth.birth_time, birth.timezone)
    jd = ephemeris.julian_day(birth_utc)
    asc = compute_ascendant(jd, birth.latitude, birth.longitude, birth.ayanamsha)
    positions = compute_positions(jd, birth.ayanamsha)
    sun_lon = positions["Sun"].longitude_deg

    requested = include_charts or list(SUPPORTED_CHART_KEYS)
    charts = {
        key: _build_chart(key, positions, asc.sign_index, asc.longitude_deg, sun_lon)
        for key in requested
    }

    moon = positions["Moon"]
    summary = {
        "lagna": asc.sign,
        "moon_sign": moon.sign,
        "nakshatra": nakshatra_name(moon.longitude_deg),
        "pada": pada(moon.longitude_deg),
    }

    planetary = [
        _planet_placement(pos, asc.sign_index, sun_lon) for pos in positions.values()
    ]

    as_of = as_of or datetime.now(UTC)
    dasha = _dasha_summary(moon.longitude_deg, birth_utc, as_of)
    transits = _transit_summary(birth, positions, asc.sign_index, as_of)

    from .yogas import detect_all

    planet_sign = {p: pos.sign for p, pos in positions.items()}
    planet_house = {
        p: house_of_sign(pos.sign_index, asc.sign_index) for p, pos in positions.items()
    }
    yogas = detect_all(planet_sign, planet_house, asc.sign_index)
    aspects = build_aspects(positions, planet_house)

    return {
        "engine_version": ENGINE_VERSION,
        "summary": summary,
        "charts": charts,
        "planetary_positions": planetary,
        "aspects": aspects,
        "yogas": [
            {
                "name": y.name,
                "confidence": y.confidence,
                "source_charts": y.source_charts,
                "planets_involved": y.planets_involved,
                "notes": y.notes,
            }
            for y in yogas
        ],
        "dasha": dasha,
        "transits": transits,
        "lagna_longitude_deg": round(asc.longitude_deg, 6),
    }
