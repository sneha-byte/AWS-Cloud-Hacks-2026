"""Small, safe calculator support for tool-enabled agents."""

from __future__ import annotations

import ast
import operator
import re
from typing import Any

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_ALLOWED_UNARYOPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}
_EXPRESSION_PATTERN = re.compile(
    r"(?<![\w.])(?:\d+(?:\.\d+)?(?:\s*[-+/*()%]\s*\d+(?:\.\d+)?)+)"
)


def _eval_node(node: ast.AST) -> float:
    """Recursively evaluate only the AST node types we explicitly allow."""
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_eval_node(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        return _ALLOWED_BINOPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    raise ValueError("Unsupported calculator expression")


def safe_calculate(expression: str) -> float:
    """Evaluate arithmetic without using Python's unsafe eval()."""
    parsed = ast.parse(expression, mode="eval")
    return _eval_node(parsed.body)


def extract_expression(text: str) -> str | None:
    """Pull the first arithmetic-like fragment out of a user request."""
    match = _EXPRESSION_PATTERN.search(text)
    return match.group(0).strip() if match else None


def maybe_calculate(text: str) -> dict[str, Any] | None:
    """Return a tool payload only when the input actually contains math."""
    expression = extract_expression(text)
    if not expression:
        return None

    result = safe_calculate(expression)
    return {
        "tool": "calculator",
        "expression": expression,
        "result": result,
    }
