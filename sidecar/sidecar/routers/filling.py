"""Router for CSP and MLM template filling endpoints."""

from fastapi import APIRouter

from sidecar.models.filling import (
    CSPFillRequest,
    CSPFillResponse,
    MLMFillRequest,
    MLMFillResponse,
)
from sidecar.services.csp_solver import solve_csp
from sidecar.services.mlm_filler import fill_mlm

router = APIRouter(prefix="/filling", tags=["filling"])


@router.post("/csp", response_model=CSPFillResponse)
async def compute_csp(request: CSPFillRequest) -> CSPFillResponse:
    """Run constraint satisfaction to generate valid template fillings.

    Applies constraint propagation and backtracking search over slot
    domains defined by the provided collections, filtering to assignments
    that satisfy all constraints.
    """
    return solve_csp(request)


@router.post("/mlm", response_model=MLMFillResponse)
async def compute_mlm(request: MLMFillRequest) -> MLMFillResponse:
    """Generate template fillings using masked language model predictions.

    Note: this endpoint returns random placeholder fillings unless the
    optional [ml] dependencies (transformers, torch) are installed.
    """
    return await fill_mlm(request)
