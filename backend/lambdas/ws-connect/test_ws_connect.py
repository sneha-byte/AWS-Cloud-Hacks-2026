"""
Test script for wsConnectHandler Lambda function.
Tests WebSocket connection establishment and DynamoDB storage.

Run with: python test_ws_connect.py
"""
import json
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

# Set environment variables BEFORE importing index
os.environ["WS_CONNECTIONS_TABLE"] = "ws-connections-test"
os.environ["AWS_REGION"] = "us-west-2"

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(__file__))

import index


def create_websocket_connect_event(connection_id, session_id):
    """Create a mock API Gateway WebSocket $connect event."""
    return {
        "requestContext": {
            "connectionId": connection_id,
            "eventType": "CONNECT",
            "messageDirection": "IN",
            "disconnectType": "Client-initiated close",
            "disconnectReason": "Client-initiated close"
        },
        "queryStringParameters": {
            "session_id": session_id
        },
        "isBase64Encoded": False
    }


def test_successful_connection():
    """Test successful WebSocket connection."""
    print("=" * 60)
    print("TEST 1: Successful WebSocket Connection")
    print("=" * 60)
    
    connection_id = "abc123def456"
    session_id = "sess_01HXYZ789"
    
    event = create_websocket_connect_event(connection_id, session_id)
    
    # Mock DynamoDB table
    mock_table = MagicMock()
    mock_table.put_item = MagicMock()
    
    with patch("index.get_table", return_value=mock_table):
        response = index.lambda_handler(event, None)
    
    # Assertions
    assert response["statusCode"] == 200, f"Expected 200, got {response['statusCode']}"
    assert "connected" in response["body"], "Response should contain 'connected'"
    
    # Verify put_item was called
    assert mock_table.put_item.called, "DynamoDB put_item should have been called"
    call_args = mock_table.put_item.call_args
    
    item = call_args[1]["Item"]
    assert item["connection_id"] == connection_id, f"connection_id mismatch: {item}"
    assert item["session_id"] == session_id, f"session_id mismatch: {item}"
    assert "connected_at" in item, "Item should have connected_at timestamp"
    assert "ttl" in item, "Item should have ttl for auto-cleanup"
    
    print(f"✓ Connection stored successfully")
    print(f"  - Connection ID: {item['connection_id']}")
    print(f"  - Session ID: {item['session_id']}")
    print(f"  - Connected At: {item['connected_at']}")
    print(f"  - TTL: {item['ttl']} (expires in ~24h)")
    print()


def test_missing_session_id():
    """Test error handling when session_id is missing."""
    print("=" * 60)
    print("TEST 2: Missing session_id in Query Parameters")
    print("=" * 60)
    
    connection_id = "abc123def456"
    
    event = {
        "requestContext": {
            "connectionId": connection_id,
        },
        "queryStringParameters": None  # No session_id
    }
    
    mock_table = MagicMock()
    
    with patch("index.get_table", return_value=mock_table):
        response = index.lambda_handler(event, None)
    
    # Assertions
    assert response["statusCode"] == 400, f"Expected 400, got {response['statusCode']}"
    assert "session_id required" in response["body"], "Should indicate session_id is required"
    assert not mock_table.put_item.called, "DynamoDB put_item should NOT have been called"
    
    print(f"✓ Correctly rejected connection without session_id")
    print(f"  - Status: {response['statusCode']}")
    print(f"  - Error: {response['body']}")
    print()


def test_empty_query_parameters():
    """Test error handling with empty query parameters."""
    print("=" * 60)
    print("TEST 3: Empty Query Parameters")
    print("=" * 60)
    
    connection_id = "abc123def456"
    
    event = {
        "requestContext": {
            "connectionId": connection_id,
        },
        "queryStringParameters": {}  # Empty dict
    }
    
    mock_table = MagicMock()
    
    with patch("index.get_table", return_value=mock_table):
        response = index.lambda_handler(event, None)
    
    # Assertions
    assert response["statusCode"] == 400, f"Expected 400, got {response['statusCode']}"
    assert not mock_table.put_item.called, "DynamoDB put_item should NOT have been called"
    
    print(f"✓ Correctly rejected connection with empty query params")
    print(f"  - Status: {response['statusCode']}")
    print()


def test_ttl_calculation():
    """Test that TTL is calculated correctly (24 hours in future)."""
    print("=" * 60)
    print("TEST 4: TTL Calculation (24-hour expiry)")
    print("=" * 60)
    
    connection_id = "xyz789abc123"
    session_id = "sess_02HXYZ789"
    
    event = create_websocket_connect_event(connection_id, session_id)
    
    mock_table = MagicMock()
    mock_table.put_item = MagicMock()
    
    now = datetime.utcnow()
    expected_ttl_min = int((now + timedelta(hours=23.9)).timestamp())
    expected_ttl_max = int((now + timedelta(hours=24.1)).timestamp())
    
    with patch("index.get_table", return_value=mock_table):
        response = index.lambda_handler(event, None)
    
    call_args = mock_table.put_item.call_args
    item = call_args[1]["Item"]
    ttl = item["ttl"]
    
    assert expected_ttl_min <= ttl <= expected_ttl_max, \
        f"TTL {ttl} not in range [{expected_ttl_min}, {expected_ttl_max}]"
    
    hours_until_expiry = (ttl - int(now.timestamp())) / 3600
    print(f"✓ TTL calculated correctly")
    print(f"  - TTL Timestamp: {ttl}")
    print(f"  - Hours until expiry: {hours_until_expiry:.1f}h")
    print()


def test_exception_handling():
    """Test error handling when DynamoDB fails."""
    print("=" * 60)
    print("TEST 5: Exception Handling (DynamoDB Error)")
    print("=" * 60)
    
    connection_id = "abc123def456"
    session_id = "sess_01HXYZ789"
    
    event = create_websocket_connect_event(connection_id, session_id)
    
    mock_table = MagicMock()
    mock_table.put_item.side_effect = Exception("DynamoDB connection failed")
    
    with patch("index.get_table", return_value=mock_table):
        response = index.lambda_handler(event, None)
    
    # Assertions
    assert response["statusCode"] == 500, f"Expected 500, got {response['statusCode']}"
    assert "error" in response["body"].lower(), "Response should contain error message"
    
    print(f"✓ Correctly handled DynamoDB exception")
    print(f"  - Status: {response['statusCode']}")
    print(f"  - Error: DynamoDB connection failed")
    print()


def test_multiple_connections_same_session():
    """Test that multiple connections can join the same session."""
    print("=" * 60)
    print("TEST 6: Multiple Connections to Same Session")
    print("=" * 60)
    
    session_id = "sess_01HXYZ789"
    
    mock_table = MagicMock()
    mock_table.put_item = MagicMock()
    
    # Simulate 3 clients connecting to the same session
    for i in range(3):
        connection_id = f"connection_{i}"
        event = create_websocket_connect_event(connection_id, session_id)
        
        with patch("index.get_table", return_value=mock_table):
            response = index.lambda_handler(event, None)
            assert response["statusCode"] == 200
    
    # Verify all 3 put_item calls were made
    assert mock_table.put_item.call_count == 3, "Should have 3 put_item calls"
    
    print(f"✓ Multiple connections to same session handled correctly")
    print(f"  - Connections created: {mock_table.put_item.call_count}")
    print(f"  - Session ID (shared): {session_id}")
    print()


def run_all_tests():
    """Run all test cases."""
    print("\n")
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 58 + "║")
    print("║  wsConnectHandler Lambda Function Test Suite".ljust(59) + "║")
    print("║" + " " * 58 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    try:
        test_successful_connection()
        test_missing_session_id()
        test_empty_query_parameters()
        test_ttl_calculation()
        test_exception_handling()
        test_multiple_connections_same_session()
        
        print("=" * 60)
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        print()
        return True
    
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"✗ TEST FAILED: {str(e)}")
        print("=" * 60)
        print()
        return False
    
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ UNEXPECTED ERROR: {str(e)}")
        print("=" * 60)
        print()
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
