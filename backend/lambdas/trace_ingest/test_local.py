#!/usr/bin/env python3
"""
Local smoke test for traceIngestHandler — no AWS deploy required.

Usage (from this directory):
  TRACE_INGEST_API_KEY=test-secret SKIP_JUDGE=1 python test_local.py

With mocked Judge (still no real Bedrock call):
  TRACE_INGEST_API_KEY=test-secret python test_local.py --mock-judge

Requires: boto3 (same as repo backend).
"""

from __future__ import annotations

import json
import os
import sys
from unittest.mock import MagicMock, patch

# Ensure we import handler from this folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault("TRACE_INGEST_API_KEY", "test-secret")
os.environ.setdefault("SKIP_JUDGE", "1")
os.environ.setdefault("TRACES_TABLE_NAME", "glassbox-traces")
os.environ.setdefault("AWS_REGION", "us-west-2")

from handler import traceIngestHandler  # noqa: E402


def _sample_trace_body() -> dict:
    return {
        "session_id": "sess_testlocal01",
        "stadium_id": "wembley",
        "scenario": "normal",
        "step": 1,
        "agent": "manager",
        "timestamp": "2026-04-18T12:00:00Z",
        "observation": {
            "outside_temp_f": 72.0,
            "inside_temp_f": 74.0,
            "attendance": 50000,
            "grid_price_usd_mwh": 45.0,
            "grid_co2_g_kwh": 400.0,
            "hvac_state": "cooling_73",
            "lighting_state": "full",
        },
        "thought": "Comfort looks acceptable; minor cost trim.",
        "action": {"tool": "adjust_lighting", "args": {"level_0_to_100": 90, "zones": ["bowl"]}},
        "impact": {"dollars_delta": -2.5, "kwh_delta": -5.0, "kg_co2_delta": -1.2},
        "tokens": {"input": 100, "output": 50},
        "latency_ms": 1200,
        "guardrail_blocked": False,
        "guardrail_intervention": None,
    }


def _api_gateway_rest_event(body: dict) -> dict:
    return {
        "httpMethod": "POST",
        "headers": {"Content-Type": "application/json", "x-api-key": os.environ["TRACE_INGEST_API_KEY"]},
        "body": json.dumps(body),
        "isBase64Encoded": False,
    }


def main() -> None:
    mock_judge = "--mock-judge" in sys.argv
    if mock_judge:
        os.environ.pop("SKIP_JUDGE", None)

    table_mock = MagicMock()
    table_mock.put_item = MagicMock()

    def fake_resource(service_name: str, **kwargs):
        assert service_name == "dynamodb"
        r = MagicMock()
        r.Table.return_value = table_mock
        return r

    fake_bedrock_response = {
        "content": [
            {
                "type": "text",
                "text": json.dumps(
                    {
                        "judge_score": 8,
                        "judge_reasoning": "Lighting reduction is modest and occupancy remains safe.",
                        "severity": "info",
                        "regulations_cited": [
                            {
                                "code": "ASHRAE 55",
                                "title": "Thermal comfort",
                                "excerpt": "Maintain acceptable thermal conditions for occupants.",
                            }
                        ],
                    }
                ),
            }
        ]
    }

    body = _sample_trace_body()
    event = _api_gateway_rest_event(body)

    client_mock = MagicMock()
    client_mock.invoke_model.return_value = {
        "body": MagicMock(read=MagicMock(return_value=json.dumps(fake_bedrock_response).encode())),
    }

    with patch("handler.boto3.resource", side_effect=fake_resource):
        if mock_judge:
            with patch("handler.boto3.client", return_value=client_mock):
                resp = traceIngestHandler(event, None)
        else:
            resp = traceIngestHandler(event, None)

    print("statusCode:", resp.get("statusCode"))
    out = json.loads(resp["body"])
    print(json.dumps(out, indent=2))

    assert resp["statusCode"] == 200, out
    assert out.get("ok") is True
    assert out.get("trace_id", "").startswith("trc_")
    table_mock.put_item.assert_called_once()
    print("\nOK — handler returned 200 and called dynamodb put_item once.")


if __name__ == "__main__":
    main()
