"""
Attune — Recommendation Tracker
Logs whether users followed, skipped, or modified recommendations.
Enables trend tracking: "Did the magnesium actually improve deep sleep?"
"""

import json
import os
import logging
from datetime import datetime

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource("dynamodb")
recs_table = dynamodb.Table(os.environ["RECOMMENDATIONS_TABLE"])


def lambda_handler(event, context):
    """Log a user action on a recommendation."""
    try:
        body = json.loads(event.get("body", "{}"))
        user_id = body.get("user_id")
        rec_id = body.get("recommendation_id")  # the created_at timestamp
        action = body.get("action")  # followed | skipped | modified
        category = body.get("category")  # nutrition | workout | recovery
        index = body.get("index", 0)  # which rec in the category (0-2)

        if not all([user_id, rec_id, action]):
            return _response(400, {"error": "user_id, recommendation_id, and action required"})

        if action not in ("followed", "skipped", "modified"):
            return _response(400, {"error": "action must be: followed, skipped, or modified"})

        # Update the recommendation record with the user's action
        recs_table.update_item(
            Key={"user_id": user_id, "created_at": rec_id},
            UpdateExpression="SET #actions = list_append(if_not_exists(#actions, :empty), :action)",
            ExpressionAttributeNames={"#actions": "user_actions"},
            ExpressionAttributeValues={
                ":empty": [],
                ":action": [{
                    "action": action,
                    "category": category,
                    "index": index,
                    "timestamp": datetime.utcnow().isoformat(),
                }],
            },
        )

        logger.info(f"User {user_id} {action} rec {rec_id} [{category}:{index}]")

        return _response(200, {"message": "Action tracked"})

    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        return _response(500, {"error": "Internal server error"})


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
