"""Helpers for DynamoDB-compatible serialization."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


def to_dynamodb_item(value: Any) -> Any:
    """Convert Python values into DynamoDB-friendly types recursively."""
    if isinstance(value, dict):
        return {key: to_dynamodb_item(item) for key, item in value.items()}
    if isinstance(value, list):
        return [to_dynamodb_item(item) for item in value]
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, tuple):
        return [to_dynamodb_item(item) for item in value]
    return value


def from_dynamodb_item(value: Any) -> Any:
    """Convert DynamoDB Decimal-heavy responses back into normal Python values."""
    if isinstance(value, dict):
        return {key: from_dynamodb_item(item) for key, item in value.items()}
    if isinstance(value, list):
        return [from_dynamodb_item(item) for item in value]
    if isinstance(value, Decimal):
        if value == value.to_integral():
            return int(value)
        return float(value)
    return value
