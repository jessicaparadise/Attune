resource "aws_iam_role" "lambda_exec" {
  name = "${local.prefix}-lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_permissions" {
  name = "${local.prefix}-lambda-perms"
  role = aws_iam_role.lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.oura_uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.metrics.arn,
          "${aws_dynamodb_table.metrics.arn}/index/*",
          aws_dynamodb_table.recommendations.arn,
          "${aws_dynamodb_table.recommendations.arn}/index/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter${var.claude_api_key_ssm_param}"
      }
    ]
  })
}

# ─── Parser ───
data "archive_file" "parser" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/parser"
  output_path = "${path.module}/.build/parser.zip"
}

resource "aws_lambda_function" "parser" {
  function_name    = "${local.prefix}-parser"
  filename         = data.archive_file.parser.output_path
  source_code_hash = data.archive_file.parser.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 60
  memory_size      = 256
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      METRICS_TABLE = aws_dynamodb_table.metrics.name
      ENVIRONMENT   = var.environment
    }
  }
}

resource "aws_lambda_permission" "s3_invoke_parser" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.parser.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.oura_uploads.arn
}

# ─── Recommender ───
data "archive_file" "recommender" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/recommender"
  output_path = "${path.module}/.build/recommender.zip"
}

resource "aws_lambda_function" "recommender" {
  function_name    = "${local.prefix}-recommender"
  filename         = data.archive_file.recommender.output_path
  source_code_hash = data.archive_file.recommender.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 90
  memory_size      = 256
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      METRICS_TABLE         = aws_dynamodb_table.metrics.name
      RECOMMENDATIONS_TABLE = aws_dynamodb_table.recommendations.name
      CLAUDE_API_KEY_PARAM  = var.claude_api_key_ssm_param
      ENVIRONMENT           = var.environment
    }
  }
}

# ─── Tracker ───
data "archive_file" "tracker" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/tracker"
  output_path = "${path.module}/.build/tracker.zip"
}

resource "aws_lambda_function" "tracker" {
  function_name    = "${local.prefix}-tracker"
  filename         = data.archive_file.tracker.output_path
  source_code_hash = data.archive_file.tracker.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 10
  memory_size      = 128
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      RECOMMENDATIONS_TABLE = aws_dynamodb_table.recommendations.name
      METRICS_TABLE         = aws_dynamodb_table.metrics.name
      ENVIRONMENT           = var.environment
    }
  }
}
