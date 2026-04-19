"""
traceBroadcaster — DynamoDB Stream trigger on traces table
Reads new trace records and broadcasts them to all WebSocket clients
connected to that session_id.
"""
import json
import boto3
import os
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
ws_connections_table = dynamodb.Table(os.environ["WS_CONNECTIONS_TABLE"])

# WebSocket management client for sending messages to clients
apigw = boto3.client("apigatewaymanagementapi", endpoint_url=os.environ["WS_ENDPOINT"])


def lambda_handler(event, context):
    """
    Handle DynamoDB Stream events from the traces table.
    
    For each NEW_IMAGE record (insert or update), extract session_id,
    query active connections, and broadcast the trace to all connected clients.
    
    Event: DynamoDB Stream records with StreamViewType: NEW_IMAGE
    """
    try:
        # Process each record in the stream batch
        for record in event.get("Records", []):
            if record["eventName"] not in ["INSERT", "MODIFY"]:
                continue
            
            # Extract the new image (full trace record)
            trace = record["dynamodb"].get("NewImage")
            if not trace:
                continue
            
            # Unmarshal DynamoDB format to Python dict
            trace = deserialize_dynamo(trace)
            session_id = trace.get("session_id")
            
            if not session_id:
                print(f"Trace {trace.get('trace_id')} has no session_id, skipping")
                continue
            
            # Find all connections for this session
            connections_response = ws_connections_table.query(
                IndexName="session-id-index",  # GSI on session_id
                KeyConditionExpression=Key("session_id").eq(session_id)
            )
            connections = connections_response.get("Items", [])
            print(f"Broadcasting trace {trace.get('trace_id')} to {len(connections)} connections")
            
            # Broadcast to each connection
            message = {
                "type": "trace",
                "payload": trace
            }
            message_json = json.dumps(message)
            
            for conn in connections:
                try:
                    apigw.post_to_connection(
                        ConnectionId=conn["connection_id"],
                        Data=message_json
                    )
                except apigw.exceptions.GoneException:
                    # Connection is closed, clean it up
                    ws_connections_table.delete_item(Key={"connection_id": conn["connection_id"]})
                    print(f"Cleaned up stale connection {conn['connection_id']}")
                except Exception as e:
                    print(f"Failed to send to {conn['connection_id']}: {str(e)}")
        
        return {"statusCode": 200, "body": "OK"}
    
    except Exception as e:
        print(f"Error in traceBroadcaster: {str(e)}")
        raise


def deserialize_dynamo(dynamo_item):
    """Convert DynamoDB format to Python dict."""
    result = {}
    for key, val in dynamo_item.items():
        if "S" in val:
            result[key] = val["S"]
        elif "N" in val:
            # Try to parse as int first, then float
            num_str = val["N"]
            result[key] = int(num_str) if "." not in num_str else float(num_str)
        elif "BOOL" in val:
            result[key] = val["BOOL"]
        elif "M" in val:
            result[key] = deserialize_dynamo(val["M"])
        elif "L" in val:
            out: list = []
            for item in val["L"]:
                if isinstance(item, dict) and "M" in item:
                    out.append(deserialize_dynamo(item["M"]))
                elif isinstance(item, dict) and "S" in item:
                    out.append(item["S"])
                elif isinstance(item, dict) and "N" in item:
                    n = item["N"]
                    out.append(int(n) if "." not in n else float(n))
                elif isinstance(item, dict) and "BOOL" in item:
                    out.append(item["BOOL"])
                else:
                    out.append(item)
            result[key] = out
        elif "NULL" in val:
            result[key] = None
        else:
            result[key] = val
    return result
