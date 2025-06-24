/**
 * Enhanced error types for better error handling
 */

import { BaseSDKError } from './base-error.js';

// API Errors

export class APIError extends BaseSDKError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class RateLimitError extends APIError {
  constructor(
    message: string,
    public readonly retryAfter: number,
    public readonly limit?: number,
    public readonly remaining?: number,
    public readonly resetAt?: Date
  ) {
    super(message, 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class AuthenticationError extends APIError {
  constructor(
    message: string,
    public readonly authMethod?: 'api_key' | 'oauth' | 'cli',
    public readonly requiredAction?: string
  ) {
    super(message, 401);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class ModelNotAvailableError extends APIError {
  constructor(
    public readonly model: string,
    public readonly availableModels?: string[],
    public readonly reason?: 'not_found' | 'access_denied' | 'deprecated'
  ) {
    super(`Model not available: ${model}`, 404);
    this.name = 'ModelNotAvailableError';
    Object.setPrototypeOf(this, ModelNotAvailableError.prototype);
  }
}

export class ContextLengthExceededError extends APIError {
  constructor(
    public readonly currentTokens: number,
    public readonly maxTokens: number,
    public readonly truncationStrategy?: 'beginning' | 'middle' | 'end'
  ) {
    super(`Context length exceeded: ${currentTokens} > ${maxTokens} tokens`, 413);
    this.name = 'ContextLengthExceededError';
    Object.setPrototypeOf(this, ContextLengthExceededError.prototype);
  }
}

// Permission Errors

export class PermissionError extends BaseSDKError {
  constructor(
    message: string,
    public readonly resource?: string,
    public readonly action?: string
  ) {
    super(message);
    this.name = 'PermissionError';
    Object.setPrototypeOf(this, PermissionError.prototype);
  }
}

export class ToolPermissionError extends PermissionError {
  constructor(
    public readonly tool: string,
    public readonly permission: 'allow' | 'deny' | 'ask',
    public readonly reason?: string,
    public readonly context?: {
      serverName?: string;
      roleApplied?: string;
      configSource?: 'global' | 'role' | 'query';
    }
  ) {
    super(`Tool permission denied: ${tool}`, tool, 'execute');
    this.name = 'ToolPermissionError';
    Object.setPrototypeOf(this, ToolPermissionError.prototype);
  }
}

export class MCPServerPermissionError extends PermissionError {
  constructor(
    public readonly serverName: string,
    public readonly permission: 'whitelist' | 'blacklist' | 'ask',
    public readonly requestedTools?: string[]
  ) {
    super(`MCP server permission denied: ${serverName}`, serverName, 'connect');
    this.name = 'MCPServerPermissionError';
    Object.setPrototypeOf(this, MCPServerPermissionError.prototype);
  }
}

// Network Errors

export class NetworkError extends BaseSDKError {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly syscall?: string
  ) {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class ConnectionTimeoutError extends NetworkError {
  constructor(
    public readonly timeout: number,
    public readonly operation?: string
  ) {
    super(`Connection timeout after ${timeout}ms`, 'ETIMEDOUT');
    this.name = 'ConnectionTimeoutError';
    Object.setPrototypeOf(this, ConnectionTimeoutError.prototype);
  }
}

export class ConnectionRefusedError extends NetworkError {
  constructor(
    public readonly host?: string,
    public readonly port?: number
  ) {
    super(`Connection refused${host ? ` to ${host}:${port}` : ''}`, 'ECONNREFUSED');
    this.name = 'ConnectionRefusedError';
    Object.setPrototypeOf(this, ConnectionRefusedError.prototype);
  }
}

// Streaming Errors

export class StreamingError extends BaseSDKError {
  constructor(
    message: string,
    public readonly partialData?: unknown,
    public readonly bytesReceived?: number
  ) {
    super(message);
    this.name = 'StreamingError';
    Object.setPrototypeOf(this, StreamingError.prototype);
  }
}

export class StreamAbortedError extends StreamingError {
  constructor(
    public readonly reason?: string,
    public readonly abortedAt?: number,
    partialData?: unknown
  ) {
    super(`Stream aborted${reason ? `: ${reason}` : ''}`, partialData);
    this.name = 'StreamAbortedError';
    Object.setPrototypeOf(this, StreamAbortedError.prototype);
  }
}

export class StreamPausedError extends StreamingError {
  constructor(
    public readonly pausedAt: number,
    public readonly canResume: boolean = true
  ) {
    super('Stream is paused');
    this.name = 'StreamPausedError';
    Object.setPrototypeOf(this, StreamPausedError.prototype);
  }
}

// Retry Errors

export class MaxRetriesExceededError extends BaseSDKError {
  constructor(
    public readonly lastError: Error,
    public readonly attempts: number,
    public readonly totalDelay?: number
  ) {
    super(`Max retries exceeded after ${attempts} attempts: ${lastError.message}`);
    this.name = 'MaxRetriesExceededError';
    Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
  }
}

export class CircuitOpenError extends BaseSDKError {
  constructor(
    public readonly openedAt: Date,
    public readonly failureCount: number,
    public readonly nextRetryAt?: Date
  ) {
    super('Circuit breaker is open');
    this.name = 'CircuitOpenError';
    Object.setPrototypeOf(this, CircuitOpenError.prototype);
  }
}

// Type guards

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isToolPermissionError(error: unknown): error is ToolPermissionError {
  return error instanceof ToolPermissionError;
}

export function isStreamAbortedError(error: unknown): error is StreamAbortedError {
  return error instanceof StreamAbortedError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isRetryableError(error: unknown): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof NetworkError ||
    error instanceof ConnectionTimeoutError ||
    (error instanceof APIError && 
     error.statusCode !== undefined && 
     error.statusCode >= 500)
  );
}

// Error detection from CLI output

export interface ErrorDetectionPattern {
  pattern: RegExp;
  errorFactory: (match: RegExpMatchArray, output: string) => Error;
}

// Error types for detection
export type ErrorType = 
  | 'api_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'model_not_available_error'
  | 'context_length_exceeded_error'
  | 'tool_permission_error'
  | 'network_error'
  | 'timeout_error'
  | 'connection_refused_error'
  | 'stream_aborted_error'
  | 'validation_error';

// Timeout error (convenience class)
export class TimeoutError extends NetworkError {
  constructor(message: string, _timeout?: number) {
    super(message, 'ETIMEDOUT');
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

// Validation error
export class ValidationError extends BaseSDKError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// Error detection patterns
export const ErrorDetectionPatterns: Record<ErrorType, RegExp[]> = {
  rate_limit_error: [
    /rate[_\s]?limit[_\s]?exceeded/i,
    /exceeded.*rate[_\s]?limit/i,
    /429/,
    /too many requests/i
  ],
  authentication_error: [
    /invalid[_\s]?api[_\s]?key/i,
    /authentication[_\s]?failed/i,
    /401/,
    /unauthorized/i
  ],
  model_not_available_error: [
    /model[_\s]?not[_\s]?found/i,
    /invalid[_\s]?model/i,
    /no such model/i
  ],
  context_length_exceeded_error: [
    /context[_\s]?length[_\s]?exceeded/i,
    /maximum[_\s]?tokens/i,
    /token[_\s]?limit/i
  ],
  tool_permission_error: [
    /tool[_\s]?permission[_\s]?denied/i,
    /tool[_\s]?not[_\s]?allowed/i,
    /permission[_\s]?denied[_\s]?for[_\s]?tool/i
  ],
  network_error: [
    /network[_\s]?error/i,
    /ENETWORK/i,
    /EHOSTUNREACH/i
  ],
  timeout_error: [
    /timeout/i,
    /timed[_\s]?out/i,
    /ETIMEDOUT/i
  ],
  connection_refused_error: [
    /connection[_\s]?refused/i,
    /ECONNREFUSED/i
  ],
  stream_aborted_error: [
    /stream[_\s]?aborted/i,
    /aborted/i
  ],
  validation_error: [
    /validation[_\s]?error/i,
    /validation[_\s]?failed/i,
    /invalid[_\s]?parameter/i,
    /invalid[_\s]?argument/i,
    /invalid[_\s]?request/i
  ],
  api_error: [] // Catch-all, no specific patterns
};

export const ERROR_PATTERNS: ErrorDetectionPattern[] = [
  {
    pattern: /rate[_\s]?limit[_\s]?exceeded|429|too many requests/i,
    errorFactory: (_match, output) => {
      const retryAfterMatch = output.match(/retry[_\s]?after[:\s]+(\d+)/i);
      const retryAfter = retryAfterMatch?.[1] ? parseInt(retryAfterMatch[1]) : 60;
      return new RateLimitError('Rate limit exceeded', retryAfter);
    }
  },
  {
    pattern: /invalid[_\s]?api[_\s]?key|authentication[_\s]?failed|401|unauthorized/i,
    errorFactory: () => new AuthenticationError('Authentication failed', 'api_key', 'Please check your API key')
  },
  {
    pattern: /model[_\s]?not[_\s]?found|invalid[_\s]?model|no such model/i,
    errorFactory: (_match, output) => {
      const modelMatch = output.match(/model[:\s]+"?(\w+)"?/i);
      const model = modelMatch?.[1] || 'unknown';
      return new ModelNotAvailableError(model);
    }
  },
  {
    pattern: /context[_\s]?length[_\s]?exceeded|maximum[_\s]?tokens|token[_\s]?limit/i,
    errorFactory: (_match, output) => {
      const currentMatch = output.match(/current[:\s]+(\d+)/i);
      const maxMatch = output.match(/max(?:imum)?[:\s]+(\d+)/i);
      const current = currentMatch?.[1] ? parseInt(currentMatch[1]) : 0;
      const max = maxMatch?.[1] ? parseInt(maxMatch[1]) : 0;
      return new ContextLengthExceededError(current, max);
    }
  },
  {
    pattern: /tool[_\s]?permission[_\s]?denied|tool[_\s]?not[_\s]?allowed|permission[_\s]?denied[_\s]?for[_\s]?tool/i,
    errorFactory: (_match, output) => {
      const toolMatch = output.match(/tool[:\s]+"?(\w+)"?|for[_\s]?tool[:\s]+"?(\w+)"?/i);
      const tool = toolMatch?.[1] || toolMatch?.[2] || 'unknown';
      return new ToolPermissionError(tool, 'deny');
    }
  },
  {
    pattern: /connection[_\s]?timeout|ETIMEDOUT|request[_\s]?timeout/i,
    errorFactory: (_match, output) => {
      const timeoutMatch = output.match(/timeout[:\s]+(\d+)|after[_\s]?(\d+)ms/i);
      const timeoutStr = timeoutMatch?.[1] || timeoutMatch?.[2];
      const timeout = timeoutStr ? parseInt(timeoutStr) : 30000;
      return new ConnectionTimeoutError(timeout);
    }
  },
  {
    pattern: /connection[_\s]?refused|ECONNREFUSED/i,
    errorFactory: () => new ConnectionRefusedError()
  }
];