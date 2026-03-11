"""Request/response models for CSP and MLM filling endpoints."""

from pydantic import BaseModel, Field


class TemplateSlot(BaseModel):
    """A named slot in a template with its text position."""

    name: str
    start: int = Field(description="Character offset of slot start in template text")
    end: int = Field(description="Character offset of slot end in template text")


class TemplateSpec(BaseModel):
    """Template with its text and slot definitions."""

    text: str = Field(description="Template text with placeholder markers")
    slots: list[TemplateSlot] = Field(description="Slot positions within the text")


class SlotEntry(BaseModel):
    """A candidate entry for a slot filling."""

    form: str
    lemma: str | None = None
    pos: str | None = None
    features: dict[str, str | list[str]] = Field(default_factory=dict)


class Constraint(BaseModel):
    """A constraint expression applied across slots."""

    expression: str = Field(description="Python expression using slot names as variables")
    expression_format: str = Field(
        default="python-expr",
        description="Constraint expression language",
    )


class CSPFillRequest(BaseModel):
    """Request body for the CSP filling endpoint."""

    template: TemplateSpec
    collections: dict[str, list[SlotEntry]] = Field(
        description="Mapping from slot name to candidate entries",
    )
    constraints: list[Constraint] = Field(default_factory=list)
    limit: int = Field(default=100, ge=1, le=10000, description="Max fillings to return")


class SlotFilling(BaseModel):
    """A single slot's chosen value in a filling."""

    slot_name: str
    value: str
    entry_index: int | None = Field(
        default=None,
        description="Index into the slot's collection (if from a collection)",
    )


class FillingResult(BaseModel):
    """A single valid filling of all slots."""

    slot_fillings: list[SlotFilling]
    rendered_text: str = Field(description="Template text with slots replaced by chosen values")
    violations: list[str] = Field(
        default_factory=list,
        description="Constraint violations (empty for valid fillings)",
    )


class CSPFillResponse(BaseModel):
    """Response from the CSP filling endpoint."""

    fillings: list[FillingResult] = Field(default_factory=list)
    total_found: int = Field(default=0, description="Total valid fillings found")
    solve_time_ms: float = Field(default=0.0, description="Time spent solving in milliseconds")


class MLMFillRequest(BaseModel):
    """Request body for the MLM filling endpoint."""

    template: TemplateSpec
    masked_positions: list[str] = Field(
        description="Slot names to fill via masked language modeling",
    )
    model: str | None = Field(default=None, description="HuggingFace model name (optional)")
    num_candidates: int = Field(default=5, ge=1, le=50, description="Candidates per slot")


class MLMSlotFilling(BaseModel):
    """A single slot's MLM prediction."""

    slot_name: str
    value: str
    confidence: float = Field(ge=0.0, le=1.0)


class MLMFillingResult(BaseModel):
    """A single MLM-generated filling."""

    slot_fillings: list[MLMSlotFilling]
    rendered_text: str
    confidence: float = Field(ge=0.0, le=1.0, description="Combined confidence score")


class MLMFillResponse(BaseModel):
    """Response from the MLM filling endpoint."""

    fillings: list[MLMFillingResult] = Field(default_factory=list)
    model_used: str = Field(description="Model name that was used")
    note: str | None = Field(
        default=None,
        description="Implementation note (e.g., stub mode)",
    )
