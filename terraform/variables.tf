variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gramai-advisor"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "hackathon"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for storage"
  type        = string
  default     = "gramai-storage-prod"
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "gramai-farmers"
}

variable "lambda_function_name" {
  description = "Lambda function name"
  type        = string
  default     = "gramai-advisory-handler"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_memory" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 30
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}
