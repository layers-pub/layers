"""
Masked language model filling service.

By default, returns random placeholder fillings. If the optional ``[ml]``
dependencies (transformers, torch) are installed, uses a real masked
language model to generate predictions.
"""

import logging
import random

from sidecar.config import settings
from sidecar.models.filling import (
    MLMFillRequest,
    MLMFillResponse,
    MLMFillingResult,
    MLMSlotFilling,
)

logger = logging.getLogger(__name__)

# Check if transformers is available
_HAS_TRANSFORMERS = False
try:
    from transformers import pipeline as hf_pipeline  # type: ignore[import-untyped]

    _HAS_TRANSFORMERS = True
except ImportError:
    pass


def _render_text(template_text: str, slots: list[dict[str, object]], assignment: dict[str, str]) -> str:
    """
    Replace slot placeholders in the template text with assigned values.

    Parameters
    ----------
    template_text : str
        Original template text containing slot placeholders.
    slots : list[dict[str, object]]
        Slot definitions with ``"name"``, ``"start"``, and ``"end"`` keys.
    assignment : dict[str, str]
        Mapping from slot name to assigned value.

    Returns
    -------
    str
        Template text with all slot placeholders replaced.
    """
    result = template_text
    sorted_slots = sorted(slots, key=lambda s: int(s["start"]), reverse=True)  # type: ignore[arg-type]
    for slot in sorted_slots:
        name = str(slot["name"])
        start = int(slot["start"])  # type: ignore[arg-type]
        end = int(slot["end"])  # type: ignore[arg-type]
        value = assignment.get(name, f"[{name}]")
        result = result[:start] + value + result[end:]
    return result


async def fill_mlm(request: MLMFillRequest) -> MLMFillResponse:
    """
    Generate fillings using a masked language model.

    If transformers is not installed, returns random placeholder fillings
    with a note indicating stub mode.

    Parameters
    ----------
    request : MLMFillRequest
        Template, masked slot positions, model name, and candidate count.

    Returns
    -------
    MLMFillResponse
        Generated fillings with confidence scores and model metadata.
    """
    model_name = request.model or settings.mlm_model_name
    slot_dicts = [{"name": s.name, "start": s.start, "end": s.end} for s in request.template.slots]
    masked_slots = request.masked_positions

    if not _HAS_TRANSFORMERS:
        return _generate_stub_fillings(request, model_name, slot_dicts, masked_slots)

    return await _generate_real_fillings(request, model_name, slot_dicts, masked_slots)


def _generate_stub_fillings(
    request: MLMFillRequest,
    model_name: str,
    slot_dicts: list[dict[str, object]],
    masked_slots: list[str],
) -> MLMFillResponse:
    """
    Generate random placeholder fillings when transformers is not installed.

    Parameters
    ----------
    request : MLMFillRequest
        Request containing num_candidates and template.
    model_name : str
        Name of the model (included in response metadata).
    slot_dicts : list[dict[str, object]]
        Slot definitions with position information.
    masked_slots : list[str]
        Slot names to fill with placeholders.

    Returns
    -------
    MLMFillResponse
        Fillings with random words and synthetic confidence scores.
    """
    # Common placeholder words for stub mode
    placeholders = [
        "the", "a", "one", "some", "many", "few", "big", "small",
        "good", "bad", "new", "old", "first", "last", "long", "short",
        "cat", "dog", "bird", "fish", "tree", "house", "book", "table",
        "run", "walk", "see", "know", "think", "want", "give", "take",
    ]

    fillings: list[MLMFillingResult] = []
    for _ in range(request.num_candidates):
        assignment: dict[str, str] = {}
        slot_fillings: list[MLMSlotFilling] = []

        for slot_name in masked_slots:
            word = random.choice(placeholders)  # noqa: S311
            assignment[slot_name] = word
            confidence = round(random.uniform(0.01, 0.5), 4)  # noqa: S311
            slot_fillings.append(
                MLMSlotFilling(
                    slot_name=slot_name,
                    value=word,
                    confidence=confidence,
                )
            )

        rendered = _render_text(request.template.text, slot_dicts, assignment)
        combined_confidence = round(
            sum(sf.confidence for sf in slot_fillings) / max(len(slot_fillings), 1),
            4,
        )

        fillings.append(
            MLMFillingResult(
                slot_fillings=slot_fillings,
                rendered_text=rendered,
                confidence=combined_confidence,
            )
        )

    return MLMFillResponse(
        fillings=fillings,
        model_used=model_name,
        note="Stub mode: transformers not installed. Install layers-sidecar[ml] for real MLM predictions.",
    )


async def _generate_real_fillings(
    request: MLMFillRequest,
    model_name: str,
    slot_dicts: list[dict[str, object]],
    masked_slots: list[str],
) -> MLMFillResponse:
    """
    Generate fillings using a real HuggingFace masked language model.

    For single-mask templates, returns top-k predictions directly.
    For multi-mask templates, fills iteratively in left-to-right order
    using greedy decoding.

    Parameters
    ----------
    request : MLMFillRequest
        Request containing template and masked positions.
    model_name : str
        HuggingFace model identifier to load.
    slot_dicts : list[dict[str, object]]
        Slot definitions with position information.
    masked_slots : list[str]
        Slot names to fill via MLM prediction.

    Returns
    -------
    MLMFillResponse
        Model-generated fillings with confidence scores.
    """
    try:
        fill_mask = hf_pipeline("fill-mask", model=model_name)
    except Exception:
        logger.exception("Failed to load MLM model %s; falling back to stub", model_name)
        return _generate_stub_fillings(request, model_name, slot_dicts, masked_slots)

    # Build masked text: replace masked slots with [MASK]
    masked_text = request.template.text
    sorted_slots = sorted(slot_dicts, key=lambda s: int(s["start"]), reverse=True)  # type: ignore[arg-type]
    for slot in sorted_slots:
        name = str(slot["name"])
        start = int(slot["start"])  # type: ignore[arg-type]
        end = int(slot["end"])  # type: ignore[arg-type]
        if name in masked_slots:
            masked_text = masked_text[:start] + fill_mask.tokenizer.mask_token + masked_text[end:]

    # Get predictions for each masked position
    # For simplicity, handle single-mask case; multi-mask requires iterative filling
    if len(masked_slots) == 1:
        try:
            predictions = fill_mask(masked_text, top_k=request.num_candidates)
            fillings: list[MLMFillingResult] = []

            for pred in predictions:
                token = pred["token_str"].strip()
                score = float(pred["score"])
                slot_name = masked_slots[0]

                assignment = {slot_name: token}
                rendered = _render_text(request.template.text, slot_dicts, assignment)

                fillings.append(
                    MLMFillingResult(
                        slot_fillings=[
                            MLMSlotFilling(slot_name=slot_name, value=token, confidence=score)
                        ],
                        rendered_text=rendered,
                        confidence=score,
                    )
                )

            return MLMFillResponse(fillings=fillings, model_used=model_name)
        except Exception:
            logger.exception("MLM prediction failed")
            return _generate_stub_fillings(request, model_name, slot_dicts, masked_slots)
    else:
        # Multi-mask: fill iteratively (greedy, left-to-right)
        fillings = []
        assignment: dict[str, str] = {}

        for slot_name in masked_slots:
            current_text = request.template.text
            for s in sorted(slot_dicts, key=lambda s: int(s["start"]), reverse=True):  # type: ignore[arg-type]
                sn = str(s["name"])
                st = int(s["start"])  # type: ignore[arg-type]
                en = int(s["end"])  # type: ignore[arg-type]
                if sn in assignment:
                    current_text = current_text[:st] + assignment[sn] + current_text[en:]
                elif sn == slot_name:
                    current_text = current_text[:st] + fill_mask.tokenizer.mask_token + current_text[en:]

            try:
                predictions = fill_mask(current_text, top_k=1)
                token = predictions[0]["token_str"].strip()
                assignment[slot_name] = token
            except Exception:
                assignment[slot_name] = "[unknown]"

        rendered = _render_text(request.template.text, slot_dicts, assignment)
        slot_fillings = [
            MLMSlotFilling(slot_name=sn, value=v, confidence=0.5) for sn, v in assignment.items()
        ]
        fillings.append(
            MLMFillingResult(
                slot_fillings=slot_fillings,
                rendered_text=rendered,
                confidence=0.5,
            )
        )

        return MLMFillResponse(fillings=fillings, model_used=model_name)
