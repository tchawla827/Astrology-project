from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.main import app
from app.versioning import ENGINE_VERSION


def test_health_returns_engine_version() -> None:
  client = TestClient(app)

  response = client.get("/health")

  assert response.status_code == 200
  assert response.json() == {"status": "ok", "engine_version": ENGINE_VERSION}


def test_protected_health_requires_secret(monkeypatch: MonkeyPatch) -> None:
  monkeypatch.setenv("ASTRO_ENGINE_SECRET", "secret")
  client = TestClient(app)

  response = client.post("/health")

  assert response.status_code == 401


def test_protected_health_accepts_secret(monkeypatch: MonkeyPatch) -> None:
  monkeypatch.setenv("ASTRO_ENGINE_SECRET", "secret")
  client = TestClient(app)

  response = client.post("/health", headers={"X-Astro-Secret": "secret"})

  assert response.status_code == 200
