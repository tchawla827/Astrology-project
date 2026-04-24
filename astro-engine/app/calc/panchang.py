from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import swisseph as swe

from . import ayanamsha, ephemeris
from .constants import VEDIC_WEEKDAY_NAMES
from .nakshatra import nakshatra_name

TITHI_NAMES_SUKLA = (
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima",
)
TITHI_NAMES_KRISHNA = (
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Amavasya",
)
YOGA_NAMES = (
    "Vishkambha",
    "Priti",
    "Ayushman",
    "Saubhagya",
    "Shobhana",
    "Atiganda",
    "Sukarma",
    "Dhriti",
    "Shoola",
    "Ganda",
    "Vriddhi",
    "Dhruva",
    "Vyaghata",
    "Harshana",
    "Vajra",
    "Siddhi",
    "Vyatipata",
    "Variyana",
    "Parigha",
    "Shiva",
    "Siddha",
    "Sadhya",
    "Shubha",
    "Shukla",
    "Brahma",
    "Indra",
    "Vaidhriti",
)
KARANA_NAMES_FIXED = ("Shakuni", "Chatushpada", "Naga", "Kimstughna")
KARANA_NAMES_REPEAT = ("Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti")


@dataclass
class PanchangResult:
    date: str
    latitude: float
    longitude: float
    tithi: dict[str, str | float]
    nakshatra: dict[str, str | float]
    yoga: dict[str, str | float]
    karana: dict[str, str | float]
    vaara: str
    sunrise: str
    sunset: str
    muhurta_windows: list[dict[str, str]]
    ayanamsha_deg: float
    sidereal_time: str


def _tithi(sun_lon: float, moon_lon: float) -> tuple[str, float]:
    diff = (moon_lon - sun_lon) % 360.0
    idx = int(diff // 12.0)  # 0..29
    portion_left = 1.0 - ((diff - idx * 12.0) / 12.0)
    if idx < 15:
        name = "Shukla " + TITHI_NAMES_SUKLA[idx]
    else:
        name = "Krishna " + TITHI_NAMES_KRISHNA[idx - 15]
    return name, portion_left


def _yoga(sun_lon: float, moon_lon: float) -> tuple[str, float]:
    total = (sun_lon + moon_lon) % 360.0
    arc = 360.0 / 27.0
    idx = int(total // arc)
    left = 1.0 - ((total - idx * arc) / arc)
    return YOGA_NAMES[idx], left


def _karana(sun_lon: float, moon_lon: float) -> tuple[str, float]:
    diff = (moon_lon - sun_lon) % 360.0
    idx = int(diff // 6.0)  # 0..59
    left = 1.0 - ((diff - idx * 6.0) / 6.0)
    # First karana = Kimstughna (fixed); next 56 = 8 cycles of 7 moveable; last 3 = fixed.
    if idx == 0:
        name = "Kimstughna"
    elif idx >= 57:
        name = KARANA_NAMES_FIXED[idx - 57]  # 57→Shakuni, 58→Chatushpada, 59→Naga
    else:
        name = KARANA_NAMES_REPEAT[(idx - 1) % 7]
    return name, left


def _sunrise_sunset(jd_ut_start: float, latitude: float, longitude: float) -> tuple[float, float]:
    geopos = (longitude, latitude, 0.0)
    _, rise_arr = swe.rise_trans(
        jd_ut_start, swe.SUN, swe.CALC_RISE | swe.BIT_DISC_CENTER, geopos
    )
    _, set_arr = swe.rise_trans(
        jd_ut_start, swe.SUN, swe.CALC_SET | swe.BIT_DISC_CENTER, geopos
    )
    return float(rise_arr[0]), float(set_arr[0])


def _jd_to_local_time(jd_ut: float, tz_name: str) -> str:
    return _jd_to_local_datetime(jd_ut, tz_name).strftime("%H:%M:%S")


def _jd_to_local_datetime(jd_ut: float, tz_name: str) -> datetime:
    year, month, day, hour = swe.revjul(jd_ut)
    whole_seconds = int(round(hour * 3600))
    utc_dt = datetime(year, month, day, tzinfo=UTC) + timedelta(seconds=whole_seconds)
    return utc_dt.astimezone(ZoneInfo(tz_name))


def _segment_window(
    sunrise: datetime,
    sunset: datetime,
    segment_index: int,
) -> tuple[datetime, datetime]:
    segment_duration = (sunset - sunrise) / 8
    start = sunrise + segment_duration * (segment_index - 1)
    end = start + segment_duration
    return start, end


def _muhurta_windows(vaara: str, sunrise: datetime, sunset: datetime) -> list[dict[str, str]]:
    day_length = sunset - sunrise
    solar_noon = sunrise + day_length / 2
    abhijit_half_window = day_length / 30

    segment_maps = {
        "Rahu Kaal": {
            "Sunday": 8,
            "Monday": 2,
            "Tuesday": 7,
            "Wednesday": 5,
            "Thursday": 6,
            "Friday": 4,
            "Saturday": 3,
        },
        "Yamaganda": {
            "Sunday": 5,
            "Monday": 4,
            "Tuesday": 3,
            "Wednesday": 2,
            "Thursday": 1,
            "Friday": 7,
            "Saturday": 6,
        },
        "Gulika Kaal": {
            "Sunday": 7,
            "Monday": 6,
            "Tuesday": 5,
            "Wednesday": 4,
            "Thursday": 3,
            "Friday": 2,
            "Saturday": 1,
        },
    }

    windows = [
        {
            "name": "Abhijit Muhurta",
            "start": (solar_noon - abhijit_half_window).strftime("%H:%M:%S"),
            "end": (solar_noon + abhijit_half_window).strftime("%H:%M:%S"),
            "kind": "auspicious",
        }
    ]

    for name, segment_by_day in segment_maps.items():
        segment_index = segment_by_day[vaara]
        start, end = _segment_window(sunrise, sunset, segment_index)
        windows.append(
            {
                "name": name,
                "start": start.strftime("%H:%M:%S"),
                "end": end.strftime("%H:%M:%S"),
                "kind": "inauspicious",
            }
        )

    return sorted(windows, key=lambda window: window["start"])


def compute_panchang(
    date_str: str,
    latitude: float,
    longitude: float,
    timezone_name: str,
    ayan: str = "lahiri",
) -> PanchangResult:
    ephemeris.init_ephemeris()
    year, month, day = (int(p) for p in date_str.split("-"))
    local_midnight = datetime(year, month, day, 0, 0, 0, tzinfo=ZoneInfo(timezone_name))
    utc_midnight = local_midnight.astimezone(UTC)
    jd_midnight = swe.julday(
        utc_midnight.year,
        utc_midnight.month,
        utc_midnight.day,
        utc_midnight.hour + utc_midnight.minute / 60,
    )
    rise_jd, set_jd = _sunrise_sunset(jd_midnight, latitude, longitude)
    ayanamsha.apply(ayan)
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL
    sun_lon = float(swe.calc_ut(rise_jd, swe.SUN, flags)[0][0])
    moon_lon = float(swe.calc_ut(rise_jd, swe.MOON, flags)[0][0])
    tithi_name, tithi_left = _tithi(sun_lon, moon_lon)
    yoga_name, yoga_left = _yoga(sun_lon, moon_lon)
    karana_name, karana_left = _karana(sun_lon, moon_lon)
    nak_name = nakshatra_name(moon_lon)
    weekday_idx = local_midnight.weekday()  # Mon=0..Sun=6
    python_to_vedic = (1, 2, 3, 4, 5, 6, 0)  # Mon→Moon(1) ... Sun→Sun(0)
    vedic_idx = python_to_vedic[weekday_idx]
    vaara = VEDIC_WEEKDAY_NAMES[vedic_idx]
    rise_local = _jd_to_local_datetime(rise_jd, timezone_name)
    set_local = _jd_to_local_datetime(set_jd, timezone_name)
    sid_time_h = swe.sidtime(jd_midnight) + longitude / 15.0
    sid_time_h = sid_time_h % 24.0
    sh = int(sid_time_h)
    sm_f = (sid_time_h - sh) * 60
    sm = int(sm_f)
    ss = int(round((sm_f - sm) * 60))
    if ss == 60:
        ss = 0
        sm += 1
    if sm == 60:
        sm = 0
        sh += 1
    sid_time_str = f"{sh:02d}:{sm:02d}:{ss:02d}"
    return PanchangResult(
        date=date_str,
        latitude=latitude,
        longitude=longitude,
        tithi={"name": tithi_name, "fraction_left": tithi_left},
        nakshatra={"name": nak_name, "fraction_left": 1.0 - nakshatra_name_fraction_done(moon_lon)},
        yoga={"name": yoga_name, "fraction_left": yoga_left},
        karana={"name": karana_name, "fraction_left": karana_left},
        vaara=vaara,
        sunrise=rise_local.strftime("%H:%M:%S"),
        sunset=set_local.strftime("%H:%M:%S"),
        muhurta_windows=_muhurta_windows(vaara, rise_local, set_local),
        ayanamsha_deg=swe.get_ayanamsa_ut(rise_jd),
        sidereal_time=sid_time_str,
    )


def nakshatra_name_fraction_done(moon_lon: float) -> float:
    from .nakshatra import nakshatra_progress

    return nakshatra_progress(moon_lon)
