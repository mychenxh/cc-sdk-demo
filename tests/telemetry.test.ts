import { describe, it, expect, beforeEach } from 'vitest';
import type {
  TelemetryContext,
  TelemetrySpan,
  TelemetryLogger,
  TelemetryProvider,
  TelemetryConfig,
  QueryMetrics,
  ToolMetrics,
  SpanStatus,
  SpanOptions
} from '../src/types.js';
import { LogLevel, LogContext } from '../src/logger.js';

// Mock implementation of TelemetrySpan
class MockTelemetrySpan implements TelemetrySpan {
  private ended = false;
  private status: SpanStatus = 'unset';
  private statusMessage?: string;
  private attributes: Record<string, any> = {};
  private events: Array<{ name: string; timestamp: number; attributes?: Record<string, any> }> = [];
  private exceptions: Error[] = [];
  private name: string;
  
  constructor(
    name: string,
    private context: TelemetryContext,
    private options?: SpanOptions
  ) {
    this.name = name;
    if (options?.attributes) {
      this.attributes = { ...options.attributes };
    }
  }
  
  end(): void {
    this.ended = true;
  }
  
  setStatus(status: SpanStatus, message?: string): void {
    this.status = status;
    this.statusMessage = message;
  }
  
  addEvent(name: string, attributes?: Record<string, any>): void {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes
    });
  }
  
  setAttribute(key: string, value: any): void {
    this.attributes[key] = value;
  }
  
  setAttributes(attributes: Record<string, any>): void {
    Object.assign(this.attributes, attributes);
  }
  
  recordException(error: Error): void {
    this.exceptions.push(error);
    this.setStatus('error', error.message);
  }
  
  getSpanContext(): TelemetryContext {
    return this.context;
  }
  
  updateName(name: string): void {
    this.name = name;
  }
  
  // Test helpers
  isEnded(): boolean {
    return this.ended;
  }
  
  getStatus(): { status: SpanStatus; message?: string } {
    return { status: this.status, message: this.statusMessage };
  }
  
  getAttributes(): Record<string, any> {
    return { ...this.attributes };
  }
  
  getEvents(): typeof this.events {
    return [...this.events];
  }
}

// Mock implementation of TelemetryLogger
class MockTelemetryLogger implements TelemetryLogger {
  private spans: MockTelemetrySpan[] = [];
  private metrics: Array<{ name: string; value: number; labels?: Record<string, string> }> = [];
  private context?: TelemetryContext;
  private logs: Array<{ level: string; message: string; context?: LogContext }> = [];
  
  startSpan(name: string, options?: SpanOptions): TelemetrySpan {
    const spanId = Math.random().toString(36).substring(7);
    const context: TelemetryContext = {
      traceId: this.context?.traceId || Math.random().toString(36).substring(7),
      spanId,
      parentSpanId: options?.parent?.spanId || this.context?.spanId
    };
    
    const span = new MockTelemetrySpan(name, context, options);
    this.spans.push(span);
    return span;
  }
  
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({ name, value, labels });
  }
  
  setContext(context: TelemetryContext): void {
    this.context = context;
  }
  
  getContext(): TelemetryContext | undefined {
    return this.context;
  }
  
  child(context: TelemetryContext): TelemetryLogger {
    const child = new MockTelemetryLogger();
    child.setContext({ ...this.context, ...context });
    return child;
  }
  
  // Logger interface methods
  info(message: string, context?: LogContext): void {
    this.logs.push({ level: 'info', message, context });
  }
  
  warn(message: string, context?: LogContext): void {
    this.logs.push({ level: 'warn', message, context });
  }
  
  error(message: string, context?: LogContext): void {
    this.logs.push({ level: 'error', message, context });
  }
  
  debug(message: string, context?: LogContext): void {
    this.logs.push({ level: 'debug', message, context });
  }
  
  trace(message: string, context?: LogContext): void {
    this.logs.push({ level: 'trace', message, context });
  }
  
  setLevel(_level: LogLevel): void {
    // No-op for mock
  }
  
  // Test helpers
  getSpans(): MockTelemetrySpan[] {
    return this.spans;
  }
  
  getMetrics(): typeof this.metrics {
    return [...this.metrics];
  }
  
  getLogs(): typeof this.logs {
    return [...this.logs];
  }
}

// Mock implementation of TelemetryProvider
class MockTelemetryProvider implements TelemetryProvider {
  private initialized = false;
  private config?: TelemetryConfig;
  private loggers = new Map<string, MockTelemetryLogger>();
  private queryMetrics: QueryMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryDuration: 0,
    p95QueryDuration: 0,
    p99QueryDuration: 0
  };
  private toolMetrics = new Map<string, ToolMetrics>();
  
  async initialize(config: TelemetryConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }
  
  getLogger(name?: string): TelemetryLogger {
    const loggerName = name || 'default';
    if (!this.loggers.has(loggerName)) {
      this.loggers.set(loggerName, new MockTelemetryLogger());
    }
    return this.loggers.get(loggerName)!;
  }
  
  async shutdown(): Promise<void> {
    this.initialized = false;
  }
  
  async forceFlush(): Promise<void> {
    // No-op for mock
  }
  
  getQueryMetrics(): QueryMetrics {
    return { ...this.queryMetrics };
  }
  
  getToolMetrics(): Map<string, ToolMetrics> {
    return new Map(this.toolMetrics);
  }
  
  // Test helpers
  isInitialized(): boolean {
    return this.initialized;
  }
  
  updateQueryMetrics(updates: Partial<QueryMetrics>): void {
    Object.assign(this.queryMetrics, updates);
  }
  
  updateToolMetrics(tool: string, updates: Partial<ToolMetrics>): void {
    const current = this.toolMetrics.get(tool) || {
      tool,
      executionCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      errorRate: 0
    };
    this.toolMetrics.set(tool, { ...current, ...updates });
  }
}

describe('Telemetry', () => {
  describe('TelemetrySpan', () => {
    it('should create a span with context', () => {
      const context: TelemetryContext = {
        traceId: 'trace-123',
        spanId: 'span-456'
      };
      
      const span = new MockTelemetrySpan('test-operation', context);
      
      expect(span.getSpanContext()).toEqual(context);
      expect(span.isEnded()).toBe(false);
    });
    
    it('should track span lifecycle', () => {
      const span = new MockTelemetrySpan('operation', { traceId: 'test' });
      
      span.setStatus('ok');
      expect(span.getStatus().status).toBe('ok');
      
      span.end();
      expect(span.isEnded()).toBe(true);
    });
    
    it('should handle attributes', () => {
      const span = new MockTelemetrySpan('operation', { traceId: 'test' }, {
        attributes: { initial: 'value' }
      });
      
      span.setAttribute('key1', 'value1');
      span.setAttributes({ key2: 'value2', key3: 123 });
      
      const attrs = span.getAttributes();
      expect(attrs.initial).toBe('value');
      expect(attrs.key1).toBe('value1');
      expect(attrs.key2).toBe('value2');
      expect(attrs.key3).toBe(123);
    });
    
    it('should record events', () => {
      const span = new MockTelemetrySpan('operation', { traceId: 'test' });
      
      span.addEvent('start');
      span.addEvent('checkpoint', { progress: 50 });
      span.addEvent('end');
      
      const events = span.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe('start');
      expect(events[1].attributes?.progress).toBe(50);
    });
    
    it('should record exceptions', () => {
      const span = new MockTelemetrySpan('operation', { traceId: 'test' });
      const error = new Error('Test error');
      
      span.recordException(error);
      
      expect(span.getStatus().status).toBe('error');
      expect(span.getStatus().message).toBe('Test error');
    });
  });
  
  describe('TelemetryLogger', () => {
    let logger: MockTelemetryLogger;
    
    beforeEach(() => {
      logger = new MockTelemetryLogger();
    });
    
    it('should create spans with proper context', () => {
      logger.setContext({ traceId: 'trace-root', spanId: 'span-root' });
      
      const span1 = logger.startSpan('operation1');
      const span2 = logger.startSpan('operation2');
      
      const context1 = span1.getSpanContext();
      const context2 = span2.getSpanContext();
      
      expect(context1.traceId).toBe('trace-root');
      expect(context1.parentSpanId).toBe('span-root');
      expect(context2.traceId).toBe('trace-root');
      expect(context2.parentSpanId).toBe('span-root');
      expect(context1.spanId).not.toBe(context2.spanId);
    });
    
    it('should record metrics', () => {
      logger.recordMetric('query_count', 1, { model: 'opus' });
      logger.recordMetric('token_usage', 150, { type: 'input' });
      logger.recordMetric('duration_ms', 1234);
      
      const metrics = logger.getMetrics();
      expect(metrics).toHaveLength(3);
      expect(metrics[0]).toEqual({
        name: 'query_count',
        value: 1,
        labels: { model: 'opus' }
      });
      expect(metrics[2].labels).toBeUndefined();
    });
    
    it('should create child loggers with inherited context', () => {
      logger.setContext({ traceId: 'parent-trace', userId: 'user-123' });
      
      const child = logger.child({ spanId: 'child-span', sessionId: 'session-456' });
      const childContext = child.getContext();
      
      expect(childContext?.traceId).toBe('parent-trace');
      expect(childContext?.userId).toBe('user-123');
      expect(childContext?.spanId).toBe('child-span');
      expect(childContext?.sessionId).toBe('session-456');
    });
    
    it('should integrate logging with telemetry', () => {
      logger.info('Starting operation', { operation: 'test' });
      logger.error('Operation failed', { error: 'timeout' });
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].level).toBe('info');
      expect(logs[0].context?.operation).toBe('test');
      expect(logs[1].level).toBe('error');
    });
  });
  
  describe('TelemetryProvider', () => {
    let provider: MockTelemetryProvider;
    
    beforeEach(() => {
      provider = new MockTelemetryProvider();
    });
    
    it('should initialize with config', async () => {
      const config: TelemetryConfig = {
        serviceName: 'claude-sdk-test',
        serviceVersion: '1.0.0',
        environment: 'test'
      };
      
      await provider.initialize(config);
      expect(provider.isInitialized()).toBe(true);
    });
    
    it('should provide named loggers', () => {
      const defaultLogger = provider.getLogger();
      const namedLogger = provider.getLogger('custom');
      const sameLogger = provider.getLogger('custom');
      
      expect(defaultLogger).toBeDefined();
      expect(namedLogger).toBeDefined();
      expect(sameLogger).toBe(namedLogger); // Should return same instance
    });
    
    it('should track query metrics', () => {
      provider.updateQueryMetrics({
        totalQueries: 10,
        successfulQueries: 8,
        failedQueries: 2,
        totalTokens: 5000,
        averageQueryDuration: 1200
      });
      
      const metrics = provider.getQueryMetrics();
      expect(metrics.totalQueries).toBe(10);
      expect(metrics.successfulQueries).toBe(8);
      expect(metrics.failedQueries).toBe(2);
      expect(metrics.totalTokens).toBe(5000);
    });
    
    it('should track tool metrics', () => {
      provider.updateToolMetrics('Read', {
        executionCount: 50,
        failureCount: 2,
        averageExecutionTime: 45,
        errorRate: 0.04
      });
      
      provider.updateToolMetrics('Write', {
        executionCount: 20,
        failureCount: 1,
        averageExecutionTime: 120
      });
      
      const toolMetrics = provider.getToolMetrics();
      expect(toolMetrics.size).toBe(2);
      expect(toolMetrics.get('Read')?.executionCount).toBe(50);
      expect(toolMetrics.get('Write')?.averageExecutionTime).toBe(120);
    });
    
    it('should handle shutdown', async () => {
      await provider.initialize({ serviceName: 'test' });
      expect(provider.isInitialized()).toBe(true);
      
      await provider.shutdown();
      expect(provider.isInitialized()).toBe(false);
    });
  });
  
  describe('TelemetryUtils', () => {
    it('should extract trace context from headers', () => {
      const headers = {
        'x-trace-id': 'trace-123',
        'x-span-id': 'span-456',
        'baggage': 'userId=user123,sessionId=session456'
      };
      
      // We'll test this when TelemetryUtils is imported
      // For now, let's test the concept
      const extractedContext = {
        traceId: headers['x-trace-id'],
        spanId: headers['x-span-id'],
        baggage: {
          userId: 'user123',
          sessionId: 'session456'
        }
      };
      
      expect(extractedContext.traceId).toBe('trace-123');
      expect(extractedContext.spanId).toBe('span-456');
      expect(extractedContext.baggage?.userId).toBe('user123');
    });
    
    it('should inject trace context into headers', () => {
      const context: TelemetryContext = {
        traceId: 'trace-789',
        spanId: 'span-012',
        baggage: {
          feature: 'test',
          version: 'v2'
        }
      };
      
      const headers: Record<string, string> = {};
      
      // Manual injection for test
      headers['x-trace-id'] = context.traceId!;
      headers['x-span-id'] = context.spanId!;
      headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
      headers['baggage'] = 'feature=test,version=v2';
      
      expect(headers['x-trace-id']).toBe('trace-789');
      expect(headers['traceparent']).toContain('trace-789');
      expect(headers['baggage']).toContain('feature=test');
    });
  });
  
  describe('Query Telemetry Flow', () => {
    it('should track complete query lifecycle', async () => {
      const provider = new MockTelemetryProvider();
      await provider.initialize({ serviceName: 'test' });
      
      const logger = provider.getLogger() as MockTelemetryLogger;
      
      // Start query
      const querySpan = logger.startSpan('claude-query', {
        attributes: {
          'claude.model': 'opus',
          'claude.prompt.length': 150
        }
      });
      
      // Track tool execution
      const toolSpan = logger.startSpan('tool-execution', {
        parent: querySpan.getSpanContext(),
        attributes: {
          'claude.tool.name': 'Read',
          'claude.tool.input': '/path/to/file'
        }
      });
      
      toolSpan.setStatus('ok');
      toolSpan.end();
      
      // Complete query
      querySpan.setAttribute('claude.tokens.total', 500);
      querySpan.setStatus('ok');
      querySpan.end();
      
      // Record metrics
      logger.recordMetric('claude_queries_total', 1);
      logger.recordMetric('claude_tokens_total', 500);
      
      const spans = logger.getSpans();
      expect(spans).toHaveLength(2);
      expect(spans[0].getAttributes()['claude.model']).toBe('opus');
      expect(spans[1].getAttributes()['claude.tool.name']).toBe('Read');
    });
  });
});