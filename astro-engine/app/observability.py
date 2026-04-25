from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request, Response


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "service": "astri-astro-engine",
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "environment": os.environ.get("ENVIRONMENT", "development"),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key, value in record.__dict__.items():
            if key.startswith("astri_"):
                payload[key.removeprefix("astri_")] = value
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    if os.environ.get("ENVIRONMENT") != "production":
        return

    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


async def request_log_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    started = time.perf_counter()
    logger = logging.getLogger("astri.request")
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.exception(
            "request_failed",
            extra={
                "astri_method": request.method,
                "astri_path": request.url.path,
                "astri_elapsed_ms": elapsed_ms,
            },
        )
        raise

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    logger.info(
        "request_completed",
        extra={
            "astri_method": request.method,
            "astri_path": request.url.path,
            "astri_status_code": response.status_code,
            "astri_elapsed_ms": elapsed_ms,
        },
    )
    return response
