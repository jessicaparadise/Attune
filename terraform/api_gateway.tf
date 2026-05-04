# ─── API Gateway: REST API ───────────────────────────────────

resource "aws_apigatewayv2_api" "attune" {
  name          = "${local.prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.attune.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${local.prefix}"
  retention_in_days = 14
}

# ─── Integrations ────────────────────────────────────────────

resource "aws_apigatewayv2_integration" "recommender" {
  api_id                 = aws_apigatewayv2_api.attune.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.recommender.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "tracker" {
  api_id                 = aws_apigatewayv2_api.attune.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tracker.invoke_arn
  payload_format_version = "2.0"
}

# ─── Routes ──────────────────────────────────────────────────

resource "aws_apigatewayv2_route" "get_recommendations" {
  api_id    = aws_apigatewayv2_api.attune.id
  route_key = "POST /recommendations"
  target    = "integrations/${aws_apigatewayv2_integration.recommender.id}"
}

resource "aws_apigatewayv2_route" "track_action" {
  api_id    = aws_apigatewayv2_api.attune.id
  route_key = "POST /track"
  target    = "integrations/${aws_apigatewayv2_integration.tracker.id}"
}

# ─── Lambda Permissions ──────────────────────────────────────

resource "aws_lambda_permission" "apigw_recommender" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.recommender.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.attune.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_tracker" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tracker.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.attune.execution_arn}/*/*"
}
