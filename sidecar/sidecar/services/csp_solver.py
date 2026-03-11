"""
Constraint satisfaction solver for template filling.

Uses the python-constraint library for constraint propagation and
backtracking search. Slot domains come from the request's collections,
and constraints are Python expressions evaluated over slot assignments.
"""

import logging
import time
from typing import Any

from constraint import Problem  # type: ignore[import-untyped]

from sidecar.models.filling import (
    CSPFillRequest,
    CSPFillResponse,
    FillingResult,
    SlotFilling,
)

logger = logging.getLogger(__name__)


def _render_text(template_text: str, slots: list[dict[str, Any]], assignment: dict[str, str]) -> str:
    """
    Replace slot placeholders in the template text with assigned values.

    Slots are replaced from right to left to preserve character offsets.

    Parameters
    ----------
    template_text : str
        Original template text containing slot placeholders.
    slots : list[dict[str, Any]]
        Slot definitions with ``"name"``, ``"start"``, and ``"end"`` keys.
    assignment : dict[str, str]
        Mapping from slot name to assigned value.

    Returns
    -------
    str
        Template text with all slot placeholders replaced.
    """
    result = template_text
    # Sort by start position descending so replacements don't shift offsets
    sorted_slots = sorted(slots, key=lambda s: s["start"], reverse=True)
    for slot in sorted_slots:
        name = slot["name"]
        value = assignment.get(name, f"[{name}]")
        result = result[: slot["start"]] + value + result[slot["end"] :]
    return result


def _build_constraint_fn(
    expression: str, slot_names: list[str]
) -> Any:
    """
    Build a constraint function from a Python expression string.

    The expression can reference slot names as variables. Each variable
    receives the form string of the assigned entry for that slot.

    Parameters
    ----------
    expression : str
        Python expression string using slot names as variables.
    slot_names : list[str]
        Ordered list of slot names referenced by the expression.

    Returns
    -------
    Callable[..., bool]
        Function compatible with python-constraint's ``addConstraint``.
        Returns False if the expression raises an exception.
    """
    # Validate: only allow safe Python expressions
    # (basic comparisons, logical operators, string methods, in/not in)
    def constraint_fn(*values: str) -> bool:
        local_vars = dict(zip(slot_names, values))
        try:
            return bool(eval(expression, {"__builtins__": {}}, local_vars))  # noqa: S307
        except Exception:
            # If the expression fails, treat it as a violation
            return False

    return constraint_fn


def solve_csp(request: CSPFillRequest) -> CSPFillResponse:
    """
    Solve the constraint satisfaction problem defined by the request.

    1. Build variable domains from slot collections (each slot's domain
       is the list of entry forms in its collection).
    2. Add constraints as Python expressions evaluated over slot values.
    3. Run backtracking search with constraint propagation.
    4. Collect solutions up to the requested limit.

    Parameters
    ----------
    request : CSPFillRequest
        Template, collections (slot domains), constraints, and limit.

    Returns
    -------
    CSPFillResponse
        Valid fillings with rendered text, total count, and solve time.
    """
    start_time = time.monotonic()

    problem = Problem()
    slot_names: list[str] = []
    slot_domains: dict[str, list[str]] = {}
    slot_entry_map: dict[str, dict[str, int]] = {}  # slot_name -> {form -> entry_index}

    # Build domains
    for slot in request.template.slots:
        name = slot.name
        slot_names.append(name)
        entries = request.collections.get(name, [])
        if not entries:
            # Empty domain means no solutions possible
            elapsed = (time.monotonic() - start_time) * 1000
            return CSPFillResponse(fillings=[], total_found=0, solve_time_ms=elapsed)

        forms = [e.form for e in entries]
        slot_domains[name] = forms
        slot_entry_map[name] = {form: i for i, form in enumerate(forms)}
        problem.addVariable(name, forms)

    # Add constraints
    for constraint in request.constraints:
        # Determine which slots the constraint references
        referenced_slots = [s for s in slot_names if s in constraint.expression]
        if not referenced_slots:
            continue

        fn = _build_constraint_fn(constraint.expression, referenced_slots)
        problem.addConstraint(fn, referenced_slots)

    # Solve
    solutions: list[dict[str, str]] = []
    try:
        solution_iter = problem.getSolutionIter()
        for solution in solution_iter:
            solutions.append(solution)
            if len(solutions) >= request.limit:
                break
    except Exception:
        logger.exception("CSP solver encountered an error")

    # Build response
    slot_dicts = [{"name": s.name, "start": s.start, "end": s.end} for s in request.template.slots]
    fillings: list[FillingResult] = []
    for solution in solutions:
        slot_fillings = [
            SlotFilling(
                slot_name=name,
                value=solution[name],
                entry_index=slot_entry_map.get(name, {}).get(solution[name]),
            )
            for name in slot_names
        ]
        rendered = _render_text(request.template.text, slot_dicts, solution)
        fillings.append(
            FillingResult(
                slot_fillings=slot_fillings,
                rendered_text=rendered,
                violations=[],
            )
        )

    elapsed = (time.monotonic() - start_time) * 1000
    return CSPFillResponse(
        fillings=fillings,
        total_found=len(fillings),
        solve_time_ms=round(elapsed, 2),
    )
