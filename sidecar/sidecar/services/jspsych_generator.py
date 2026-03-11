"""
jsPsych 8.x HTML generator for experiment previews.

Generates self-contained HTML documents with jsPsych 8 loaded from CDN
via script tags (UMD builds), trial definitions, and response collection.
"""

import html
import json

from sidecar.models.preview import PreviewRequest, PreviewResponse

# jsPsych 8.x CDN URLs (jsDelivr UMD builds)
_JSPSYCH_VERSION = "8.0.2"
_JSPSYCH_CSS = f"https://cdn.jsdelivr.net/npm/jspsych@{_JSPSYCH_VERSION}/css/jspsych.css"
_JSPSYCH_JS = f"https://cdn.jsdelivr.net/npm/jspsych@{_JSPSYCH_VERSION}/dist/index.browser.min.js"

# Plugin CDN URLs (UMD builds expose global names like jsPsychHtmlKeyboardResponse)
_PLUGIN_BASE = "https://cdn.jsdelivr.net/npm"
_PLUGIN_HTML_KEYBOARD = (
    f"{_PLUGIN_BASE}/@jspsych/plugin-html-keyboard-response@2.0.1"
    "/dist/index.browser.min.js"
)
_PLUGIN_HTML_SLIDER = (
    f"{_PLUGIN_BASE}/@jspsych/plugin-html-slider-response@2.0.1"
    "/dist/index.browser.min.js"
)
_PLUGIN_SURVEY_TEXT = (
    f"{_PLUGIN_BASE}/@jspsych/plugin-survey-text@2.0.1"
    "/dist/index.browser.min.js"
)
_PLUGIN_CLOZE = (
    f"{_PLUGIN_BASE}/@jspsych/plugin-cloze@2.0.1"
    "/dist/index.browser.min.js"
)
_PLUGIN_INSTRUCTIONS = (
    f"{_PLUGIN_BASE}/@jspsych/plugin-instructions@2.0.1"
    "/dist/index.browser.min.js"
)


def _build_trial_js(
    task_type: str,
    stimulus_text: str,
    labels: list[str],
    scale_min: int | None,
    scale_max: int | None,
    trial_index: int,
    condition: str | None,
    item_id: str | None,
) -> str:
    """
    Build a single jsPsych 8.x trial object as a JavaScript string.

    Parameters
    ----------
    task_type : str
        Trial type (e.g., ``"forced-choice"``, ``"binary"``,
        ``"ordinal-scale"``, ``"magnitude"``, ``"free-text"``,
        ``"cloze"``).
    stimulus_text : str
        Stimulus text to display.
    labels : list[str]
        Response labels (for forced-choice tasks).
    scale_min : int or None
        Minimum scale value (ordinal-scale tasks).
    scale_max : int or None
        Maximum scale value (ordinal-scale tasks).
    trial_index : int
        Zero-based index of this trial.
    condition : str or None
        Experimental condition label, if any.
    item_id : str or None
        Item identifier, if any.

    Returns
    -------
    str
        JavaScript object literal for the trial definition.
    """
    escaped_text = html.escape(stimulus_text)
    data_fields: dict[str, str | int] = {"trial_index": trial_index}
    if condition:
        data_fields["condition"] = condition
    if item_id:
        data_fields["item_id"] = item_id
    data_json = json.dumps(data_fields)

    if task_type == "forced-choice":
        choices = json.dumps(labels if labels else ["Accept", "Reject"])
        return f"""{{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>' +
        '<p>Press the key corresponding to your choice:</p>' +
        '<p>{html.escape(" / ".join(labels if labels else ["Accept (a)", "Reject (r)"]))}</p>',
      choices: {json.dumps([l[0].lower() for l in (labels if labels else ["Accept", "Reject"])])},
      data: {data_json},
      on_finish: function(data) {{
        var choiceMap = {choices};
        var keyIndex = {json.dumps([l[0].lower() for l in (labels if labels else ["Accept", "Reject"])])}.indexOf(data.response);
        data.choice = keyIndex >= 0 ? choiceMap[keyIndex] : data.response;
      }}
    }}"""

    if task_type == "binary":
        return f"""{{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>' +
        '<p>Press <b>y</b> for Yes or <b>n</b> for No</p>',
      choices: ["y", "n"],
      data: {data_json},
      on_finish: function(data) {{
        data.choice = data.response === "y" ? "Yes" : "No";
      }}
    }}"""

    if task_type == "ordinal-scale":
        lo = scale_min if scale_min is not None else 1
        hi = scale_max if scale_max is not None else 7
        return f"""{{
      type: jsPsychHtmlSliderResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      min: {lo},
      max: {hi},
      step: 1,
      slider_start: {(lo + hi) // 2},
      labels: ["{lo}", "{hi}"],
      require_movement: true,
      data: {data_json}
    }}"""

    if task_type == "magnitude":
        return f"""{{
      type: jsPsychHtmlSliderResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      min: 0,
      max: 100,
      step: 1,
      slider_start: 50,
      labels: ["0", "50", "100"],
      require_movement: true,
      data: {data_json}
    }}"""

    if task_type == "free-text":
        return f"""{{
      type: jsPsychSurveyText,
      questions: [{{
        prompt: '<p style="font-size: 18px;">{escaped_text}</p>',
        required: true,
        rows: 2
      }}],
      data: {data_json}
    }}"""

    if task_type == "cloze":
        # The cloze plugin expects blanks marked with %% in the text
        cloze_text = escaped_text.replace("___", "%%").replace("____", "%%")
        return f"""{{
      type: jsPsychCloze,
      text: '<p style="font-size: 18px;">{cloze_text}</p>',
      check_answers: false,
      data: {data_json}
    }}"""

    # Default: keyboard response
    return f"""{{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      choices: "ALL_KEYS",
      data: {data_json}
    }}"""


def _no_fillings_html(title: str, instructions: str) -> str:
    """
    Generate an HTML page explaining that sample fillings are needed.

    Parameters
    ----------
    title : str
        Experiment title for the page heading.
    instructions : str
        Experiment instructions to display.

    Returns
    -------
    str
        Self-contained HTML document with a message page.
    """
    escaped_title = html.escape(title)
    escaped_instructions = html.escape(instructions)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escaped_title} - Preview</title>
    <style>
      body {{
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #f5f5f5;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
        box-sizing: border-box;
      }}
      .message-container {{
        max-width: 600px;
        background: white;
        border-radius: 8px;
        padding: 40px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        text-align: center;
      }}
      h2 {{ color: #333; margin-bottom: 16px; }}
      p {{ color: #666; line-height: 1.6; }}
      .instructions {{ font-style: italic; color: #888; margin-top: 24px; }}
    </style>
</head>
<body>
  <div class="message-container">
    <h2>{escaped_title}</h2>
    <p>No sample fillings provided for preview.</p>
    <p>To generate an interactive experiment preview, provide at least one
    sample filling with rendered stimulus text.</p>
    <div class="instructions">
      <p><strong>Experiment instructions:</strong></p>
      <p>{escaped_instructions}</p>
    </div>
  </div>
</body>
</html>"""


def generate_jspsych_preview(request: PreviewRequest) -> PreviewResponse:
    """
    Generate a self-contained jsPsych 8.x HTML document.

    If no sample fillings are provided, returns a message page instead
    of an interactive experiment.

    Parameters
    ----------
    request : PreviewRequest
        Experiment spec, sample fillings, and desired trial count.

    Returns
    -------
    PreviewResponse
        Contains the full HTML document string and the number of trials.
    """
    experiment = request.experiment
    fillings = request.sample_fillings[: request.count]

    # If no fillings provided, return a message page instead of fake trials
    if not fillings:
        return PreviewResponse(
            html=_no_fillings_html(experiment.title, experiment.instructions),
            trial_count=0,
        )

    # Build trial JavaScript
    trials_js_parts: list[str] = []
    for i, filling in enumerate(fillings):
        trial_js = _build_trial_js(
            task_type=experiment.task_type,
            stimulus_text=filling.rendered_text,
            labels=experiment.labels,
            scale_min=experiment.scale_min,
            scale_max=experiment.scale_max,
            trial_index=i,
            condition=filling.condition,
            item_id=filling.item_id,
        )
        trials_js_parts.append(trial_js)

    trials_js = ",\n    ".join(trials_js_parts)
    escaped_instructions = html.escape(experiment.instructions)
    escaped_title = html.escape(experiment.title)

    # Determine which plugins to include
    plugins: set[str] = {_PLUGIN_HTML_KEYBOARD, _PLUGIN_INSTRUCTIONS}
    if experiment.task_type in ("forced-choice", "binary"):
        # forced-choice and binary use keyboard response (already included)
        pass
    if experiment.task_type in ("ordinal-scale", "magnitude"):
        plugins.add(_PLUGIN_HTML_SLIDER)
    if experiment.task_type == "free-text":
        plugins.add(_PLUGIN_SURVEY_TEXT)
    if experiment.task_type == "cloze":
        plugins.add(_PLUGIN_CLOZE)

    plugin_scripts = "\n    ".join(
        f'<script src="{url}"></script>' for url in sorted(plugins)
    )

    html_doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{escaped_title}</title>
    <link rel="stylesheet" href="{_JSPSYCH_CSS}">
    <script src="{_JSPSYCH_JS}"></script>
    {plugin_scripts}
    <style>
      body {{
        background-color: #f5f5f5;
      }}
      .jspsych-content {{
        max-width: 800px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }}
      .jspsych-btn {{
        font-size: 16px;
        padding: 10px 24px;
        margin: 8px;
        border-radius: 6px;
        border: 1px solid #ccc;
        background: white;
        cursor: pointer;
      }}
      .jspsych-btn:hover {{
        background: #e8e8e8;
      }}
    </style>
</head>
<body>
<script>
  var jsPsych = initJsPsych({{
    on_finish: function() {{
      jsPsych.data.displayData();
    }}
  }});

  var instructions = {{
    type: jsPsychInstructions,
    pages: [
      '<h2>{escaped_title}</h2>' +
      '<p style="font-size: 16px;">{escaped_instructions}</p>' +
      '<p>Press Next to begin.</p>'
    ],
    show_clickable_nav: true
  }};

  var trials = [
    {trials_js}
  ];

  var debrief = {{
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<h2>Thank you!</h2>' +
      '<p>The experiment preview is complete.</p>' +
      '<p>Press any key to see the collected data.</p>'
  }};

  var timeline = [instructions, ...trials, debrief];
  jsPsych.run(timeline);
</script>
</body>
</html>"""

    return PreviewResponse(
        html=html_doc,
        trial_count=len(fillings),
    )
