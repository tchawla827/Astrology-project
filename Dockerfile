FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ASTRO_ENGINE_EPHE_PATH=/app/astro-engine/ephe

RUN useradd -m -u 1000 user

WORKDIR /app/astro-engine

COPY --chown=user:user astro-engine/pyproject.toml astro-engine/requirements.txt ./
COPY --chown=user:user astro-engine/app ./app
COPY --chown=user:user astro-engine/ephe ./ephe

RUN pip install --upgrade pip && pip install -r requirements.txt

USER user

EXPOSE 7860

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
