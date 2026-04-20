from fastapi import FastAPI

from app.routes import health
from app.versioning import ENGINE_VERSION

app = FastAPI(title="astri-astro-engine", version=ENGINE_VERSION)
app.include_router(health.router)
