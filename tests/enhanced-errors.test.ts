import { describe, it, expect } from 'vitest';
import {
  APIError,
  RateLimitError,
  AuthenticationError,
  ModelNotAvailableError,
  ContextLengthExceededError,
  PermissionError,
  ToolPermissionError,
  MCPServerPermissionError,
  NetworkError,
  ConnectionTimeoutError,
  ConnectionRefusedError,
  StreamingError,
  StreamAbortedError,
  StreamPausedError,
  MaxRetriesExceededError,
  CircuitOpenError,
  isRateLimitError,
  isAuthenticationError,
  isToolPermissionError,
  isStreamAbortedError,
  isRetryableError,
  ERROR_PATTERNS
} from '../src/types.js';
import { BaseSDKError } from '../src/types/base-error.js';

describe('Enhanced Error Types', () => {
  describe('API Errors', () => {
    it('should create RateLimitError with all properties', () => {
      const error = new RateLimitError('Rate limited', 60, 100, 0, new Date('2024-01-01'));
      
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error).toBeInstanceOf(APIError);
      expect(error).toBeInstanceOf(BaseSDKError);
      expect(error.message).toBe('Rate limited');
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
      expect(error.remaining).toBe(0);
      expect(error.resetAt).toEqual(new Date('2024-01-01'));
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe('RateLimitError');
    });

    it('should create AuthenticationError with auth method', () => {
      const error = new AuthenticationError('Invalid credentials', 'api_key', 'Please check your API key');
      
      expect(error).toBeInstanceOf(AuthenticationError);
      expect(error.authMethod).toBe('api_key');
      expect(error.requiredAction).toBe('Please check your API key');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should create ModelNotAvailableError with available models', () => {
      const error = new ModelNotAvailableError('gpt-5', ['opus', 'sonnet', 'haiku'], 'not_found');
      
      expect(error).toBeInstanceOf(ModelNotAvailableError);
      expect(error.model).toBe('gpt-5');
      expect(error.availableModels).toEqual(['opus', 'sonnet', 'haiku']);
      expect(error.reason).toBe('not_found');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Model not available: gpt-5');
    });

    it('should create ContextLengthExceededError with token counts', () => {
      const error = new ContextLengthExceededError(150000, 100000, 'middle');
      
      expect(error).toBeInstanceOf(ContextLengthExceededError);
      expect(error.currentTokens).toBe(150000);
      expect(error.maxTokens).toBe(100000);
      expect(error.truncationStrategy).toBe('middle');
      expect(error.statusCode).toBe(413);
      expect(error.message).toBe('Context length exceeded: 150000 > 100000 tokens');
    });
  });

  describe('Permission Errors', () => {
    it('should create ToolPermissionError with context', () => {
      const error = new ToolPermissionError('Bash', 'deny', 'Security policy', {
        serverName: 'file-system-mcp',
        roleApplied: 'developer',
        configSource: 'role'
      });
      
      expect(error).toBeInstanceOf(ToolPermissionError);
      expect(error).toBeInstanceOf(PermissionError);
      expect(error.tool).toBe('Bash');
      expect(error.permission).toBe('deny');
      expect(error.reason).toBe('Security policy');
      expect(error.context?.serverName).toBe('file-system-mcp');
      expect(error.context?.roleApplied).toBe('developer');
      expect(error.context?.configSource).toBe('role');
      expect(error.resource).toBe('Bash');
      expect(error.action).toBe('execute');
    });

    it('should create MCPServerPermissionError', () => {
      const error = new MCPServerPermissionError('database-mcp', 'blacklist', ['Query', 'Update']);
      
      expect(error).toBeInstanceOf(MCPServerPermissionError);
      expect(error.serverName).toBe('database-mcp');
      expect(error.permission).toBe('blacklist');
      expect(error.requestedTools).toEqual(['Query', 'Update']);
      expect(error.resource).toBe('database-mcp');
      expect(error.action).toBe('connect');
    });
  });

  describe('Network Errors', () => {
    it('should create ConnectionTimeoutError', () => {
      const error = new ConnectionTimeoutError(30000, 'connect');
      
      expect(error).toBeInstanceOf(ConnectionTimeoutError);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.timeout).toBe(30000);
      expect(error.operation).toBe('connect');
      expect(error.code).toBe('ETIMEDOUT');
      expect(error.message).toBe('Connection timeout after 30000ms');
    });

    it('should create ConnectionRefusedError', () => {
      const error = new ConnectionRefusedError('localhost', 8080);
      
      expect(error).toBeInstanceOf(ConnectionRefusedError);
      expect(error.host).toBe('localhost');
      expect(error.port).toBe(8080);
      expect(error.code).toBe('ECONNREFUSED');
      expect(error.message).toBe('Connection refused to localhost:8080');
    });
  });

  describe('Streaming Errors', () => {
    it('should create StreamAbortedError with partial data', () => {
      const partialData = { tokens: ['Hello', 'world'] };
      const error = new StreamAbortedError('User cancelled', 1234567890, partialData);
      
      expect(error).toBeInstanceOf(StreamAbortedError);
      expect(error).toBeInstanceOf(StreamingError);
      expect(error.reason).toBe('User cancelled');
      expect(error.abortedAt).toBe(1234567890);
      expect(error.partialData).toEqual(partialData);
      expect(error.message).toBe('Stream aborted: User cancelled');
    });

    it('should create StreamPausedError', () => {
      const error = new StreamPausedError(1234567890, false);
      
      expect(error).toBeInstanceOf(StreamPausedError);
      expect(error.pausedAt).toBe(1234567890);
      expect(error.canResume).toBe(false);
      expect(error.message).toBe('Stream is paused');
    });
  });

  describe('Retry Errors', () => {
    it('should create MaxRetriesExceededError', () => {
      const originalError = new Error('Network error');
      const error = new MaxRetriesExceededError(originalError, 5, 15000);
      
      expect(error).toBeInstanceOf(MaxRetriesExceededError);
      expect(error.lastError).toBe(originalError);
      expect(error.attempts).toBe(5);
      expect(error.totalDelay).toBe(15000);
      expect(error.message).toBe('Max retries exceeded after 5 attempts: Network error');
    });

    it('should create CircuitOpenError', () => {
      const openedAt = new Date('2024-01-01');
      const nextRetryAt = new Date('2024-01-01T00:05:00');
      const error = new CircuitOpenError(openedAt, 10, nextRetryAt);
      
      expect(error).toBeInstanceOf(CircuitOpenError);
      expect(error.openedAt).toBe(openedAt);
      expect(error.failureCount).toBe(10);
      expect(error.nextRetryAt).toBe(nextRetryAt);
      expect(error.message).toBe('Circuit breaker is open');
    });
  });

  describe('Type Guards', () => {
    it('should identify RateLimitError', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      const otherError = new Error('Other error');
      
      expect(isRateLimitError(rateLimitError)).toBe(true);
      expect(isRateLimitError(otherError)).toBe(false);
    });

    it('should identify AuthenticationError', () => {
      const authError = new AuthenticationError('Auth failed');
      const otherError = new Error('Other error');
      
      expect(isAuthenticationError(authError)).toBe(true);
      expect(isAuthenticationError(otherError)).toBe(false);
    });

    it('should identify ToolPermissionError', () => {
      const toolError = new ToolPermissionError('Bash', 'deny');
      const otherError = new Error('Other error');
      
      expect(isToolPermissionError(toolError)).toBe(true);
      expect(isToolPermissionError(otherError)).toBe(false);
    });

    it('should identify StreamAbortedError', () => {
      const streamError = new StreamAbortedError('Cancelled');
      const otherError = new Error('Other error');
      
      expect(isStreamAbortedError(streamError)).toBe(true);
      expect(isStreamAbortedError(otherError)).toBe(false);
    });

    it('should identify retryable errors', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      const networkError = new NetworkError('Network failed');
      const timeoutError = new ConnectionTimeoutError(30000);
      const serverError = new APIError('Server error', 500);
      const authError = new AuthenticationError('Auth failed');
      
      expect(isRetryableError(rateLimitError)).toBe(true);
      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(timeoutError)).toBe(true);
      expect(isRetryableError(serverError)).toBe(true);
      expect(isRetryableError(authError)).toBe(false);
    });
  });

  describe('Error Detection from CLI Output', () => {
    it('should detect rate limit error', () => {
      const outputs = [
        'Error: rate_limit_exceeded',
        'Status: 429 Too Many Requests',
        'Too many requests, please retry after 60 seconds'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(60);
      });
    });

    it('should detect authentication error', () => {
      const outputs = [
        'Error: invalid_api_key',
        'Authentication failed: 401 Unauthorized',
        'Invalid API key provided'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(AuthenticationError);
      });
    });

    it('should detect model not available error', () => {
      const outputs = [
        'Error: model_not_found: gpt-5',
        'Invalid model specified',
        'No such model: claude-3'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(ModelNotAvailableError);
      });
    });

    it('should detect context length error', () => {
      const outputs = [
        'Error: context_length_exceeded',
        'Maximum tokens exceeded: current: 150000, max: 100000',
        'Token limit reached'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(ContextLengthExceededError);
      });
    });

    it('should detect tool permission error', () => {
      const outputs = [
        'Error: tool_permission_denied: Bash',
        'Tool not allowed: WebSearch',
        'Permission denied for tool: Write'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(ToolPermissionError);
      });
    });

    it('should detect connection timeout', () => {
      const outputs = [
        'Error: connection_timeout after 30000ms',
        'ETIMEDOUT: Connection timed out',
        'Request timeout: 60000'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(ConnectionTimeoutError);
      });
    });

    it('should detect connection refused', () => {
      const outputs = [
        'Error: connection_refused',
        'ECONNREFUSED: Connection refused',
        'Unable to connect: Connection refused'
      ];

      outputs.forEach(output => {
        const pattern = ERROR_PATTERNS.find(p => p.pattern.test(output));
        expect(pattern).toBeDefined();
        
        const error = pattern!.errorFactory(output.match(pattern!.pattern)!, output);
        expect(error).toBeInstanceOf(ConnectionRefusedError);
      });
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const rateLimitError = new RateLimitError('Rate limited', 60);
      
      expect(rateLimitError instanceof RateLimitError).toBe(true);
      expect(rateLimitError instanceof APIError).toBe(true);
      expect(rateLimitError instanceof BaseSDKError).toBe(true);
      expect(rateLimitError instanceof Error).toBe(true);
    });

    it('should have proper error names', () => {
      const errors = [
        new RateLimitError('msg', 60),
        new AuthenticationError('msg'),
        new ToolPermissionError('tool', 'deny'),
        new StreamAbortedError('reason'),
        new MaxRetriesExceededError(new Error(), 5)
      ];

      expect(errors.map(e => e.name)).toEqual([
        'RateLimitError',
        'AuthenticationError',
        'ToolPermissionError',
        'StreamAbortedError',
        'MaxRetriesExceededError'
      ]);
    });
  });
});