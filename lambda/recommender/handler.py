"""
Attune — Recommendation Engine
Called via API Gateway. Reads the user's latest Oura metrics from DynamoDB,
sends them to Claude API with a science-backed prompt, and returns
personalized nutrition, workout, and recovery recommendations.
"""

import json
import os
import logging
from datetime import datetime, timedelta
from decimal import Decimal

import boto3
import urllib.request

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
ssm = boto3.client("ssm")

metrics_table = dynamodb.Table(os.environ["METRICS_TABLE"])
recs_table = dynamodb.Table(os.environ["RECOMMENDATIONS_TABLE"])
CLAUDE_KEY_PARAM = os.environ["CLAUDE_API_KEY_PARAM"]

# Cache the API key for warm starts
_cached_api_key = None


def lambda_handler(event, context):
    """Entry point — called via API Gateway."""
    try:
        body = json.loads(event.get("body", "{}"))
        user_id = body.get("user_id")

        if not user_id:
            return _response(400, {"error": "user_id is required"})

        # Fetch recent metrics (last 7 days)
        metrics = get_recent_metrics(user_id, days=7)

        if not metrics:
            return _response(404, {
                "error": "No metrics found. Upload your Oura data first."
            })

        # Generate recommendations via Claude
        recommendations = generate_recommendations(metrics)

        # Store recommendations
        rec_id = store_recommendations(user_id, recommendations, metrics)

        return _response(200, {
            "recommendation_id": rec_id,
            "recommendations": recommendations,
            "metrics_summary": summarize_metrics(metrics),
        })

    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return _response(500, {"error": "Internal server error"})


def get_recent_metrics(user_id: str, days: int = 7) -> list[dict]:
    """Query DynamoDB for the user's metrics from the last N days."""
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    response = metrics_table.query(
        KeyConditionExpression="user_id = :uid AND #d >= :cutoff",
        ExpressionAttributeNames={"#d": "date"},
        ExpressionAttributeValues={
            ":uid": user_id,
            ":cutoff": cutoff,
        },
    )

    # Convert Decimals back to native types for JSON serialization
    return [_from_dynamo(item) for item in response.get("Items", [])]


def generate_recommendations(metrics: list[dict]) -> dict:
    """Call Claude API with metrics + science-backed prompt."""
    api_key = _get_api_key()

    # Build the latest snapshot from most recent day
    latest = _get_latest_snapshot(metrics)
    trends = _get_trends(metrics)

    prompt = f"""You are a precision wellness advisor for the Attune app. Analyze the
user's Oura Ring biometric data and provide science-backed recommendations.

CURRENT BIOMETRICS (most recent day):
{json.dumps(latest, indent=2)}

7-DAY TRENDS:
{json.dumps(trends, indent=2)}

Provide exactly 3 recommendations in each category. Each recommendation MUST include:
- A specific, actionable suggestion
- The biometric data point that triggered it
- A real DOI reference to a peer-reviewed study supporting the recommendation

Respond in this exact JSON format:
{{
  "nutrition": [
    {{"title": "...", "description": "...", "trigger_metric": "...", "doi": "..."}}
  ],
  "workout": [
    {{"title": "...", "description": "...", "trigger_metric": "...", "doi": "..."}}
  ],
  "recovery": [
    {{"title": "...", "description": "...", "trigger_metric": "...", "doi": "..."}}
  ],
  "overall_insight": "A 2-3 sentence summary of the user's current state and top priority."
}}

Be specific about quantities, timing, and duration. No generic advice.
Reference actual metric values in your descriptions."""

    # Call Claude API
    request_body = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2000,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=request_body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )

    with urllib.request.urlopen(req, timeout=80) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    # Extract text content from Claude's response
    text = ""
    for block in result.get("content", []):
        if block.get("type") == "text":
            text += block["text"]

    # Parse the JSON response
    # Strip markdown fences if present
    clean = text.strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1]
    if clean.endswith("```"):
        clean = clean.rsplit("```", 1)[0]
    clean = clean.strip()

    return json.loads(clean)


def store_recommendations(user_id: str, recs: dict, metrics: list) -> str:
    """Save recommendations to DynamoDB for history tracking."""
    now = datetime.utcnow().isoformat()

    recs_table.put_item(Item={
        "user_id": user_id,
        "created_at": now,
        "recommendations": json.dumps(recs),
        "metrics_snapshot": json.dumps(
            _get_latest_snapshot(metrics), default=str
        ),
    })

    return now


def summarize_metrics(metrics: list[dict]) -> dict:
    """Build a human-readable summary of recent metrics."""
    sleep = [m for m in metrics if m.get("category") == "sleep"]
    readiness = [m for m in metrics if m.get("category") == "readiness"]
    activity = [m for m in metrics if m.get("category") == "activity"]

    summary = {}

    if sleep:
        latest_sleep = sleep[-1]
        summary["sleep"] = {
            "score": latest_sleep.get("score"),
            "deep_sleep_min": _seconds_to_min(latest_sleep.get("deep_sleep_seconds")),
            "rem_sleep_min": _seconds_to_min(latest_sleep.get("rem_sleep_seconds")),
            "efficiency": latest_sleep.get("sleep_efficiency"),
            "hrv_avg": latest_sleep.get("hrv_average"),
        }

    if readiness:
        latest_ready = readiness[-1]
        summary["readiness"] = {
            "score": latest_ready.get("score"),
            "resting_hr": latest_ready.get("resting_heart_rate"),
            "temp_deviation": latest_ready.get("temperature_deviation"),
        }

    if activity:
        latest_act = activity[-1]
        summary["activity"] = {
            "score": latest_act.get("score"),
            "steps": latest_act.get("steps"),
            "active_calories": latest_act.get("active_calories"),
        }

    return summary


# ─── Helpers ──────────────────────────────────────────────────

def _get_latest_snapshot(metrics: list[dict]) -> dict:
    """Get the most recent metric for each category."""
    latest = {}
    for m in sorted(metrics, key=lambda x: x.get("date", "")):
        cat = m.get("category", "unknown")
        latest[cat] = {k: v for k, v in m.items()
                       if v is not None and k not in ("user_id", "parsed_at")}
    return latest


def _get_trends(metrics: list[dict]) -> dict:
    """Calculate 7-day averages and trends per category."""
    from collections import defaultdict
    buckets = defaultdict(list)

    for m in metrics:
        cat = m.get("category", "unknown")
        score = m.get("score")
        if score is not None:
            buckets[cat].append(score)

    trends = {}
    for cat, scores in buckets.items():
        if scores:
            trends[cat] = {
                "avg_score": round(sum(scores) / len(scores), 1),
                "min_score": min(scores),
                "max_score": max(scores),
                "days_tracked": len(scores),
                "trend": "improving" if len(scores) >= 3
                         and scores[-1] > scores[0]
                         else "declining" if len(scores) >= 3
                         and scores[-1] < scores[0]
                         else "stable",
            }

    return trends


def _get_api_key() -> str:
    global _cached_api_key
    if _cached_api_key is None:
        resp = ssm.get_parameter(Name=CLAUDE_KEY_PARAM, WithDecryption=True)
        _cached_api_key = resp["Parameter"]["Value"]
    return _cached_api_key


def _seconds_to_min(seconds):
    if seconds is None:
        return None
    return round(seconds / 60)


def _from_dynamo(item: dict) -> dict:
    """Convert DynamoDB Decimal types to native Python types."""
    return {
        k: int(v) if isinstance(v, Decimal) and v == int(v)
        else float(v) if isinstance(v, Decimal)
        else v
        for k, v in item.items()
    }


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=str),
    }
