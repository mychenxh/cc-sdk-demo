// Base error class for all Claude SDK errors
export class ClaudeSDKError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ClaudeSDKError';
    Object.setPrototypeOf(this, ClaudeSDKError.prototype);
  }
}

// Error when CLI connection fails
export class CLIConnectionError extends ClaudeSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'CLIConnectionError';
    Object.setPrototypeOf(this, CLIConnectionError.prototype);
  }
}

// Error when Claude Code CLI is not found
export class CLINotFoundError extends ClaudeSDKError {
  constructor(message: string = 'Claude Code CLI not found. Please install it from https://github.com/anthropics/claude-code') {
    super(message);
    this.name = 'CLINotFoundError';
    Object.setPrototypeOf(this, CLINotFoundError.prototype);
  }
}

// Error when CLI process fails
export class ProcessError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly exitCode?: number | null,
    public readonly signal?: NodeJS.Signals | null
  ) {
    super(message);
    this.name = 'ProcessError';
    Object.setPrototypeOf(this, ProcessError.prototype);
  }
}

// Error when operation is aborted via AbortSignal
export class AbortError extends ClaudeSDKError {
  constructor(message: string = 'Operation was aborted') {
    super(message, 'ABORT_ERROR');
    this.name = 'AbortError';
    Object.setPrototypeOf(this, AbortError.prototype);
  }
}

// Error when JSON parsing fails
export class CLIJSONDecodeError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly rawOutput: string
  ) {
    super(message);
    this.name = 'CLIJSONDecodeError';
    Object.setPrototypeOf(this, CLIJSONDecodeError.prototype);
  }
}

// Error when configuration validation fails
export class ConfigValidationError extends ClaudeSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
    Object.setPrototypeOf(this, ConfigValidationError.prototype);
  }
}

// Re-export enhanced error types
export * from './types/enhanced-errors.js';

// Import enhanced error types for detection
import {
  APIError,
  RateLimitError,
  AuthenticationError,
  ToolPermissionError,
  NetworkError,
  TimeoutError,
  ValidationError,
  StreamAbortedError,
  type ErrorType,
  ErrorDetectionPatterns
} from './types/enhanced-errors.js';

// Detect error type from message
export function detectErrorType(message: string): ErrorType {
  // Check each pattern in order of specificity
  for (const [errorType, patterns] of Object.entries(ErrorDetectionPatterns) as [ErrorType, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return errorType;
      }
    }
  }
  
  return 'api_error'; // Default to generic API error
}

// Create typed error instance based on detection
export function createTypedError(
  errorType: ErrorType,
  message: string,
  _originalError?: { code?: string; stack?: string }
): Error {
  switch (errorType) {
    case 'rate_limit_error': {
      // Extract retry info from message if possible
      const retryMatch = message.match(/retry.?after[:\s]+(\d+)/i);
      const retryAfter = retryMatch?.[1] ? parseInt(retryMatch[1]) : 60;
      return new RateLimitError(message, retryAfter);
    }
      
    case 'authentication_error':
      return new AuthenticationError(message);
      
    case 'tool_permission_error': {
      // Extract tool name from message if possible
      const toolMatch = message.match(/tool[:\s]+([\w]+)/i);
      const toolName = toolMatch?.[1] || 'unknown';
      return new ToolPermissionError(toolName, 'deny', message);
    }
      
    case 'network_error':
      return new NetworkError(message);
      
    case 'timeout_error':
      return new TimeoutError(message);
      
    case 'validation_error':
      return new ValidationError(message);
      
    case 'stream_aborted_error':
      return new StreamAbortedError(message);
      
    case 'api_error':
    default: {
      // Try to extract status code from message
      const statusMatch = message.match(/\b(4\d{2}|5\d{2})\b/);
      const statusCode = statusMatch?.[1] ? parseInt(statusMatch[1]) : undefined;
      return new APIError(message, statusCode);
    }
  }
}