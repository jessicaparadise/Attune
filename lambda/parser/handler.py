"""
Attune — Oura Ring Data Parser
Triggered by S3 upload. Parses Oura JSON/CSV exports and writes
normalized metrics to DynamoDB for downstream recommendation engine.

Oura export format (JSON):
  - sleep: daily sleep summaries (stages, HRV, efficiency, latency)
  - readiness: daily readiness scores (HRV balance, body temp, resting HR)
  - activity: daily activity summaries (steps, calories, active time)
"""

import json
import csv
import os
import io
import logging
from datetime import datetime
from decimal import Decimal

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
metrics_table = dynamodb.Table(os.environ["METRICS_TABLE"])


def lambda_handler(event, context):
    """Entry point — triggered by S3 ObjectCreated event."""
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]

        logger.info(f"Processing upload: s3://{bucket}/{key}")

        # Extract user_id from the S3 key pattern: uploads/{user_id}/{filename}
        parts = key.split("/")
        if len(parts) < 3:
            logger.error(f"Unexpected key format: {key}")
            continue

        user_id = parts[1]

        # Download the file
        response = s3.get_object(Bucket=bucket, Key=key)
        body = response["Body"].read().decode("utf-8")

        # Parse based on file type
        if key.endswith(".json"):
            metrics = parse_oura_json(body)
        elif key.endswith(".csv"):
            metrics = parse_oura_csv(body)
        else:
            logger.warning(f"Unsupported file type: {key}")
            continue

        # Write parsed metrics to DynamoDB
        written = write_metrics(user_id, metrics)
        logger.info(f"Wrote {written} metric records for user {user_id}")

    return {"statusCode": 200, "body": json.dumps({"message": "Parse complete"})}


def parse_oura_json(body: str) -> list[dict]:
    """
    Parse Oura JSON export.

    Oura's JSON export contains top-level keys like:
    - "sleep"     → list of daily sleep period objects
    - "readiness" → list of daily readiness objects
    - "activity"  → list of daily activity objects

    Each object has a "summary_date" or "day" field we use as the sort key.
    """
    data = json.loads(body)
    metrics = []

    # ── Sleep data ────────────────────────────────────────────
    for entry in data.get("sleep", []):
        date = entry.get("day") or entry.get("summary_date", "unknown")
        metrics.append({
            "date": date,
            "category": "sleep",
            "score": entry.get("score"),
            "deep_sleep_seconds": entry.get("deep_sleep_duration"),
            "rem_sleep_seconds": entry.get("rem_sleep_duration"),
            "light_sleep_seconds": entry.get("light_sleep_duration"),
            "total_sleep_seconds": entry.get("total_sleep_duration"),
            "sleep_efficiency": entry.get("efficiency"),
            "sleep_latency_seconds": entry.get("latency"),
            "restfulness_score": entry.get("restfulness"),
            "hr_lowest": entry.get("hr_lowest") or entry.get("lowest_heart_rate"),
            "hr_average": entry.get("hr_average") or entry.get("average_heart_rate"),
            "hrv_average": entry.get("average_hrv"),
        })

    # ── Readiness data ────────────────────────────────────────
    for entry in data.get("readiness", []):
        date = entry.get("day") or entry.get("summary_date", "unknown")
        metrics.append({
            "date": date,
            "category": "readiness",
            "score": entry.get("score"),
            "temperature_deviation": entry.get("temperature_deviation"),
            "temperature_trend_deviation": entry.get("temperature_trend_deviation"),
            "resting_heart_rate": entry.get("resting_heart_rate"),
            "hrv_balance_score": entry.get("score_hrv_balance"),
            "recovery_index": entry.get("score_recovery_index"),
            "previous_night_score": entry.get("score_previous_night"),
        })

    # ── Activity data ─────────────────────────────────────────
    for entry in data.get("activity", []):
        date = entry.get("day") or entry.get("summary_date", "unknown")
        metrics.append({
            "date": date,
            "category": "activity",
            "score": entry.get("score"),
            "steps": entry.get("steps"),
            "active_calories": entry.get("active_calories"),
            "total_calories": entry.get("total_calories") or entry.get("cal_total"),
            "sedentary_seconds": entry.get("sedentary_time")
                                 or entry.get("inactive_time"),
            "high_activity_seconds": entry.get("high_activity_time"),
            "medium_activity_seconds": entry.get("medium_activity_time"),
            "low_activity_seconds": entry.get("low_activity_time"),
            "met_average": entry.get("average_met"),
        })

    return metrics


def parse_oura_csv(body: str) -> list[dict]:
    """
    Parse Oura CSV export — simpler format, typically one metric per row.
    Maps columns to the same schema as the JSON parser.
    """
    reader = csv.DictReader(io.StringIO(body))
    metrics = []

    for row in reader:
        date = row.get("date") or row.get("summary_date") or row.get("day", "unknown")
        category = row.get("type") or row.get("category", "unknown")

        metric = {"date": date, "category": category.lower()}

        # Map known columns — skip empty/null values
        field_map = {
            "score": "score",
            "steps": "steps",
            "active_calories": "active_calories",
            "total_calories": "total_calories",
            "deep_sleep_duration": "deep_sleep_seconds",
            "rem_sleep_duration": "rem_sleep_seconds",
            "total_sleep_duration": "total_sleep_seconds",
            "efficiency": "sleep_efficiency",
            "latency": "sleep_latency_seconds",
            "lowest_heart_rate": "hr_lowest",
            "average_heart_rate": "hr_average",
            "average_hrv": "hrv_average",
            "resting_heart_rate": "resting_heart_rate",
            "temperature_deviation": "temperature_deviation",
        }

        for csv_col, metric_key in field_map.items():
            val = row.get(csv_col)
            if val is not None and val != "":
                try:
                    metric[metric_key] = float(val) if "." in str(val) else int(val)
                except (ValueError, TypeError):
                    metric[metric_key] = val

        metrics.append(metric)

    return metrics


def write_metrics(user_id: str, metrics: list[dict]) -> int:
    """Batch write parsed metrics to DynamoDB."""
    count = 0
    now = datetime.utcnow().isoformat()

    with metrics_table.batch_writer() as batch:
        for m in metrics:
            if not m.get("date"):
                continue

            # Build the sort key: {date}#{category} for uniqueness
            sort_key = f"{m['date']}#{m.get('category', 'unknown')}"

            # Clean None values and convert floats to Decimal for DynamoDB
            item = {
                "user_id": user_id,
                "date": sort_key,
                "category": m.get("category", "unknown"),
                "raw_date": m["date"],
                "parsed_at": now,
            }

            for k, v in m.items():
                if k in ("date", "category") or v is None:
                    continue
                item[k] = _to_dynamo_type(v)

            batch.put_item(Item=item)
            count += 1

    return count


def _to_dynamo_type(value):
    """Convert Python types to DynamoDB-compatible types."""
    if isinstance(value, float):
        return Decimal(str(value))
    return value
