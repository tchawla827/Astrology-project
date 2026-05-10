from __future__ import annotations

from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.calc.chart_snapshot import BirthInput, build_snapshot
from app.main import app

SECRET = "test-secret"
PROFILE = {
    "birth_date": "1995-06-07",
    "birth_time": "23:54:00",
    "timezone": "Asia/Kolkata",
    "latitude": 29.3909,
    "longitude": 76.9635,
    "ayanamsha": "lahiri",
}


def test_dasha_endpoint_returns_mahadasha(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", SECRET)
    client = TestClient(app)
    resp = client.post(
        "/dasha",
        headers={"X-Astro-Secret": SECRET},
        json={**PROFILE, "depth": "mahadasha"},
    )
    assert resp.status_code == 200
    body = resp.json()
    levels = {p["level"] for p in body["periods"]}
    assert levels == {"mahadasha"}
    lords = [p["lord"] for p in body["periods"]]
    assert "Rahu" in lords


def test_transits_overlay(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", SECRET)
    client = TestClient(app)
    natal_snapshot = build_snapshot(
        BirthInput(
            birth_date=PROFILE["birth_date"],
            birth_time=PROFILE["birth_time"],
            timezone=PROFILE["timezone"],
            latitude=PROFILE["latitude"],
            longitude=PROFILE["longitude"],
            ayanamsha=PROFILE["ayanamsha"],
        )
    )
    resp = client.post(
        "/transits",
        headers={"X-Astro-Secret": SECRET},
        json={
            "at": "2026-04-20T06:00:00Z",
            "latitude": PROFILE["latitude"],
            "longitude": PROFILE["longitude"],
            "ayanamsha": "lahiri",
            "natal": {
                "lagna_sign": natal_snapshot["summary"]["lagna"],
                "planetary_positions": natal_snapshot["planetary_positions"],
            },
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["as_of"].startswith("2026-04-20")
    planets = {p["planet"] for p in body["positions"]}
    assert {"Sun", "Moon", "Saturn"}.issubset(planets)
    assert body["overlay"] is not None
    assert "triggered_houses" in body["overlay"]
    assert "planet_to_house" in body["overlay"]


def test_panchang_endpoint(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", SECRET)
    client = TestClient(app)
    resp = client.post(
        "/panchang",
        headers={"X-Astro-Secret": SECRET},
        json={
            "date": "2026-04-20",
            "latitude": 29.3909,
            "longitude": 76.9635,
            "timezone": "Asia/Kolkata",
            "ayanamsha": "lahiri",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["date"] == "2026-04-20"
    assert "name" in body["tithi"]
    assert "name" in body["nakshatra"]
    assert body["vaara"] in {
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    }
    assert len(body["muhurta_windows"]) == 4
    assert {window["name"] for window in body["muhurta_windows"]} == {
        "Abhijit Muhurta",
        "Rahu Kaal",
        "Yamaganda",
        "Gulika Kaal",
    }


def test_timeline_year_endpoint_returns_exact_daily_transits(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", SECRET)
    client = TestClient(app)
    natal_snapshot = build_snapshot(
        BirthInput(
            birth_date=PROFILE["birth_date"],
            birth_time=PROFILE["birth_time"],
            timezone=PROFILE["timezone"],
            latitude=PROFILE["latitude"],
            longitude=PROFILE["longitude"],
            ayanamsha=PROFILE["ayanamsha"],
        )
    )
    timeline_resp = client.post(
        "/timeline/year",
        headers={"X-Astro-Secret": SECRET},
        json={
            **PROFILE,
            "year": 2026,
            "natal": {
                "lagna_sign": natal_snapshot["summary"]["lagna"],
                "planetary_positions": natal_snapshot["planetary_positions"],
            },
        },
    )
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()
    assert timeline["year"] == 2026
    assert len(timeline["days"]) == 365
    assert {p["level"] for p in timeline["dasha"]["periods"]} == {
        "mahadasha",
        "antardasha",
        "pratyantardasha",
    }

    first_day = timeline["days"][0]
    transit_resp = client.post(
        "/transits",
        headers={"X-Astro-Secret": SECRET},
        json={
            "at": first_day["scoring_instant"],
            "latitude": PROFILE["latitude"],
            "longitude": PROFILE["longitude"],
            "ayanamsha": "lahiri",
            "natal": {
                "lagna_sign": natal_snapshot["summary"]["lagna"],
                "planetary_positions": natal_snapshot["planetary_positions"],
            },
        },
    )
    assert transit_resp.status_code == 200
    assert first_day["transits"]["positions"] == transit_resp.json()["positions"]


def test_invalid_input_returns_400(monkeypatch: MonkeyPatch) -> None:
    monkeypatch.setenv("ASTRO_ENGINE_SECRET", SECRET)
    client = TestClient(app)
    resp = client.post(
        "/profile",
        headers={"X-Astro-Secret": SECRET},
        json={"birth_date": "not-a-date"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_INPUT"
