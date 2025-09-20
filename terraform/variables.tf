variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Base name for Lambda functions"
  type        = string
  default     = "typescript-lambda"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "namespace" {
  description = "Namespace for resource naming (enables ephemeral infrastructure)"
  type        = string
  default     = ""
  validation {
    condition     = can(regex("^[a-z0-9-]*$", var.namespace))
    error_message = "Namespace must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "powertools_log_level" {
  description = "AWS Lambda PowerTools log level (overrides environment-based default)"
  type        = string
  default     = ""
  validation {
    condition = contains(["", "DEBUG", "INFO", "WARN", "ERROR"], var.powertools_log_level)
    error_message = "PowerTools log level must be one of: DEBUG, INFO, WARN, ERROR."
  }
}

variable "powertools_sample_rate" {
  description = "AWS Lambda PowerTools logger sample rate for non-production environments"
  type        = string
  default     = ""
  validation {
    condition = var.powertools_sample_rate == "" || can(regex("^(0\\.[0-9]|1)$", var.powertools_sample_rate))
    error_message = "PowerTools sample rate must be between 0.0 and 1.0."
  }
}

