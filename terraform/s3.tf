resource "aws_s3_bucket" "oura_uploads" {
  bucket = "${local.prefix}-oura-uploads"
}

resource "aws_s3_bucket_versioning" "oura_uploads" {
  bucket = aws_s3_bucket.oura_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "oura_uploads" {
  bucket = aws_s3_bucket.oura_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "oura_uploads" {
  bucket                  = aws_s3_bucket.oura_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "oura_uploads" {
  bucket = aws_s3_bucket.oura_uploads.id
  rule {
    id     = "archive-old-uploads"
    status = "Enabled"
    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

resource "aws_s3_bucket_notification" "oura_upload_trigger" {
  bucket = aws_s3_bucket.oura_uploads.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.parser.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".json"
  }
  lambda_function {
    lambda_function_arn = aws_lambda_function.parser.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".csv"
  }
  depends_on = [aws_lambda_permission.s3_invoke_parser]
}
