import hmac
import os

from fastapi import Header, HTTPException, status


def require_hmac(x_astro_secret: str | None = Header(default=None)) -> None:
    expected = os.environ.get("ASTRO_ENGINE_SECRET")
    if not expected or not x_astro_secret or not hmac.compare_digest(x_astro_secret, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid astro-engine credentials.",
        )
