/**
 * Enhanced error types for better error handling
 */
import { ClaudeSDKError } from '../errors.js';
// API Errors
export class APIError extends ClaudeSDKError {
    statusCode;
    headers;
    constructor(message, statusCode, headers) {
        super(message);
        this.statusCode = statusCode;
        this.headers = headers;
        this.name = 'APIError';
        Object.setPrototypeOf(this, APIError.prototype);
    }
}
export class RateLimitError extends APIError {
    retryAfter;
    limit;
    remaining;
    resetAt;
    constructor(message, retryAfter, limit, remaining, resetAt) {
        super(message, 429);
        this.retryAfter = retryAfter;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAt = resetAt;
        this.name = 'RateLimitError';
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}
export class AuthenticationError extends APIError {
    authMethod;
    requiredAction;
    constructor(message, authMethod, requiredAction) {
        super(message, 401);
        this.authMethod = authMethod;
        this.requiredAction = requiredAction;
        this.name = 'AuthenticationError';
        Object.setPrototypeOf(this, AuthenticationError.prototype);
    }
}
export class ModelNotAvailableError extends APIError {
    model;
    availableModels;
    reason;
    constructor(model, availableModels, reason) {
        super(`Model not available: ${model}`, 404);
        this.model = model;
        this.availableModels = availableModels;
        this.reason = reason;
        this.name = 'ModelNotAvailableError';
        Object.setPrototypeOf(this, ModelNotAvailableError.prototype);
    }
}
export class ContextLengthExceededError extends APIError {
    currentTokens;
    maxTokens;
    truncationStrategy;
    constructor(currentTokens, maxTokens, truncationStrategy) {
        super(`Context length exceeded: ${currentTokens} > ${maxTokens} tokens`, 413);
        this.currentTokens = currentTokens;
        this.maxTokens = maxTokens;
        this.truncationStrategy = truncationStrategy;
        this.name = 'ContextLengthExceededError';
        Object.setPrototypeOf(this, ContextLengthExceededError.prototype);
    }
}
// Permission Errors
export class PermissionError extends ClaudeSDKError {
    resource;
    action;
    constructor(message, resource, action) {
        super(message);
        this.resource = resource;
        this.action = action;
        this.name = 'PermissionError';
        Object.setPrototypeOf(this, PermissionError.prototype);
    }
}
export class ToolPermissionError extends PermissionError {
    tool;
    permission;
    reason;
    context;
    constructor(tool, permission, reason, context) {
        super(`Tool permission denied: ${tool}`);
        this.tool = tool;
        this.permission = permission;
        this.reason = reason;
        this.context = context;
        this.name = 'ToolPermissionError';
        this.resource = tool;
        this.action = 'execute';
        Object.setPrototypeOf(this, ToolPermissionError.prototype);
    }
}
export class MCPServerPermissionError extends PermissionError {
    serverName;
    permission;
    requestedTools;
    constructor(serverName, permission, requestedTools) {
        super(`MCP server permission denied: ${serverName}`);
        this.serverName = serverName;
        this.permission = permission;
        this.requestedTools = requestedTools;
        this.name = 'MCPServerPermissionError';
        this.resource = serverName;
        this.action = 'connect';
        Object.setPrototypeOf(this, MCPServerPermissionError.prototype);
    }
}
// Network Errors
export class NetworkError extends ClaudeSDKError {
    code;
    syscall;
    constructor(message, code, syscall) {
        super(message);
        this.code = code;
        this.syscall = syscall;
        this.name = 'NetworkError';
        Object.setPrototypeOf(this, NetworkError.prototype);
    }
}
export class ConnectionTimeoutError extends NetworkError {
    timeout;
    operation;
    constructor(timeout, operation) {
        super(`Connection timeout after ${timeout}ms`);
        this.timeout = timeout;
        this.operation = operation;
        this.name = 'ConnectionTimeoutError';
        this.code = 'ETIMEDOUT';
        Object.setPrototypeOf(this, ConnectionTimeoutError.prototype);
    }
}
export class ConnectionRefusedError extends NetworkError {
    host;
    port;
    constructor(host, port) {
        super(`Connection refused${host ? ` to ${host}:${port}` : ''}`);
        this.host = host;
        this.port = port;
        this.name = 'ConnectionRefusedError';
        this.code = 'ECONNREFUSED';
        Object.setPrototypeOf(this, ConnectionRefusedError.prototype);
    }
}
// Streaming Errors
export class StreamingError extends ClaudeSDKError {
    partialData;
    bytesReceived;
    constructor(message, partialData, bytesReceived) {
        super(message);
        this.partialData = partialData;
        this.bytesReceived = bytesReceived;
        this.name = 'StreamingError';
        Object.setPrototypeOf(this, StreamingError.prototype);
    }
}
export class StreamAbortedError extends StreamingError {
    reason;
    abortedAt;
    constructor(reason, abortedAt, partialData) {
        super(`Stream aborted${reason ? `: ${reason}` : ''}`, partialData);
        this.reason = reason;
        this.abortedAt = abortedAt;
        this.name = 'StreamAbortedError';
        Object.setPrototypeOf(this, StreamAbortedError.prototype);
    }
}
export class StreamPausedError extends StreamingError {
    pausedAt;
    canResume;
    constructor(pausedAt, canResume = true) {
        super('Stream is paused');
        this.pausedAt = pausedAt;
        this.canResume = canResume;
        this.name = 'StreamPausedError';
        Object.setPrototypeOf(this, StreamPausedError.prototype);
    }
}
// Retry Errors
export class MaxRetriesExceededError extends ClaudeSDKError {
    lastError;
    attempts;
    totalDelay;
    constructor(lastError, attempts, totalDelay) {
        super(`Max retries exceeded after ${attempts} attempts: ${lastError.message}`);
        this.lastError = lastError;
        this.attempts = attempts;
        this.totalDelay = totalDelay;
        this.name = 'MaxRetriesExceededError';
        Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
    }
}
export class CircuitOpenError extends ClaudeSDKError {
    openedAt;
    failureCount;
    nextRetryAt;
    constructor(openedAt, failureCount, nextRetryAt) {
        super('Circuit breaker is open');
        this.openedAt = openedAt;
        this.failureCount = failureCount;
        this.nextRetryAt = nextRetryAt;
        this.name = 'CircuitOpenError';
        Object.setPrototypeOf(this, CircuitOpenError.prototype);
    }
}
// Type guards
export function isRateLimitError(error) {
    return error instanceof RateLimitError;
}
export function isAuthenticationError(error) {
    return error instanceof AuthenticationError;
}
export function isToolPermissionError(error) {
    return error instanceof ToolPermissionError;
}
export function isStreamAbortedError(error) {
    return error instanceof StreamAbortedError;
}
export function isRetryableError(error) {
    return (error instanceof RateLimitError ||
        error instanceof NetworkError ||
        error instanceof ConnectionTimeoutError ||
        (error instanceof APIError &&
            error.statusCode !== undefined &&
            error.statusCode >= 500));
}
export const ERROR_PATTERNS = [
    {
        pattern: /rate[_\s]?limit[_\s]?exceeded|429|too many requests/i,
        errorFactory: (match, output) => {
            const retryAfterMatch = output.match(/retry[_\s]?after[:\s]+(\d+)/i);
            const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : 60;
            return new RateLimitError('Rate limit exceeded', retryAfter);
        }
    },
    {
        pattern: /invalid[_\s]?api[_\s]?key|authentication[_\s]?failed|401|unauthorized/i,
        errorFactory: () => new AuthenticationError('Authentication failed', 'api_key', 'Please check your API key')
    },
    {
        pattern: /model[_\s]?not[_\s]?found|invalid[_\s]?model|no such model/i,
        errorFactory: (match, output) => {
            const modelMatch = output.match(/model[:\s]+"?(\w+)"?/i);
            const model = modelMatch ? modelMatch[1] : 'unknown';
            return new ModelNotAvailableError(model);
        }
    },
    {
        pattern: /context[_\s]?length[_\s]?exceeded|maximum[_\s]?tokens|token[_\s]?limit/i,
        errorFactory: (match, output) => {
            const currentMatch = output.match(/current[:\s]+(\d+)/i);
            const maxMatch = output.match(/max(?:imum)?[:\s]+(\d+)/i);
            const current = currentMatch ? parseInt(currentMatch[1]) : 0;
            const max = maxMatch ? parseInt(maxMatch[1]) : 0;
            return new ContextLengthExceededError(current, max);
        }
    },
    {
        pattern: /tool[_\s]?permission[_\s]?denied|tool[_\s]?not[_\s]?allowed|permission[_\s]?denied[_\s]?for[_\s]?tool/i,
        errorFactory: (match, output) => {
            const toolMatch = output.match(/tool[:\s]+"?(\w+)"?|for[_\s]?tool[:\s]+"?(\w+)"?/i);
            const tool = toolMatch ? (toolMatch[1] || toolMatch[2]) : 'unknown';
            return new ToolPermissionError(tool, 'deny');
        }
    },
    {
        pattern: /connection[_\s]?timeout|ETIMEDOUT|request[_\s]?timeout/i,
        errorFactory: (match, output) => {
            const timeoutMatch = output.match(/timeout[:\s]+(\d+)|after[_\s]?(\d+)ms/i);
            const timeout = timeoutMatch ? parseInt(timeoutMatch[1] || timeoutMatch[2]) : 30000;
            return new ConnectionTimeoutError(timeout);
        }
    },
    {
        pattern: /connection[_\s]?refused|ECONNREFUSED/i,
        errorFactory: () => new ConnectionRefusedError()
    }
];
