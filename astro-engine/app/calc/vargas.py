"""Divisional (varga) chart formulas.

Implements the Parashara-style classical vargas used by JHora's default tables.
For D2 the Parivritti-Dvaya ("Uniform Sign") variant is used, which is what
JHora emits under the `D-2 (US)` label and what the golden test expects.
"""

from __future__ import annotations

from collections.abc import Callable

from .constants import SIGNS

ChartKey = str

MOVABLE = {0, 3, 6, 9}  # Ar, Cn, Li, Cp
FIXED = {1, 4, 7, 10}  # Ta, Le, Sc, Aq
DUAL = {2, 5, 8, 11}  # Ge, Vi, Sg, Pi


def _segment(longitude_deg: float, n: int) -> tuple[int, int]:
    """Return (sign_index, segment_index_in_sign) for an n-fold division."""
    lon = longitude_deg % 360.0
    sign = int(lon // 30) % 12
    deg_in_sign = lon - sign * 30.0
    seg_len = 30.0 / n
    seg = min(int(deg_in_sign // seg_len), n - 1)
    return sign, seg


def d1(longitude_deg: float) -> int:
    return _segment(longitude_deg, 1)[0]


def d2_uniform(longitude_deg: float) -> int:
    """D-2 (US) — Parivritti-Dvaya. Used by JHora's default D2 table.

    Odd 1-indexed signs (Ar, Ge, Le, Li, Sg, Aq → 0-indexed 0,2,4,6,8,10):
      hora 0 → 2S,  hora 1 → 2S+1
    Even 1-indexed signs:
      hora 0 → 2S+1, hora 1 → 2S
    """
    sign, seg = _segment(longitude_deg, 2)
    if sign % 2 == 0:
        idx = 2 * sign + seg
    else:
        idx = 2 * sign + (1 - seg)
    return idx % 12


def d3(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 3)
    return (sign + [0, 4, 8][seg]) % 12


def d4(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 4)
    return (sign + [0, 3, 6, 9][seg]) % 12


def _parivritti(longitude_deg: float, n: int) -> int:
    sign, seg = _segment(longitude_deg, n)
    return (sign * n + seg) % 12


# D5 Panchamsa — BPHS-style fixed destinations per parity.
#   Odd signs (Ar, Ge, Le, Li, Sg, Aq): 5 segs → Ar, Aq, Sg, Li, Ge.
#   Even signs (Ta, Cn, Vi, Sc, Cp, Pi): 5 segs → Ta, Vi, Pi, Cp, Cn.
_D5_ODD = (0, 10, 8, 6, 2)
_D5_EVEN = (1, 5, 11, 9, 3)


def d5(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 5)
    table = _D5_ODD if sign % 2 == 0 else _D5_EVEN
    return table[seg]


def d6(longitude_deg: float) -> int:
    return _parivritti(longitude_deg, 6)


def d7(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 7)
    start = sign if sign % 2 == 0 else (sign + 6) % 12
    return (start + seg) % 12


def d8(longitude_deg: float) -> int:
    return _parivritti(longitude_deg, 8)


def d9(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 9)
    if sign in MOVABLE:
        start = sign
    elif sign in FIXED:
        start = (sign + 8) % 12
    else:  # dual
        start = (sign + 4) % 12
    return (start + seg) % 12


def d10(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 10)
    start = sign if sign % 2 == 0 else (sign + 8) % 12
    return (start + seg) % 12


def d11(longitude_deg: float) -> int:
    return _parivritti(longitude_deg, 11)


def d12(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 12)
    return (sign + seg) % 12


def d16(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 16)
    if sign in MOVABLE:
        start = 0
    elif sign in FIXED:
        start = 4
    else:
        start = 8
    return (start + seg) % 12


def d20(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 20)
    if sign in MOVABLE:
        start = 0
    elif sign in FIXED:
        start = 8
    else:
        start = 4
    return (start + seg) % 12


def d24(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 24)
    start = 4 if sign % 2 == 0 else 3
    return (start + seg) % 12


def d27(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 27)
    if sign in {0, 4, 8}:  # fire
        start = 0
    elif sign in {1, 5, 9}:  # earth
        start = 3
    elif sign in {2, 6, 10}:  # air
        start = 6
    else:  # water
        start = 9
    return (start + seg) % 12


_D30_ODD = ((5, 0), (5, 10), (8, 2), (7, 5), (7, 6))  # (deg_span, target_sign)
_D30_EVEN = ((5, 1), (7, 5), (8, 11), (5, 9), (5, 7))


def d30(longitude_deg: float) -> int:
    lon = longitude_deg % 360.0
    sign = int(lon // 30) % 12
    deg_in_sign = lon - sign * 30.0
    table = _D30_ODD if sign % 2 == 0 else _D30_EVEN
    acc = 0.0
    for span, target in table:
        acc += span
        if deg_in_sign < acc:
            return target
    return table[-1][1]


def d40(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 40)
    start = 0 if sign % 2 == 0 else 6
    return (start + seg) % 12


def d45(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 45)
    if sign in MOVABLE:
        start = 0
    elif sign in FIXED:
        start = 4
    else:
        start = 8
    return (start + seg) % 12


def d60(longitude_deg: float) -> int:
    sign, seg = _segment(longitude_deg, 60)
    return (sign + seg) % 12


VARGA_REGISTRY: dict[ChartKey, Callable[[float], int]] = {
    "D1": d1,
    "D2": d2_uniform,
    "D3": d3,
    "D4": d4,
    "D5": d5,
    "D6": d6,
    "D7": d7,
    "D8": d8,
    "D9": d9,
    "D10": d10,
    "D11": d11,
    "D12": d12,
    "D16": d16,
    "D20": d20,
    "D24": d24,
    "D27": d27,
    "D30": d30,
    "D40": d40,
    "D45": d45,
    "D60": d60,
}

SUPPORTED_CHART_KEYS: tuple[ChartKey, ...] = (
    "D1",
    "Bhava",
    "Moon",
    "D2",
    "D3",
    "D4",
    "D5",
    "D6",
    "D7",
    "D8",
    "D9",
    "D10",
    "D11",
    "D12",
    "D16",
    "D20",
    "D24",
    "D27",
    "D30",
    "D40",
    "D45",
    "D60",
)


def varga_sign(chart_key: ChartKey, longitude_deg: float) -> str:
    fn = VARGA_REGISTRY[chart_key]
    return SIGNS[fn(longitude_deg)]


def varga_sign_index(chart_key: ChartKey, longitude_deg: float) -> int:
    fn = VARGA_REGISTRY[chart_key]
    return fn(longitude_deg)


def varga_longitude(chart_key: ChartKey, longitude_deg: float) -> float:
    """Return a derived 0-360 longitude inside the requested varga chart.

    The sign comes from the chart's varga formula. The degree within that
    derived sign preserves the planet's proportional position inside its
    natal division segment. This is symbolic divisional longitude, not a
    second astronomical longitude.
    """
    lon = longitude_deg % 360.0
    if chart_key == "D1":
        return lon

    if chart_key == "D30":
        sign = int(lon // 30) % 12
        deg_in_sign = lon - sign * 30.0
        table = _D30_ODD if sign % 2 == 0 else _D30_EVEN
        acc = 0.0
        for span, target in table:
            start = acc
            acc += span
            if deg_in_sign < acc:
                fraction = (deg_in_sign - start) / span
                return (target * 30.0 + fraction * 30.0) % 360.0
        span, target = table[-1]
        fraction = (deg_in_sign - (30.0 - span)) / span
        return (target * 30.0 + fraction * 30.0) % 360.0

    if chart_key not in VARGA_REGISTRY:
        raise KeyError(chart_key)

    n = int(chart_key[1:])
    source_sign, segment = _segment(lon, n)
    deg_in_sign = lon - source_sign * 30.0
    segment_length = 30.0 / n
    segment_start = segment * segment_length
    fraction = (deg_in_sign - segment_start) / segment_length
    sign_index = varga_sign_index(chart_key, lon)
    return (sign_index * 30.0 + fraction * 30.0) % 360.0
