"""
wsDisconnectHandler — API Gateway WebSocket $disconnect route
Removes the connection_id from DynamoDB when client disconnects.
"""
import json
import boto3
import os

dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
table = dynamodb.Table(os.environ["WS_CONNECTIONS_TABLE"])


def lambda_handler(event, context):
    """
    Handle WebSocket disconnection.
    
    Event context contains:
    - requestContext.connectionId: unique WebSocket connection ID to remove
    
    Deletes connection_id from the connections table.
    """
    try:
        # Extract connection ID from WebSocket context
        connection_id = event["requestContext"]["connectionId"]
        
        # Delete from DynamoDB
        table.delete_item(Key={"connection_id": connection_id})
        
        print(f"Connection {connection_id} disconnected")
        
        return {
            "statusCode": 200,
            "body": json.dumps({"status": "disconnected"}),
        }
    
    except Exception as e:
        print(f"Error in wsDisconnectHandler: {str(e)}")
        # Return 200 even on error — disconnect is idempotent
        # If we return 500, API Gateway might retry indefinitely
        return {
            "statusCode": 200,
            "body": json.dumps({"error": str(e)}),
        }
