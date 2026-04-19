"""
pollyAlertHandler — Step Functions task Lambda
Synthesizes voice alert via Polly, uploads mp3 to S3,
updates trace record with audio URL, and broadcasts critical_alert.
"""
import json
import boto3
import os
from datetime import datetime

polly = boto3.client("polly", region_name=os.environ.get("AWS_REGION", "us-west-2"))
s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-west-2"))
dynamodb = boto3.resource("dynamodb", region_name=os.environ.get("AWS_REGION", "us-west-2"))
ws_connections_table = dynamodb.Table(os.environ["WS_CONNECTIONS_TABLE"])
traces_table = dynamodb.Table(os.environ["TRACES_TABLE"])

# WebSocket management client
apigw = boto3.client("apigatewaymanagementapi", endpoint_url=os.environ["WS_ENDPOINT"])


def lambda_handler(event, context):
    """
    Synthesize voice alert and broadcast to WebSocket clients.
    
    Input from Step Functions:
    {
        "trace_id": "...",
        "session_id": "...",
        "judge_reasoning": "...",
        "severity": "critical"
    }
    
    Outputs audio URL and broadcasts critical_alert message.
    """
    try:
        trace_id = event.get("trace_id")
        session_id = event.get("session_id")
        judge_reasoning = event.get("judge_reasoning", "Safety violation detected.")
        
        print(f"Synthesizing alert for trace {trace_id}")
        
        # Get Polly config from Secrets Manager (cached)
        polly_config = get_polly_config()
        voice_id = polly_config.get("voice_id", "Matthew")
        audio_bucket = polly_config.get("audio_bucket")
        
        # Synthesize speech
        text = f"Critical safety alert: {judge_reasoning}"
        response = polly.synthesize_speech(
            Text=text,
            OutputFormat="mp3",
            VoiceId=voice_id,
            Engine="neural"  # Use neural voice for better quality
        )
        
        audio_stream = response["AudioStream"].read()
        
        # Upload to S3
        audio_key = f"alerts/{trace_id}.mp3"
        s3.put_object(
            Bucket=audio_bucket,
            Key=audio_key,
            Body=audio_stream,
            ContentType="audio/mpeg",
        )
        
        # Generate public URL
        audio_url = f"https://{audio_bucket}.s3.{os.environ.get('AWS_REGION', 'us-west-2')}.amazonaws.com/{audio_key}"
        print(f"Audio uploaded: {audio_url}")
        
        # Update trace record with audio URL
        traces_table.update_item(
            Key={"trace_id": trace_id},
            UpdateExpression="SET polly_audio_url = :url",
            ExpressionAttributeValues={":url": audio_url}
        )
        
        # Broadcast critical_alert to all connections in this session
        broadcast_critical_alert(session_id, trace_id, audio_url, judge_reasoning)
        
        return {
            "statusCode": 200,
            "trace_id": trace_id,
            "audio_url": audio_url,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        print(f"Error in pollyAlertHandler: {str(e)}")
        raise


def broadcast_critical_alert(session_id, trace_id, audio_url, summary):
    """Broadcast critical alert to all WebSocket clients in session."""
    try:
        connections_response = ws_connections_table.query(
            IndexName="session-id-index",
            KeyConditionExpression="session_id = :sid",
            ExpressionAttributeValues={":sid": session_id}
        )
        connections = connections_response.get("Items", [])
        
        message = {
            "type": "critical_alert",
            "payload": {
                "trace_id": trace_id,
                "audio_url": audio_url,
                "summary": summary,
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
        
        print(f"Broadcast critical_alert to {len(connections)} connections")
    
    except Exception as e:
        print(f"Error broadcasting critical alert: {str(e)}")


_polly_config_cache = None


def get_polly_config():
    """Retrieve Polly config from env (SAM hackathon) or Secrets Manager ``glassbox/polly-config``."""
    global _polly_config_cache
    if _polly_config_cache is None:
        bucket = os.environ.get("POLLY_AUDIO_BUCKET")
        voice = os.environ.get("POLLY_VOICE_ID", "Matthew")
        if bucket:
            _polly_config_cache = {"voice_id": voice, "audio_bucket": bucket}
        else:
            try:
                secrets_client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION", "us-west-2"))
                response = secrets_client.get_secret_value(SecretId="glassbox/polly-config")
                _polly_config_cache = json.loads(response["SecretString"])
            except Exception as e:
                print(f"Error fetching Polly config: {str(e)}")
                _polly_config_cache = {}
    return _polly_config_cache
