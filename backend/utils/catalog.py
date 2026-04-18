"""Agent catalog loading and request expansion."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

CATALOG_PATH = Path(__file__).resolve().parents[1] / "models" / "agent_config.json"


def load_agent_catalog() -> list[dict[str, Any]]:
    """Load the configured fleet of agents from the shared catalog file."""
    with CATALOG_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    # The loader accepts either a bare list or {"agents": [...]} so the
    # catalog format can evolve without forcing every caller to change.
    if isinstance(payload, dict):
        return payload.get("agents", [])
    return payload


def expand_agent_requests(query: str, execution_id: str) -> list[dict[str, Any]]:
    """Turn one user query into the per-agent payloads Step Functions maps over."""
    requests: list[dict[str, Any]] = []
    for agent in load_agent_catalog():
        requests.append(
            {
                "execution_id": execution_id,
                "query": query,
                "agent": agent,
            }
        )
    return requests
