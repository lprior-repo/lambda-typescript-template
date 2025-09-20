variable "namespace" {
  description = "Namespace for resource naming (e.g., pr-123, dev, prod)"
  type        = string
  default     = ""
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "lambda-typescript-template"
}

variable "is_ephemeral" {
  description = "Whether this is an ephemeral environment (for PR deployments)"
  type        = bool
  default     = false
}

