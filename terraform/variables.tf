variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "attune"
}

variable "claude_api_key_ssm_param" {
  description = "SSM Parameter Store path for the Claude API key"
  type        = string
  default     = "/attune/claude-api-key"
}

# ─── Naming helper ───────────────────────────────────────────
locals {
  prefix = "${var.project_name}-${var.environment}"
}
