output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = "${aws_apigatewayv2_api.gramai_api.api_endpoint}/advisory"
}

output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.gramai_storage.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.gramai_storage.arn
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.gramai_farmers.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB table ARN"
  value       = aws_dynamodb_table.gramai_farmers.arn
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.gramai_advisory.function_name
}

output "lambda_function_arn" {
  description = "Lambda function ARN"
  value       = aws_lambda_function.gramai_advisory.arn
}

output "lambda_role_name" {
  description = "Lambda IAM role name"
  value       = aws_iam_role.lambda_execution_role.name
}

output "lambda_role_arn" {
  description = "Lambda IAM role ARN"
  value       = aws_iam_role.lambda_execution_role.arn
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.gramai_api.id
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.lambda_log_group.name
}

output "region" {
  description = "AWS region"
  value       = var.aws_region
}
