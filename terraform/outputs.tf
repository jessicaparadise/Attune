output "api_url" {
  description = "Attune API base URL"
  value       = aws_apigatewayv2_api.attune.api_endpoint
}

output "upload_bucket" {
  description = "S3 bucket for Oura data uploads"
  value       = aws_s3_bucket.oura_uploads.id
}

output "users_table" {
  description = "DynamoDB users table name"
  value       = aws_dynamodb_table.users.name
}

output "metrics_table" {
  description = "DynamoDB metrics table name"
  value       = aws_dynamodb_table.metrics.name
}

output "recommendations_table" {
  description = "DynamoDB recommendations table name"
  value       = aws_dynamodb_table.recommendations.name
}
