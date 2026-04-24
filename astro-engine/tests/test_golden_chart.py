from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.calc.chart_snapshot import BirthInput, build_snapshot
from app.main import app

GOLDEN_PATH = Path(__file__).parent / "golden" / "panipat_1995.json"
PANIPAT_SECRET = "test-secret"


@pytest.fixture(scope="module")
def golden() -> dict:
    return json.loads(GOLDEN_PATH.read_text())


@pytest.fixture(scope="module")
def snapshot(golden: dict) -> dict:
    p = golden["profile"]
    birth = BirthInput(
        birth_date=p["birth_date"],
        birth_time=p["birth_time"],
        timezone=p["timezone"],
        latitude=p["latitude"],
        longitude=p["longitude"],
        ayanamsha=p["ayanamsha"],
    )
    return build_snapshot(birth, as_of=datetime(2020, 1, 1, tzinfo=UTC))


def _placement(snapshot: dict, planet: str) -> dict:
    for p in snapshot["planetary_positions"]:
        if p["planet"] == planet:
            return p
    raise KeyError(planet)


def test_lagna_is_aquarius(snapshot: dict, golden: dict) -> None:
    assert snapshot["summary"]["lagna"] == golden["expected"]["lagna"]


def test_moon_sign_nakshatra_pada(snapshot: dict, golden: dict) -> None:
    exp = golden["expected"]["moon"]
    moon = _placement(snapshot, "Moon")
    assert moon["sign"] == exp["sign"]
    assert moon["nakshatra"] == exp["nakshatra"]
    assert moon["pada"] == exp["pada"]


def test_sun_sign_and_house(snapshot: dict, golden: dict) -> None:
    exp = golden["expected"]["sun"]
    sun = _placement(snapshot, "Sun")
    assert sun["sign"] == exp["sign"]
    assert sun["house"] == exp["house"]


def test_saturn_sign_and_house(snapshot: dict, golden: dict) -> None:
    exp = golden["expected"]["saturn"]
    sat = _placement(snapshot, "Saturn")
    assert sat["sign"] == exp["sign"]
    assert sat["house"] == exp["house"]


def test_mercury_retrograde(snapshot: dict) -> None:
    mercury = _placement(snapshot, "Mercury")
    assert mercury["sign"] == "Taurus"
    assert mercury["retrograde"] is True


def test_jupiter_retrograde(snapshot: dict) -> None:
    jupiter = _placement(snapshot, "Jupiter")
    assert jupiter["sign"] == "Scorpio"
    assert jupiter["retrograde"] is True


def test_rahu_ketu_axis(snapshot: dict) -> None:
    rahu = _placement(snapshot, "Rahu")
    ketu = _placement(snapshot, "Ketu")
    assert rahu["sign"] == "Libra"
    assert ketu["sign"] == "Aries"
    axis = abs((rahu["longitude_deg"] - ketu["longitude_deg"]) % 360 - 180.0)
    assert axis < 1e-6


def test_lagna_degree_precision(snapshot: dict) -> None:
    # Golden: 6 Aq 13' 03.78" → 6.2177°. Tolerance: 0.1°.
    lagna_lon = snapshot["lagna_longitude_deg"]
    in_sign = lagna_lon - 10 * 30  # Aquarius = sign 10
    assert abs(in_sign - 6.2177) < 0.1


def test_dasha_is_rahu_mahadasha(snapshot: dict, golden: dict) -> None:
    exp = golden["expected"]["dasha"]
    assert snapshot["dasha"]["current_mahadasha"]["lord"] == exp["mahadasha_lord"]


def test_navamsa_key_placements(snapshot: dict, golden: dict) -> None:
    expected = golden["expected"]["vargas"]["D9"]
    d9 = snapshot["charts"]["D9"]
    by_planet = {p["planet"]: p["sign"] for p in d9["planets"]}
    for planet, exp_sign in expected.items():
        assert by_planet[planet] == exp_sign, f"D9 {planet}: {by_planet[planet]} != {exp_sign}"


def test_bhava_houses(snapshot: dict, golden: dict) -> None:
    expected = golden["expected"]["vargas"]["Bhava"]
    bhava = snapshot["charts"]["Bhava"]
    by_planet = {p["planet"]: p["house"] for p in bhava["planets"]}
    for planet, exp_house in expected.items():
        assert by_planet[planet] == exp_house


def test_all_divisional_assertions(snapshot: dict, golden: dict) -> None:
    vargas = golden["expected"]["vargas"]
    for key, mapping in vargas.items():
        if key in ("D9", "Bhava"):
            continue
        chart = snapshot["charts"][key]
        by_planet = {p["planet"]: p["sign"] for p in chart["planets"]}
        for planet, exp_sign in mapping.items():
            assert by_planet[planet] == exp_sign, (
                f"{key} {planet}: got {by_planet[planet]}, expected {exp_sign}"
            )


def test_profile_endpoint_returns_snapshot(monkeypatch: MonkeyPatch, golden: dict) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", PANIPAT_SECRET)
    client = TestClient(app)
    resp = client.post(
        "/profile",
        headers={"X-Astro-Secret": PANIPAT_SECRET},
        json={**golden["profile"], "as_of": "2020-01-01T00:00:00Z"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["summary"]["lagna"] == "Aquarius"
    assert body["dasha"]["current_mahadasha"]["lord"] == "Rahu"


def test_profile_requires_hmac() -> None:
    client = TestClient(app)
    resp = client.post("/profile", json={})
    assert resp.status_code == 401


def test_unsupported_chart_key(monkeypatch: MonkeyPatch, golden: dict) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", PANIPAT_SECRET)
    client = TestClient(app)
    resp = client.post(
        "/charts/D99",
        headers={"X-Astro-Secret": PANIPAT_SECRET},
        json=golden["profile"],
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_CHART"


def test_supported_chart_endpoint(monkeypatch: MonkeyPatch, golden: dict) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", PANIPAT_SECRET)
    client = TestClient(app)
    resp = client.post(
        "/charts/D9",
        headers={"X-Astro-Secret": PANIPAT_SECRET},
        json=golden["profile"],
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["chart_key"] == "D9"
    by_planet = {p["planet"]: p["sign"] for p in body["planets"]}
    assert by_planet["Sun"] == "Cancer"
    assert by_planet["Moon"] == "Pisces"


def test_yogas_include_structured_planets(snapshot: dict) -> None:
    for yoga in snapshot["yogas"]:
        assert "planets_involved" in yoga
        assert isinstance(yoga["planets_involved"], list)
