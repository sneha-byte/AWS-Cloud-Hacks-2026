"""
wsConnectHandler — API Gateway WebSocket $connect route
Stores the connection_id + session_id in DynamoDB for broadcasting.
"""
import json
import boto3
import os
from datetime import datetime, timedelta

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))

# Lazy initialization for testability
_table = None


def get_table():
    """Get the DynamoDB table (lazy initialization for testing)."""
    global _table
    if _table is None:
        _table = dynamodb.Table(os.environ["WS_CONNECTIONS_TABLE"])
    return _table


def lambda_handler(event, context):
    """
    Handle WebSocket connection establishment.
    
    Event context contains:
    - requestContext.connectionId: unique WebSocket connection ID
    - queryStringParameters.session_id: session ID to filter traces
    
    Stores connection_id + session_id with TTL for cleanup.
    """
    try:
        # Extract connection ID from WebSocket context
        connection_id = event["requestContext"]["connectionId"]
        
        # Extract session_id from query parameters
        query_params = event.get("queryStringParameters") or {}
        session_id = query_params.get("session_id")
        
        if not session_id:
            print(f"Connection {connection_id}: no session_id in query params")
            return {"statusCode": 400, "body": json.dumps({"error": "session_id required"})}
        
        # Calculate TTL: 24 hours from now (for auto-cleanup of abandoned connections)
        ttl = int((datetime.utcnow() + timedelta(hours=24)).timestamp())
        
        # Write to DynamoDB
        table = get_table()
        table.put_item(
            Item={
                "connection_id": connection_id,
                "session_id": session_id,
                "connected_at": datetime.utcnow().isoformat(),
                "ttl": ttl
            }
        )
        
        print(f"Connection {connection_id} established for session {session_id}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({"status": "connected"}),
        }
    
    except Exception as e:
        print(f"Error in wsConnectHandler: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }
