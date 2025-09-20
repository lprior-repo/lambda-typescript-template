# API Gateway endpoint
output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "health_endpoint" {
  description = "Health endpoint URL"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/health"
}

output "users_endpoint" {
  description = "Users endpoint URL"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/users"
}

output "posts_endpoint" {
  description = "Posts endpoint URL"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/posts"
}

# Lambda function names and ARNs
output "lambda_function_names" {
  description = "Names of all Lambda functions"
  value = {
    for k, v in module.lambda_functions : k => v.lambda_function_name
  }
}

output "lambda_function_arns" {
  description = "ARNs of all Lambda functions"
  value = {
    for k, v in module.lambda_functions : k => v.lambda_function_arn
  }
}

output "authorizer_function_name" {
  description = "API Key authorizer Lambda function name"
  value       = module.api_key_authorizer.lambda_function_name
}

output "authorizer_function_arn" {
  description = "API Key authorizer Lambda function ARN"
  value       = module.api_key_authorizer.lambda_function_arn
}

output "event_processor_function_name" {
  description = "Event processor Lambda function name"
  value       = module.event_processor.lambda_function_name
}

output "event_processor_function_arn" {
  description = "Event processor Lambda function ARN"
  value       = module.event_processor.lambda_function_arn
}

# DynamoDB table names
output "users_table_name" {
  description = "Users DynamoDB table name"
  value       = aws_dynamodb_table.users.name
}

output "posts_table_name" {
  description = "Posts DynamoDB table name"
  value       = aws_dynamodb_table.posts.name
}

output "audit_logs_table_name" {
  description = "Audit logs DynamoDB table name"
  value       = aws_dynamodb_table.audit_logs.name
}

# EventBridge event bus
output "event_bus_name" {
  description = "EventBridge custom event bus name"
  value       = aws_cloudwatch_event_bus.app_events.name
}

# Environment and namespace info
output "environment" {
  description = "Environment name"
  value       = local.environment
}

output "namespace" {
  description = "Namespace used for resources"
  value       = local.actual_namespace
}

output "project_name" {
  description = "Project name"
  value       = local.project_name
}