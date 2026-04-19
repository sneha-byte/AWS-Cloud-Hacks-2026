"""
postmortemGenHandler — Step Functions task Lambda
Generates postmortem markdown via Bedrock, updates trace record,
and broadcasts postmortem to WebSocket clients.
"""
import json
import boto3
import os
from datetime import datetime

bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-west-2"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
ws_connections_table = dynamodb.Table(os.environ["WS_CONNECTIONS_TABLE"])
traces_table = dynamodb.Table(os.environ["TRACES_TABLE"])

# WebSocket management client
apigw = boto3.client("apigatewaymanagementapi", endpoint_url=os.environ["WS_ENDPOINT"])


def lambda_handler(event, context):
    """
    Generate postmortem markdown for a critical incident via Bedrock.
    
    Input from Step Functions:
    {
        "trace_id": "...",
        "session_id": "...",
        "stadium_id": "...",
        "observation": {...},
        "action": {...},
        "judge_reasoning": "...",
        "regulations_cited": [...]
    }
    
    Outputs markdown and broadcasts postmortem message.
    """
    try:
        trace_id = event.get("trace_id")
        session_id = event.get("session_id")
        stadium_id = event.get("stadium_id")
        observation = event.get("observation", {})
        action = event.get("action", {})
        judge_reasoning = event.get("judge_reasoning", "")
        regulations = event.get("regulations_cited", [])
        
        print(f"Generating postmortem for trace {trace_id}")
        
        # Build postmortem prompt
        prompt = build_postmortem_prompt(
            stadium_id, observation, action, judge_reasoning, regulations
        )
        
        # Call Bedrock
        model_id = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-sonnet-4-20250514-v1:0")
        response = bedrock.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-06-01",
                "max_tokens": 1024,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            })
        )
        
        # Parse response
        response_body = json.loads(response["body"].read())
        postmortem_md = response_body["content"][0]["text"]
        
        print(f"Generated postmortem: {len(postmortem_md)} chars")
        
        # Update trace record with postmortem
        traces_table.update_item(
            Key={"trace_id": trace_id},
            UpdateExpression="SET postmortem_md = :md, postmortem_generated_at = :ts",
            ExpressionAttributeValues={
                ":md": postmortem_md,
                ":ts": datetime.utcnow().isoformat()
            }
        )
        
        # Broadcast postmortem to all WebSocket clients in session
        broadcast_postmortem(session_id, trace_id, postmortem_md)
        
        return {
            "statusCode": 200,
            "trace_id": trace_id,
            "postmortem_length": len(postmortem_md),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error in postmortemGenHandler: {str(e)}")
        raise


def build_postmortem_prompt(stadium_id, observation, action, judge_reasoning, regulations):
    """Build the system + user prompt for postmortem generation."""
    
    system_prompt = """You are writing a post-incident report for a safety violation by an AI agent in a public assembly venue.

Given the trace below, produce a report in this exact structure:

## Timeline
[One paragraph: what led to the incident, in chronological order, with timestamps.]

## Root Cause
[One paragraph: why did the agent reach this decision? Cite the specific reasoning step. Reference any regulations that were violated with their full code.]

## Recommendation
[One paragraph: what prompt, guardrail, or system change would prevent this class of error? Be specific and actionable.]

Write in the dry, professional tone of an SRE postmortem. No marketing language."""

    regulations_text = ""
    if regulations:
        regulations_text = "\\n\\nViolated Regulations:\\n"
        for reg in regulations:
            regulations_text += f"- {reg.get('code', 'N/A')}: {reg.get('title', 'N/A')}\\n"
    
    user_prompt = f"""Stadium: {stadium_id}

Observation (sensor readings):
{json.dumps(observation, indent=2)}

Agent Action:
{json.dumps(action, indent=2)}

Judge's Assessment:
{judge_reasoning}
{regulations_text}

Generate the postmortem report now."""

    return f"{system_prompt}\\n\\n{user_prompt}"


def broadcast_postmortem(session_id, trace_id, markdown):
    """Broadcast postmortem to all WebSocket clients in session."""
    try:
        connections_response = ws_connections_table.query(
            IndexName="session-id-index",
            KeyConditionExpression="session_id = :sid",
            ExpressionAttributeValues={":sid": session_id}
        )
        connections = connections_response.get("Items", [])
        
        message = {
            "type": "postmortem",
            "payload": {
                "trace_id": trace_id,
                "markdown": markdown,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        message_json = json.dumps(message)
        
        for conn in connections:
            try:
                apigw.post_to_connection(
                    ConnectionId=conn["connection_id"],
                    Data=message_json
                )
            except apigw.exceptions.GoneException:
                ws_connections_table.delete_item(Key={"connection_id": conn["connection_id"]})
            except Exception as e:
                print(f"Failed to broadcast to {conn['connection_id']}: {str(e)}")
        
        print(f"Broadcast postmortem to {len(connections)} connections")
    
    except Exception as e:
        print(f"Error broadcasting postmortem: {str(e)}")
