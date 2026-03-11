"""
Request/response models for CSP and MLM filling endpoints.
"""

from pydantic import BaseModel, Field


class TemplateSlot(BaseModel):
    """
    A named slot in a template with its text position.

    Attributes
    ----------
    name : str
        Slot identifier.
    start : int
        Character offset of slot start in template text.
    end : int
        Character offset of slot end in template text.
    """

    name: str
    start: int = Field(description="Character offset of slot start in template text")
    end: int = Field(description="Character offset of slot end in template text")


class TemplateSpec(BaseModel):
    """
    Template with its text and slot definitions.

    Attributes
    ----------
    text : str
        Template text with placeholder markers.
    slots : list[TemplateSlot]
        Slot positions within the text.
    """

    text: str = Field(description="Template text with placeholder markers")
    slots: list[TemplateSlot] = Field(description="Slot positions within the text")


class SlotEntry(BaseModel):
    """
    A candidate entry for a slot filling.

    Attributes
    ----------
    form : str
        Surface form of the candidate.
    lemma : str or None
        Lemma (base form), if available.
    pos : str or None
        Part of speech, if available.
    features : dict[str, str | list[str]]
        Additional features for the candidate entry.
    """

    form: str
    lemma: str | None = None
    pos: str | None = None
    features: dict[str, str | list[str]] = Field(default_factory=dict)


class Constraint(BaseModel):
    """
    A constraint expression applied across slots.

    Attributes
    ----------
    expression : str
        Python expression using slot names as variables.
    expression_format : str
        Constraint expression language, by default ``"python-expr"``.
    """

    expression: str = Field(description="Python expression using slot names as variables")
    expression_format: str = Field(
        default="python-expr",
        description="Constraint expression language",
    )


class CSPFillRequest(BaseModel):
    """
    Request body for the CSP filling endpoint.

    Attributes
    ----------
    template : TemplateSpec
        Template definition with text and slots.
    collections : dict[str, list[SlotEntry]]
        Mapping from slot name to candidate entries.
    constraints : list[Constraint]
        Constraint expressions to satisfy.
    limit : int
        Maximum fillings to return, by default 100.
    """

    template: TemplateSpec
    collections: dict[str, list[SlotEntry]] = Field(
        description="Mapping from slot name to candidate entries",
    )
    constraints: list[Constraint] = Field(default_factory=list)
    limit: int = Field(default=100, ge=1, le=10000, description="Max fillings to return")


class SlotFilling(BaseModel):
    """
    A single slot's chosen value in a filling.

    Attributes
    ----------
    slot_name : str
        Name of the filled slot.
    value : str
        Chosen value for the slot.
    entry_index : int or None
        Index into the slot's collection, if the value came from a collection.
    """

    slot_name: str
    value: str
    entry_index: int | None = Field(
        default=None,
        description="Index into the slot's collection (if from a collection)",
    )


class FillingResult(BaseModel):
    """
    A single valid filling of all slots.

    Attributes
    ----------
    slot_fillings : list[SlotFilling]
        Per-slot value assignments.
    rendered_text : str
        Template text with slots replaced by chosen values.
    violations : list[str]
        Constraint violations (empty for valid fillings).
    """

    slot_fillings: list[SlotFilling]
    rendered_text: str = Field(description="Template text with slots replaced by chosen values")
    violations: list[str] = Field(
        default_factory=list,
        description="Constraint violations (empty for valid fillings)",
    )


class CSPFillResponse(BaseModel):
    """
    Response from the CSP filling endpoint.

    Attributes
    ----------
    fillings : list[FillingResult]
        Valid slot fillings found by the solver.
    total_found : int
        Total number of valid fillings found.
    solve_time_ms : float
        Time spent solving in milliseconds.
    """

    fillings: list[FillingResult] = Field(default_factory=list)
    total_found: int = Field(default=0, description="Total valid fillings found")
    solve_time_ms: float = Field(default=0.0, description="Time spent solving in milliseconds")


class MLMFillRequest(BaseModel):
    """
    Request body for the MLM filling endpoint.

    Attributes
    ----------
    template : TemplateSpec
        Template definition with text and slots.
    masked_positions : list[str]
        Slot names to fill via masked language modeling.
    model : str or None
        HuggingFace model name (optional, defaults to config setting).
    num_candidates : int
        Number of candidates per slot, by default 5.
    """

    template: TemplateSpec
    masked_positions: list[str] = Field(
        description="Slot names to fill via masked language modeling",
    )
    model: str | None = Field(default=None, description="HuggingFace model name (optional)")
    num_candidates: int = Field(default=5, ge=1, le=50, description="Candidates per slot")


class MLMSlotFilling(BaseModel):
    """
    A single slot's MLM prediction.

    Attributes
    ----------
    slot_name : str
        Name of the filled slot.
    value : str
        Predicted token value.
    confidence : float
        Model confidence score between 0.0 and 1.0.
    """

    slot_name: str
    value: str
    confidence: float = Field(ge=0.0, le=1.0)


class MLMFillingResult(BaseModel):
    """
    A single MLM-generated filling.

    Attributes
    ----------
    slot_fillings : list[MLMSlotFilling]
        Per-slot predictions with confidence scores.
    rendered_text : str
        Template text with slots replaced by predicted values.
    confidence : float
        Combined confidence score between 0.0 and 1.0.
    """

    slot_fillings: list[MLMSlotFilling]
    rendered_text: str
    confidence: float = Field(ge=0.0, le=1.0, description="Combined confidence score")


class MLMFillResponse(BaseModel):
    """
    Response from the MLM filling endpoint.

    Attributes
    ----------
    fillings : list[MLMFillingResult]
        MLM-generated fillings.
    model_used : str
        Model name that was used for predictions.
    note : str or None
        Implementation note (e.g., stub mode indicator).
    """

    fillings: list[MLMFillingResult] = Field(default_factory=list)
    model_used: str = Field(description="Model name that was used")
    note: str | None = Field(
        default=None,
        description="Implementation note (e.g., stub mode)",
    )
