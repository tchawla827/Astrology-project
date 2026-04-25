from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.observability import configure_logging, request_log_middleware
from app.routes import charts, dasha, health, panchang, profile, transits
from app.versioning import ENGINE_VERSION

configure_logging()

app = FastAPI(title="astri-astro-engine", version=ENGINE_VERSION)
app.middleware("http")(request_log_middleware)
app.include_router(health.router)
app.include_router(profile.router)
app.include_router(charts.router)
app.include_router(dasha.router)
app.include_router(transits.router)
app.include_router(panchang.router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": {"code": "INVALID_INPUT", "message": str(exc.errors())}},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        content = exc.detail
    else:
        code = "UNAUTHORIZED" if exc.status_code == 401 else "COMPUTATION_ERROR"
        content = {"error": {"code": code, "message": str(exc.detail)}}
    return JSONResponse(status_code=exc.status_code, content=content)
