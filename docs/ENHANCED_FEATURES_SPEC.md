# Enhanced Features Technical Specification

## 1. Typed Error System Architecture

### Error Hierarchy
```
ClaudeSDKError (base)
├── StreamingError
│   ├── StreamAbortedError
│   └── StreamPausedError
├── APIError (new base for API errors)
│   ├── RateLimitError
│   ├── AuthenticationError
│   ├── ModelNotAvailableError
│   └── ContextLengthExceededError
├── PermissionError (new base)
│   ├── ToolPermissionError
│   └── MCPServerPermissionError
├── ValidationError
│   ├── ConfigValidationError
│   └── OptionValidationError
└── NetworkError
    ├── ConnectionTimeoutError
    └── ConnectionRefusedError
```

### Error Detection Strategy
```typescript
// src/errors/detector.ts
export class ErrorDetector {
  static detectFromCLIOutput(output: string): Error | null {
    // Rate limit detection
    if (output.includes('rate_limit_exceeded') || 
        output.includes('429') ||
        output.includes('too many requests')) {
      const retryAfter = this.extractRetryAfter(output);
      return new RateLimitError('Rate limit exceeded', retryAfter);
    }
    
    // Authentication errors
    if (output.includes('invalid_api_key') ||
        output.includes('authentication_failed') ||
        output.includes('401')) {
      return new AuthenticationError('Authentication failed');
    }
    
    // Model availability
    if (output.includes('model_not_found') ||
        output.includes('invalid_model')) {
      const model = this.extractModelName(output);
      return new ModelNotAvailableError(model);
    }
    
    // Context length
    if (output.includes('context_length_exceeded') ||
        output.includes('maximum_tokens')) {
      const tokens = this.extractTokenCounts(output);
      return new ContextLengthExceededError(tokens.current, tokens.max);
    }
    
    // Tool permissions
    if (output.includes('tool_permission_denied') ||
        output.includes('tool_not_allowed')) {
      const tool = this.extractToolName(output);
      return new ToolPermissionError(tool, 'deny');
    }
    
    return null;
  }
}
```

## 2. Token-Level Streaming Implementation

### Stream Architecture
```typescript
// src/streaming/token-stream.ts
export class TokenStream {
  private controller: StreamController;
  private tokenizer: Tokenizer;
  private buffer: TokenChunk[] = [];
  private state: StreamState = 'active';
  
  constructor(
    private source: AsyncGenerator<Message>,
    options?: StreamOptions
  ) {
    this.controller = new StreamControllerImpl();
    this.tokenizer = new ClaudeTokenizer(options?.model);
  }
  
  async *tokens(): AsyncIterator<TokenChunk> {
    try {
      for await (const message of this.source) {
        // Check control signals
        if (this.controller.isAborted) {
          throw new StreamAbortedError(this.controller.abortReason);
        }
        
        // Handle pause
        while (this.controller.isPaused && !this.controller.isAborted) {
          await this.sleep(100);
        }
        
        // Process message into tokens
        if (message.type === 'assistant') {
          for (const block of message.content) {
            if (block.type === 'text') {
              const tokens = this.tokenizer.tokenize(block.text);
              for (const token of tokens) {

                const chunk: TokenChunk = {
                  token,
                  timestamp: Date.now(),
                  metadata: {
                    messageId: message.id,
                    blockIndex: message.content.indexOf(block)
                  }
                };
                
                // Buffer management
                if (this.options?.bufferSize && 
                    this.buffer.length >= this.options.bufferSize) {
                  this.buffer.shift();
                }
                this.buffer.push(chunk);
                
                yield chunk;
              }
            }
          }
        }
      }
    } finally {
      this.state = 'completed';
    }
  }
  
  // Stream control methods
  getSnapshot(): TokenChunk[] {
    return [...this.buffer];
  }
  
  getMetrics(): StreamMetrics {
    return {
      tokensEmitted: this.buffer.length,
      duration: Date.now() - this.startTime,
      state: this.state,
      averageTokensPerSecond: this.calculateThroughput()
    };
  }
}
```

### Incremental UI Updates
```typescript
// Example: Real-time markdown rendering
class IncrementalRenderer {
  private partialContent = '';
  private lastRenderTime = 0;
  private renderThrottle = 16; // 60fps
  
  async renderStream(stream: TokenStream) {
    const controller = stream.getController();
    
    for await (const chunk of stream.tokens()) {
      this.partialContent += chunk.token;
      
      // Throttled rendering
      const now = Date.now();
      if (now - this.lastRenderTime >= this.renderThrottle) {
        await this.updateUI(this.partialContent);
        this.lastRenderTime = now;
      }
      
      // Check for user interaction
      if (this.checkUserAbort()) {
        controller.abort('User cancelled');
        break;
      }
    }
    
    // Final render
    await this.updateUI(this.partialContent);
  }
}
```

## 3. Per-Call Tool Permission System

### Permission Resolution Order
```typescript
class PermissionResolver {
  resolve(
    globalConfig: ToolPermissions,
    rolePermissions?: ToolPermissions,
    queryOverrides?: ToolPermissions
  ): ResolvedPermissions {
    // Priority: Query > Role > Global
    
    // 1. Start with global config
    let allowed = new Set(globalConfig.allowed || []);
    let denied = new Set(globalConfig.denied || []);
    
    // 2. Apply role permissions
    if (rolePermissions) {
      if (rolePermissions.allowed) {
        allowed = new Set(rolePermissions.allowed);
      }
      if (rolePermissions.denied) {
        rolePermissions.denied.forEach(tool => denied.add(tool));
      }
    }
    
    // 3. Apply query-level overrides
    if (queryOverrides) {
      if (queryOverrides.allowed) {
        // Add to allowed, remove from denied
        queryOverrides.allowed.forEach(tool => {
          allowed.add(tool);
          denied.delete(tool);
        });
      }
      if (queryOverrides.denied) {
        // Add to denied, remove from allowed
        queryOverrides.denied.forEach(tool => {
          denied.add(tool);
          allowed.delete(tool);
        });
      }
    }
    
    return {
      allowed: Array.from(allowed),
      denied: Array.from(denied)
    };
  }
}
```

### Fluent API Integration
```typescript
class QueryBuilder {
  private queryToolOverrides?: ToolPermissions;
  
  // Per-query tool permissions
  allowToolsForThisCall(...tools: ToolName[]): this {
    if (!this.queryToolOverrides) {
      this.queryToolOverrides = {};
    }
    this.queryToolOverrides.allowed = [
      ...(this.queryToolOverrides.allowed || []),
      ...tools
    ];
    return this;
  }
  
  denyToolsForThisCall(...tools: ToolName[]): this {
    if (!this.queryToolOverrides) {
      this.queryToolOverrides = {};
    }
    this.queryToolOverrides.denied = [
      ...(this.queryToolOverrides.denied || []),
      ...tools
    ];
    return this;
  }
  
  // Dynamic permission function
  withDynamicPermissions(
    fn: (context: QueryContext) => ToolPermissions
  ): this {
    this.dynamicPermissionFn = fn;
    return this;
  }
  
  private resolvePermissions(): ToolPermissions {
    const base = this.permissionResolver.resolve(
      this.options.tools,
      this.rolePermissions,
      this.queryToolOverrides
    );
    
    // Apply dynamic permissions if provided
    if (this.dynamicPermissionFn) {
      const context: QueryContext = {
        prompt: this.prompt,
        model: this.options.model,
        timestamp: Date.now()
      };
      const dynamic = this.dynamicPermissionFn(context);
      return this.permissionResolver.resolve(base, dynamic);
    }
    
    return base;
  }
}
```

## 4. OpenTelemetry Integration Design

### Trace Structure
```
claude-sdk-query (span)
├── permission-resolution
├── cli-subprocess-start
├── message-stream
│   ├── assistant-message-1
│   │   ├── text-block
│   │   └── tool-use-block
│   │       └── tool-execution
│   └── assistant-message-2
├── response-parsing
└── result-processing
```

### Implementation
```typescript
// src/telemetry/provider.ts
export class TelemetryProvider {
  private tracer: Tracer;
  private meter: Meter;
  private activeSpans = new Map<string, Span>();
  
  constructor(private config: TelemetryConfig) {
    this.tracer = trace.getTracer(
      '@instantlyeasy/claude-code-sdk-ts',
      SDK_VERSION
    );
    this.meter = metrics.getMeter(
      '@instantlyeasy/claude-code-sdk-ts',
      SDK_VERSION
    );
    
    this.initializeMetrics();
  }
  
  private initializeMetrics() {
    // Counter metrics
    this.queryCounter = this.meter.createCounter('claude_sdk_queries', {
      description: 'Total number of queries'
    });
    
    // Histogram metrics
    this.queryDuration = this.meter.createHistogram('claude_sdk_query_duration', {
      description: 'Query duration in milliseconds',
      unit: 'ms'
    });
    
    this.tokenCount = this.meter.createHistogram('claude_sdk_token_count', {
      description: 'Token count per query'
    });
    
    // Gauge metrics
    this.activeStreams = this.meter.createUpDownCounter('claude_sdk_active_streams', {
      description: 'Number of active streams'
    });
  }
  
  startQuerySpan(prompt: string, options: ClaudeCodeOptions): Span {
    const span = this.tracer.startSpan('claude-sdk-query', {
      attributes: {
        'claude.prompt.length': prompt.length,
        'claude.model': options.model,
        'claude.timeout': options.timeout,
        'claude.tools.allowed': options.allowedTools?.join(','),
        'claude.tools.denied': options.deniedTools?.join(',')
      }
    });
    
    this.activeSpans.set(span.spanContext().spanId, span);
    return span;
  }
  
  recordToolUse(tool: ToolUseBlock, parentSpan: Span) {
    const toolSpan = this.tracer.startSpan(
      `tool-use-${tool.name}`,
      {
        parent: parentSpan,
        attributes: {
          'claude.tool.name': tool.name,
          'claude.tool.input': JSON.stringify(tool.input)
        }
      }
    );
    
    return toolSpan;
  }
}
```

## 5. Exponential Backoff Implementation

### Backoff Strategy
```typescript
// src/retry/strategies.ts
export abstract class RetryStrategy {
  abstract shouldRetry(error: Error, attempt: number): boolean;
  abstract calculateDelay(attempt: number): number;
}

export class ExponentialBackoffStrategy extends RetryStrategy {
  constructor(private options: ExponentialBackoffOptions) {
    super();
  }
  
  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt > this.options.maxAttempts) {
      return false;
    }
    
    // Check if error is retryable
    if (error instanceof RateLimitError) {
      return true;
    }
    
    if (error instanceof NetworkError) {
      return true;
    }
    
    if (error instanceof ContextLengthExceededError) {
      return false; // Don't retry context length errors
    }
    
    // Check custom retryable errors
    return this.options.retryableErrors?.some(
      ErrorClass => error instanceof ErrorClass
    ) ?? false;
  }
  
  calculateDelay(attempt: number): number {
    // Base delay with exponential increase
    let delay = this.options.initialDelay * 
                Math.pow(this.options.multiplier, attempt - 1);
    
    // Cap at max delay
    delay = Math.min(delay, this.options.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.options.jitter) {
      const jitterRange = delay * this.options.jitterFactor;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay += jitter;
    }
    
    return Math.max(0, Math.round(delay));
  }
}

// Circuit breaker integration
export class CircuitBreakerStrategy extends RetryStrategy {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  shouldRetry(error: Error, attempt: number): boolean {
    this.recordFailure();
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.options.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return attempt <= this.options.maxAttempts;
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }
}
```

## Performance Considerations

### Memory Management
```typescript
class StreamBufferManager {
  private maxBufferSize: number;
  private buffers = new Map<string, RingBuffer<TokenChunk>>();
  
  constructor(options: BufferOptions) {
    this.maxBufferSize = options.maxBufferSize || 10000;
    
    // Periodic cleanup
    setInterval(() => this.cleanup(), options.cleanupInterval || 60000);
  }
  
  addToken(streamId: string, token: TokenChunk) {
    if (!this.buffers.has(streamId)) {
      this.buffers.set(streamId, new RingBuffer(this.maxBufferSize));
    }
    
    this.buffers.get(streamId)!.push(token);
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [id, buffer] of this.buffers) {
      const lastToken = buffer.peek();
      if (lastToken && now - lastToken.timestamp > 300000) { // 5 min
        this.buffers.delete(id);
      }
    }
  }
}
```

### Connection Pooling
```typescript
class CLIConnectionPool {
  private pool: CLIConnection[] = [];
  private maxConnections: number;
  private activeConnections = 0;
  
  async acquire(): Promise<CLIConnection> {
    // Reuse existing connection
    const idle = this.pool.find(conn => !conn.isActive);
    if (idle) {
      idle.isActive = true;
      this.activeConnections++;
      return idle;
    }
    
    // Create new if under limit
    if (this.activeConnections < this.maxConnections) {
      const conn = await this.createConnection();
      this.pool.push(conn);
      this.activeConnections++;
      return conn;
    }
    
    // Wait for available connection
    return this.waitForConnection();
  }
  
  release(conn: CLIConnection) {
    conn.isActive = false;
    this.activeConnections--;
  }
}
```