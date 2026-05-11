from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ..calc.compatibility import compute_compatibility
from ..deps.auth import require_hmac
from ..schemas.requests import CompatibilityRequest

router = APIRouter()


@router.post("/compatibility", dependencies=[Depends(require_hmac)])
def compatibility(req: CompatibilityRequest) -> dict[str, Any]:
    return compute_compatibility(req.person_a, req.person_b, req.relationship_label)
