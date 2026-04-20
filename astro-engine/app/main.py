from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.routes import charts, dasha, health, panchang, profile, transits
from app.versioning import ENGINE_VERSION

app = FastAPI(title="astri-astro-engine", version=ENGINE_VERSION)
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
