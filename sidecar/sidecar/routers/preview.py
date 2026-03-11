"""
Router for jsPsych experiment preview generation.
"""

from fastapi import APIRouter

from sidecar.models.preview import PreviewRequest, PreviewResponse
from sidecar.services.jspsych_generator import generate_jspsych_preview

router = APIRouter(prefix="/preview", tags=["preview"])


@router.post("/jspsych", response_model=PreviewResponse)
async def preview_jspsych(request: PreviewRequest) -> PreviewResponse:
    """
    Generate a self-contained jsPsych 7.x HTML preview.

    The generated HTML includes inline CSS, the jsPsych library loaded
    from CDN, and trial definitions derived from the experiment spec
    and sample fillings.

    Parameters
    ----------
    request : PreviewRequest
        Experiment spec, sample fillings, and trial count.

    Returns
    -------
    PreviewResponse
        Self-contained HTML document and trial count.
    """
    return generate_jspsych_preview(request)
