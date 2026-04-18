"""Structured logging and trace helpers."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any


def get_logger(name: str) -> logging.Logger:
    """Create a simple structured logger that emits JSON-friendly lines."""
    logger = logging.getLogger(f"agentscope.{name}")
    if logger.handlers:
        return logger

    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger


def utc_now() -> str:
    """Return an ISO-8601 UTC timestamp for traces and logs."""
    return datetime.now(timezone.utc).isoformat()


def _make_json_safe(value: Any) -> Any:
    """Convert nested Python values into shapes that JSON/logging can serialize."""
    if isinstance(value, dict):
        return {str(key): _make_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_make_json_safe(item) for item in value]
    if isinstance(value, set):
        return sorted(_make_json_safe(item) for item in value)
    return value


def build_trace(*, execution_id: str, agent_id: str, query: str, agent_type: str) -> dict[str, Any]:
    """Create the base trace envelope that later steps append into."""
    return {
        "execution_id": execution_id,
        "agent_id": agent_id,
        "agent_type": agent_type,
        "query": query,
        "created_at": utc_now(),
        "steps": [],
    }


def append_trace_step(trace: dict[str, Any], step_type: str, **payload: Any) -> None:
    """Append one normalized step so every trace has the same basic shape."""
    trace.setdefault("steps", []).append(
        {
            "type": step_type,
            "timestamp": utc_now(),
            **_make_json_safe(payload),
        }
    )


def log_event(logger: logging.Logger, message: str, **payload: Any) -> None:
    """Emit one structured log line for CloudWatch consumption."""
    record = {"message": message, **_make_json_safe(payload)}
    logger.info(json.dumps(record, default=str))
