"""Request/response models for the jsPsych preview endpoint."""

from typing import Any

from pydantic import BaseModel, Field


class ExperimentSpec(BaseModel):
    """Experiment definition for jsPsych preview generation."""

    title: str = Field(default="Experiment Preview", description="Experiment title")
    task_type: str = Field(
        default="forced-choice",
        description="Task type: forced-choice, ordinal-scale, magnitude, binary, free-text, cloze",
    )
    labels: list[str] = Field(
        default_factory=list,
        description="Response labels (for forced-choice or ordinal-scale)",
    )
    scale_min: int | None = Field(default=None, description="Scale minimum (ordinal-scale)")
    scale_max: int | None = Field(default=None, description="Scale maximum (ordinal-scale)")
    instructions: str = Field(
        default="Please respond to each item.",
        description="Participant instructions",
    )
    presentation_method: str = Field(
        default="whole-sentence",
        description="Stimulus presentation: whole-sentence, self-paced, rsvp",
    )
    timing_ms: int | None = Field(default=None, description="Timing per chunk (rsvp, masked-priming)")
    isi_ms: int | None = Field(default=None, description="Inter-stimulus interval (rsvp)")


class SampleFilling(BaseModel):
    """A sample stimulus filling for the preview."""

    rendered_text: str = Field(description="The filled stimulus text")
    condition: str | None = Field(default=None, description="Experimental condition label")
    item_id: str | None = Field(default=None, description="Item identifier")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Additional trial metadata")


class PreviewRequest(BaseModel):
    """Request body for the jsPsych preview endpoint."""

    experiment: ExperimentSpec
    sample_fillings: list[SampleFilling] = Field(
        default_factory=list,
        description="Stimuli to include in the preview",
    )
    count: int = Field(default=5, ge=1, le=100, description="Number of trials to generate")


class PreviewResponse(BaseModel):
    """Response from the jsPsych preview endpoint."""

    html: str = Field(description="Self-contained jsPsych 7.x HTML document")
    trial_count: int = Field(description="Number of trials in the generated experiment")
