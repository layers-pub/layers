"""jsPsych 7.x HTML generator for experiment previews.

Generates self-contained HTML documents with inline jsPsych library
loaded from CDN, trial definitions, and response collection.
"""

import html
import json

from sidecar.models.preview import PreviewRequest, PreviewResponse

# jsPsych 7.x CDN URLs
_JSPSYCH_CSS = "https://unpkg.com/jspsych@7.3.4/css/jspsych.css"
_JSPSYCH_JS = "https://unpkg.com/jspsych@7.3.4"
_JSPSYCH_HTML_KEYBOARD = f"{_JSPSYCH_JS}/plugin-html-keyboard-response.js"
_JSPSYCH_HTML_BUTTON = f"{_JSPSYCH_JS}/plugin-html-button-response.js"
_JSPSYCH_SURVEY_LIKERT = f"{_JSPSYCH_JS}/plugin-survey-likert.js"
_JSPSYCH_SURVEY_TEXT = f"{_JSPSYCH_JS}/plugin-survey-text.js"
_JSPSYCH_INSTRUCTIONS = f"{_JSPSYCH_JS}/plugin-instructions.js"


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
    """Build a single jsPsych trial object as a JavaScript string."""
    escaped_text = html.escape(stimulus_text)
    data_fields = {"trial_index": trial_index}
    if condition:
        data_fields["condition"] = condition
    if item_id:
        data_fields["item_id"] = item_id
    data_json = json.dumps(data_fields)

    if task_type == "forced-choice":
        choices = json.dumps(labels if labels else ["Accept", "Reject"])
        return f"""{{
      type: jsPsychHtmlButtonResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      choices: {choices},
      data: {data_json}
    }}"""

    if task_type == "binary":
        return f"""{{
      type: jsPsychHtmlButtonResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      choices: ["Yes", "No"],
      data: {data_json}
    }}"""

    if task_type == "ordinal-scale":
        lo = scale_min if scale_min is not None else 1
        hi = scale_max if scale_max is not None else 7
        scale_labels = [str(i) for i in range(lo, hi + 1)]
        return f"""{{
      type: jsPsychSurveyLikert,
      questions: [{{
        prompt: '<p style="font-size: 18px;">{escaped_text}</p>',
        labels: {json.dumps(scale_labels)},
        required: true
      }}],
      data: {data_json}
    }}"""

    if task_type == "magnitude":
        return f"""{{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>' +
        '<p>Type a number (0-100) and press Enter:</p>' +
        '<input type="number" id="magnitude-input" min="0" max="100" style="font-size: 16px; padding: 8px; width: 100px;" autofocus>',
      choices: ["Enter"],
      data: {data_json},
      on_finish: function(data) {{
        var input = document.getElementById("magnitude-input");
        data.response = input ? parseInt(input.value) : null;
      }}
    }}"""

    if task_type in ("free-text", "cloze"):
        return f"""{{
      type: jsPsychSurveyText,
      questions: [{{
        prompt: '<p style="font-size: 18px;">{escaped_text}</p>',
        required: true,
        rows: 2
      }}],
      data: {data_json}
    }}"""

    # Default: keyboard response
    return f"""{{
      type: jsPsychHtmlKeyboardResponse,
      stimulus: '<p style="font-size: 18px;">{escaped_text}</p>',
      choices: "ALL_KEYS",
      data: {data_json}
    }}"""


def generate_jspsych_preview(request: PreviewRequest) -> PreviewResponse:
    """Generate a self-contained jsPsych 7.x HTML document."""
    experiment = request.experiment
    fillings = request.sample_fillings[: request.count]

    # If no fillings provided, create placeholder trials
    if not fillings:
        from sidecar.models.preview import SampleFilling

        fillings = [
            SampleFilling(rendered_text=f"Sample stimulus {i + 1}")
            for i in range(min(request.count, 3))
        ]

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
    plugins = {_JSPSYCH_HTML_KEYBOARD, _JSPSYCH_INSTRUCTIONS}
    if experiment.task_type in ("forced-choice", "binary"):
        plugins.add(_JSPSYCH_HTML_BUTTON)
    if experiment.task_type == "ordinal-scale":
        plugins.add(_JSPSYCH_SURVEY_LIKERT)
    if experiment.task_type in ("free-text", "cloze"):
        plugins.add(_JSPSYCH_SURVEY_TEXT)

    plugin_scripts = "\n    ".join(f'<script src="{url}"></script>' for url in sorted(plugins))

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
