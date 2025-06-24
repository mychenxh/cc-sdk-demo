# Enhanced Streaming Control and Typed Error Handling Implementation Plan

## Overview
Based on user feedback, implement advanced streaming features, typed error handling, per-call tool permissions, OpenTelemetry support, and exponential backoff.

## Feature Requests Analysis

### 1. 🌊 Enhanced Streaming Control
**Current State**: `stream()` returns full messages
**Requested**: Raw token chunks with async iterator, pause/abort hooks
**Use Case**: Real-time UI updates without buffering

### 2. 🚨 Typed Error Handling
**Current State**: Generic errors requiring string pattern matching
**Requested**: Specific error types (RateLimitError, ToolPermissionError, etc.)
**Use Case**: Simplified retry logic and error handling

### 3. 🔧 Per-Call Tool Permissions
**Current State**: Global tool allow/deny lists
**Requested**: Override permissions per query
**Use Case**: Dynamic permission control

### 4. 📊 OpenTelemetry Integration
**Current State**: Basic logger interface
**Requested**: Pluggable logger that works with OpenTelemetry
**Use Case**: Production observability

### 5. 🔄 Exponential Backoff
**Current State**: No built-in retry mechanism
**Requested**: Opt-in exponential backoff wrapper
**Use Case**: Automatic retry handling

## Implementation Plan

### Phase 1: Typed Error System

#### New Error Classes
```typescript
// src/errors/streaming.ts
export class StreamingError extends ClaudeSDKError {
  constructor(message: string, public readonly partialData?: any) {
    super(message);
  }
}

export class StreamAbortedError extends StreamingError {
  constructor(reason?: string) {
    super(`Stream aborted${reason ? `: ${reason}` : ''}`);
  }
}

// src/errors/api.ts
export class RateLimitError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly retryAfter?: number,
    public readonly limit?: number,
    public readonly remaining?: number
  ) {
    super(message);
  }
}

export class ToolPermissionError extends ClaudeSDKError {
  constructor(
    public readonly tool: string,
    public readonly action: 'allow' | 'deny',
    public readonly reason?: string
  ) {
    super(`Tool permission denied: ${tool}`);
  }
}

export class AuthenticationError extends ClaudeSDKError {
  constructor(
    message: string,
    public readonly authMethod?: string
  ) {
    super(message);
  }
}

export class ModelNotAvailableError extends ClaudeSDKError {
  constructor(
    public readonly model: string,
    public readonly availableModels?: string[]
  ) {
    super(`Model not available: ${model}`);
  }
}

export class ContextLengthExceededError extends ClaudeSDKError {
  constructor(
    public readonly currentTokens: number,
    public readonly maxTokens: number
  ) {
    super(`Context length exceeded: ${currentTokens} > ${maxTokens}`);
  }
}
```

### Phase 2: Enhanced Streaming API

#### Token-Level Streaming
```typescript
// src/streaming/token-stream.ts
export interface TokenChunk {
  token: string;
  timestamp: number;
  metadata?: {
    probability?: number;
    alternativeTokens?: string[];
  };
}

export interface StreamController {
  pause(): void;
  resume(): void;
  abort(reason?: string): void;
  isPaused: boolean;
  isAborted: boolean;
}

export class TokenStream {
  private controller: StreamController;
  private buffer: TokenChunk[] = [];
  
  constructor(private source: AsyncGenerator<Message>) {
    this.controller = this.createController();
  }
  
  async *tokens(): AsyncIterator<TokenChunk> {
    for await (const message of this.source) {
      if (this.controller.isAborted) {
        throw new StreamAbortedError();
      }
      
      while (this.controller.isPaused) {
        await this.sleep(100);
      }
      
      // Extract tokens from message
      const chunks = this.extractTokens(message);
      for (const chunk of chunks) {
        yield chunk;
      }
    }
  }
  
  getController(): StreamController {
    return this.controller;
  }
}
```

#### Fluent API Integration
```typescript
// Add to QueryBuilder
class QueryBuilder {
  // New method for token streaming
  asTokenStream(): TokenStream {
    const messages = baseQuery(this.prompt, this.options);
    return new TokenStream(messages);
  }
  
  // Enhanced stream method with controller
  streamWithControl(
    callback: (message: Message, controller: StreamController) => void | Promise<void>
  ): Promise<StreamController> {
    const controller = new StreamControllerImpl();
    const parser = new ResponseParser(
      this.controlledGenerator(baseQuery(this.prompt, this.options), controller),
      this.messageHandlers,
      this.logger
    );
    
    parser.stream((msg) => callback(msg, controller));
    return Promise.resolve(controller);
  }
}
```

### Phase 3: Per-Call Tool Permissions

#### Enhanced Options
```typescript
interface QueryOptions {
  // Existing options...
  
  // New per-call overrides
  toolOverrides?: {
    allow?: ToolName[];
    deny?: ToolName[];
    permissions?: Record<ToolName, 'allow' | 'deny' | 'ask'>;
  };
}

// Fluent API
class QueryBuilder {
  withToolOverrides(overrides: {
    allow?: ToolName[];
    deny?: ToolName[];
  }): this {
    this.options.toolOverrides = overrides;
    return this;
  }
  
  // Convenience methods
  allowToolsForThisCall(...tools: ToolName[]): this {
    this.options.toolOverrides = {
      ...this.options.toolOverrides,
      allow: tools
    };
    return this;
  }
  
  denyToolsForThisCall(...tools: ToolName[]): this {
    this.options.toolOverrides = {
      ...this.options.toolOverrides,
      deny: tools
    };
    return this;
  }
}
```

### Phase 4: OpenTelemetry Integration

#### Enhanced Logger Interface
```typescript
// src/telemetry/interfaces.ts
export interface TelemetryContext {
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface TelemetryLogger extends Logger {
  startSpan(name: string, attributes?: Record<string, any>): TelemetrySpan;
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
  setContext(context: TelemetryContext): void;
}

export interface TelemetrySpan {
  end(): void;
  setStatus(status: 'ok' | 'error', message?: string): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  setAttribute(key: string, value: any): void;
}

// src/telemetry/opentelemetry.ts
export class OpenTelemetryLogger implements TelemetryLogger {
  constructor(
    private tracer: Tracer,
    private meter: Meter,
    private baseLogger?: Logger
  ) {}
  
  startSpan(name: string, attributes?: Record<string, any>): TelemetrySpan {
    const span = this.tracer.startSpan(name, { attributes });
    return new OpenTelemetrySpanWrapper(span);
  }
  
  recordMetric(name: string, value: number, labels?: Record<string, string>) {
    const counter = this.meter.createCounter(name);
    counter.add(value, labels);
  }
  
  // Implement Logger interface methods with trace context
  info(message: string, context?: LogContext): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent('log', { level: 'info', message, ...context });
    }
    this.baseLogger?.info(message, context);
  }
}
```

### Phase 5: Exponential Backoff

#### Retry Wrapper
```typescript
// src/retry/exponential-backoff.ts
export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
  jitter?: boolean;
  retryableErrors?: Array<new (...args: any[]) => Error>;
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export class ExponentialBackoff {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
    retryableErrors: [RateLimitError, NetworkError]
  };
  
  static async retry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (!this.isRetryable(error, opts.retryableErrors!)) {
          throw error;
        }
        
        if (attempt === opts.maxAttempts) {
          throw new MaxRetriesExceededError(lastError, attempt);
        }
        
        const delay = this.calculateDelay(attempt, opts);
        opts.onRetry?.(attempt, lastError, delay);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }
  
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.initialDelay! * Math.pow(options.multiplier!, attempt - 1);
    delay = Math.min(delay, options.maxDelay!);
    
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.round(delay);
  }
}

// Fluent API integration
class QueryBuilder {
  withRetry(options?: RetryOptions): this {
    this.retryOptions = options;
    return this;
  }
  
  async asText(): Promise<string> {
    if (this.retryOptions) {
      return ExponentialBackoff.retry(
        () => this.executeQuery().asText(),
        this.retryOptions
      );
    }
    return this.executeQuery().asText();
  }
}
```

## Usage Examples

### Enhanced Streaming
```typescript
// Token-level streaming with control
const stream = await claude()
  .query('Write a story')
  .asTokenStream();

const controller = stream.getController();

// Real-time UI updates
for await (const token of stream.tokens()) {
  updateUI(token.token);
  
  // User can pause
  if (userRequestedPause) {
    controller.pause();
  }
  
  // Or abort
  if (userRequestedCancel) {
    controller.abort('User cancelled');
  }
}

// Message streaming with control
const controller = await claude()
  .query('Analyze this data')
  .streamWithControl(async (message, ctrl) => {
    if (message.type === 'assistant') {
      updateUI(message);
      
      // Check if we should stop
      if (shouldStop(message)) {
        ctrl.abort('Condition met');
      }
    }
  });
```

### Typed Error Handling
```typescript
try {
  const result = await claude()
    .query('Complex task')
    .asText();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
    await sleep(error.retryAfter * 1000);
    // Retry
  } else if (error instanceof ToolPermissionError) {
    console.log(`Tool ${error.tool} denied: ${error.reason}`);
    // Handle permission error
  } else if (error instanceof ContextLengthExceededError) {
    console.log(`Too long: ${error.currentTokens}/${error.maxTokens}`);
    // Truncate and retry
  }
}
```

### Per-Call Tool Permissions
```typescript
// Override tools for specific query
const result = await claude()
  .allowTools('Read', 'Write')  // Global
  .query('Edit this file')
  .allowToolsForThisCall('Edit')  // Add Edit for this call only
  .denyToolsForThisCall('Write')  // Remove Write for this call
  .asText();

// Dynamic permissions based on context
const tools = userRole === 'admin' ? ['Delete', 'Write'] : ['Read'];
const result = await claude()
  .query('Process files')
  .withToolOverrides({ allow: tools })
  .asText();
```

### OpenTelemetry Integration
```typescript
import { trace, metrics } from '@opentelemetry/api';
import { OpenTelemetryLogger } from '@instantlyeasy/claude-code-sdk-ts/telemetry';

const logger = new OpenTelemetryLogger(
  trace.getTracer('claude-sdk'),
  metrics.getMeter('claude-sdk')
);

const result = await claude()
  .withLogger(logger)
  .query('Analyze performance')
  .asText();

// Automatic tracing and metrics
```

### Exponential Backoff
```typescript
// Simple retry with defaults
const result = await claude()
  .query('API call')
  .withRetry()
  .asText();

// Custom retry configuration
const result = await claude()
  .query('Critical operation')
  .withRetry({
    maxAttempts: 5,
    initialDelay: 2000,
    multiplier: 1.5,
    retryableErrors: [RateLimitError, NetworkError],
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    }
  })
  .asText();
```

## Implementation Priority

1. **High Priority** (Week 1-2)
   - Typed error classes
   - Basic streaming control (pause/abort)
   - Per-call tool permissions

2. **Medium Priority** (Week 3-4)
   - Token-level streaming
   - Exponential backoff
   - Enhanced error detection from CLI output

3. **Lower Priority** (Week 5-6)
   - Full OpenTelemetry integration
   - Advanced streaming features (buffering, replay)
   - Comprehensive retry strategies

## Testing Strategy

### Unit Tests
- Error class hierarchy and serialization
- Stream controller state management
- Backoff calculation logic
- Permission override merging

### Integration Tests
- Token streaming with real CLI
- Error detection from various CLI outputs
- Retry behavior with mocked delays
- OpenTelemetry span creation

### Performance Tests
- Streaming latency measurements
- Memory usage during long streams
- Retry overhead analysis

## Breaking Changes

None - all features are additive:
- New methods on QueryBuilder
- New error classes extend existing ones
- Optional parameters for backward compatibility
- Opt-in features (retry, streaming control)

## Migration Guide

```typescript
// Before: Generic error handling
try {
  await query('...');
} catch (error) {
  if (error.message.includes('rate limit')) {
    // ...
  }
}

// After: Typed errors
try {
  await claude().query('...').asText();
} catch (error) {
  if (error instanceof RateLimitError) {
    await sleep(error.retryAfter * 1000);
  }
}

// Before: No streaming control
for await (const msg of query('...')) {
  // No way to pause/abort
}

// After: Full control
const stream = await claude().query('...').asTokenStream();
const controller = stream.getController();
// Can pause/abort anytime
```

## Success Metrics

1. **Developer Experience**
   - 80% reduction in error handling boilerplate
   - 90% of retries handled automatically
   - Real-time UI updates under 50ms latency

2. **Observability**
   - Full trace coverage for all operations
   - Automatic error categorization
   - Performance metrics out of the box

3. **Reliability**
   - 99% success rate with retry
   - Graceful handling of all error types
   - No memory leaks during long streams