/**
 * OpenTelemetry provider implementation for Claude SDK
 */

import type {
  TelemetryProvider,
  TelemetryLogger,
  TelemetryConfig,
  TelemetryContext,
  TelemetrySpan,
  SpanStatus,
  SpanOptions,
  QueryMetrics,
  ToolMetrics,
  QueryStartEvent,
  QueryEndEvent,
  ToolStartEvent,
  ToolEndEvent
} from '../types/telemetry.js';
import { ConsoleLogger } from '../logger.js';

export class ClaudeTelemetryProvider implements TelemetryProvider {
  private config?: TelemetryConfig;
  private initialized = false;
  private loggers = new Map<string, ClaudeTelemetryLogger>();
  private queryMetrics: QueryMetrics = this.initializeQueryMetrics();
  private toolMetrics = new Map<string, ToolMetrics>();
  private spans = new Map<string, TelemetrySpanImpl>();
  
  private initializeQueryMetrics(): QueryMetrics {
    return {
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
  }
  
  async initialize(config: TelemetryConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
    
    // Initialize any external telemetry providers here
    // For example, OpenTelemetry SDK initialization
    if (config.endpoint) {
      // Set up OTLP exporter
      // Telemetry initialized with endpoint: ${config.endpoint}
    }
  }
  
  getLogger(name?: string): TelemetryLogger {
    const loggerName = name || 'default';
    
    if (!this.loggers.has(loggerName)) {
      const logger = new ClaudeTelemetryLogger(loggerName, this);
      this.loggers.set(loggerName, logger);
    }
    
    return this.loggers.get(loggerName)!;
  }
  
  async shutdown(): Promise<void> {
    // Flush any pending telemetry data
    await this.forceFlush();
    
    // Clear internal state
    this.initialized = false;
    this.loggers.clear();
    this.spans.clear();
  }
  
  async forceFlush(): Promise<void> {
    // Force flush all pending telemetry data
    // In a real implementation, this would flush to OTLP endpoint
    // Flushing telemetry data...
  }
  
  getQueryMetrics(): QueryMetrics {
    return { ...this.queryMetrics };
  }
  
  getToolMetrics(): Map<string, ToolMetrics> {
    return new Map(this.toolMetrics);
  }
  
  // Internal methods for metrics tracking
  recordQueryStart(_event: QueryStartEvent): void {
    this.queryMetrics.totalQueries++;
  }
  
  recordQueryEnd(event: QueryEndEvent): void {
    if (event.error) {
      this.queryMetrics.failedQueries++;
    } else {
      this.queryMetrics.successfulQueries++;
    }
    
    // Update token metrics
    if (event.usage) {
      this.queryMetrics.totalTokens += (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0);
      this.queryMetrics.inputTokens += event.usage.input_tokens || 0;
      this.queryMetrics.outputTokens += event.usage.output_tokens || 0;
      
      if (event.usage.cache_read_input_tokens && event.usage.cache_read_input_tokens > 0) {
        this.queryMetrics.cacheHits++;
      } else {
        this.queryMetrics.cacheMisses++;
      }
    }
    
    // Update duration metrics (simplified for now)
    if (event.duration) {
      const currentAvg = this.queryMetrics.averageQueryDuration;
      const totalQueries = this.queryMetrics.successfulQueries + this.queryMetrics.failedQueries;
      this.queryMetrics.averageQueryDuration = 
        (currentAvg * (totalQueries - 1) + event.duration) / totalQueries;
    }
  }
  
  recordToolStart(event: ToolStartEvent): void {
    const metrics = this.getOrCreateToolMetrics(event.tool);
    metrics.executionCount++;
  }
  
  recordToolEnd(event: ToolEndEvent): void {
    const metrics = this.getOrCreateToolMetrics(event.tool);
    
    if (event.error) {
      metrics.failureCount++;
    }
    
    if (event.duration) {
      metrics.totalExecutionTime += event.duration;
      metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.executionCount;
    }
    
    metrics.errorRate = metrics.failureCount / metrics.executionCount;
  }
  
  private getOrCreateToolMetrics(tool: string): ToolMetrics {
    if (!this.toolMetrics.has(tool)) {
      this.toolMetrics.set(tool, {
        tool,
        executionCount: 0,
        failureCount: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
        errorRate: 0
      });
    }
    
    return this.toolMetrics.get(tool)!;
  }
  
  // Internal span management
  registerSpan(span: TelemetrySpanImpl): void {
    this.spans.set(span.getSpanContext().spanId!, span);
  }
  
  unregisterSpan(spanId: string): void {
    this.spans.delete(spanId);
  }
}

class ClaudeTelemetryLogger extends ConsoleLogger implements TelemetryLogger {
  private context?: TelemetryContext;
  
  constructor(
    name: string,
    private provider: ClaudeTelemetryProvider
  ) {
    super(name);
  }
  
  startSpan(name: string, options?: SpanOptions): TelemetrySpan {
    const spanId = this.generateSpanId();
    const traceId = options?.parent?.traceId || this.context?.traceId || this.generateTraceId();
    
    const context: TelemetryContext = {
      traceId,
      spanId,
      parentSpanId: options?.parent?.spanId || this.context?.spanId,
      baggage: {
        ...this.context?.baggage,
        ...options?.parent?.baggage
      }
    };
    
    const span = new TelemetrySpanImpl(name, context, options, this.provider);
    this.provider.registerSpan(span);
    
    return span;
  }
  
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    // Record metric with labels
    // In a real implementation, this would send to metrics backend
    this.debug(`Metric recorded: ${name} = ${value}`, { labels });
  }
  
  setContext(context: TelemetryContext): void {
    this.context = context;
  }
  
  getContext(): TelemetryContext | undefined {
    return this.context;
  }
  
  child(context: TelemetryContext): TelemetryLogger {
    const childLogger = new ClaudeTelemetryLogger(`${this.name}:child`, this.provider);
    childLogger.setContext({
      ...this.context,
      ...context
    });
    return childLogger;
  }
  
  private generateSpanId(): string {
    return Math.random().toString(36).substring(2, 18);
  }
  
  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 34);
  }
}

class TelemetrySpanImpl implements TelemetrySpan {
  private status: SpanStatus = 'unset';
  private statusMessage?: string;
  private attributes: Record<string, any> = {};
  private events: Array<{ name: string; timestamp: number; attributes?: Record<string, any> }> = [];
  private exceptions: Error[] = [];
  private ended = false;
  private startTime = Date.now();
  private endTime?: number;
  
  constructor(
    private name: string,
    private context: TelemetryContext,
    private options?: SpanOptions,
    private provider?: ClaudeTelemetryProvider
  ) {
    if (options?.attributes) {
      this.attributes = { ...options.attributes };
    }
  }
  
  end(): void {
    if (!this.ended) {
      this.ended = true;
      this.endTime = Date.now();
      
      if (this.provider) {
        this.provider.unregisterSpan(this.context.spanId!);
      }
    }
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
  
  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }
  
  setAttributes(attributes: Record<string, any>): void {
    Object.assign(this.attributes, attributes);
  }
  
  recordException(error: Error): void {
    this.exceptions.push(error);
    this.setStatus('error', error.message);
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack
    });
  }
  
  getSpanContext(): TelemetryContext {
    return { ...this.context };
  }
  
  updateName(name: string): void {
    this.name = name;
  }
  
  // Internal getters for testing
  getDuration(): number | undefined {
    if (this.endTime) {
      return this.endTime - this.startTime;
    }
    return undefined;
  }
  
  getAttributes(): Record<string, any> {
    return { ...this.attributes };
  }
  
  getStatus(): { status: SpanStatus; message?: string } {
    return { status: this.status, message: this.statusMessage };
  }
}

// Telemetry utilities
export class TelemetryUtils {
  /**
   * Extract trace context from headers
   */
  static extractTraceContext(headers: Record<string, string>): TelemetryContext {
    const context: TelemetryContext = {};
    
    // W3C Trace Context
    if (headers['traceparent']) {
      const parts = headers['traceparent'].split('-');
      if (parts.length >= 3) {
        context.traceId = parts[1];
        context.spanId = parts[2];
      }
    }
    
    // Fallback to custom headers
    if (!context.traceId && headers['x-trace-id']) {
      context.traceId = headers['x-trace-id'];
    }
    
    if (!context.spanId && headers['x-span-id']) {
      context.spanId = headers['x-span-id'];
    }
    
    // Extract baggage
    if (headers['baggage']) {
      context.baggage = {};
      const pairs = headers['baggage'].split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key && value) {
          context.baggage[key.trim()] = decodeURIComponent(value.trim());
        }
      }
    }
    
    return context;
  }
  
  /**
   * Inject trace context into headers
   */
  static injectTraceContext(context: TelemetryContext, headers: Record<string, string>): void {
    if (context.traceId && context.spanId) {
      // W3C Trace Context format
      headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
      
      // Custom headers for compatibility
      headers['x-trace-id'] = context.traceId;
      headers['x-span-id'] = context.spanId;
    }
    
    // Inject baggage
    if (context.baggage && Object.keys(context.baggage).length > 0) {
      const baggageItems = Object.entries(context.baggage)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join(',');
      headers['baggage'] = baggageItems;
    }
  }
  
  /**
   * Create a no-op telemetry provider
   */
  static createNoOpProvider(): TelemetryProvider {
    return new NoOpTelemetryProvider();
  }
}

// No-op implementation for when telemetry is disabled
class NoOpTelemetryProvider implements TelemetryProvider {
  async initialize(_config: TelemetryConfig): Promise<void> {}
  
  getLogger(_name?: string): TelemetryLogger {
    return new NoOpTelemetryLogger();
  }
  
  async shutdown(): Promise<void> {}
  async forceFlush(): Promise<void> {}
  
  getQueryMetrics(): QueryMetrics {
    return {
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
  }
  
  getToolMetrics(): Map<string, ToolMetrics> {
    return new Map();
  }
}

class NoOpTelemetryLogger extends ConsoleLogger implements TelemetryLogger {
  constructor() {
    super('noop');
  }
  
  startSpan(_name: string, _options?: SpanOptions): TelemetrySpan {
    return new NoOpTelemetrySpan();
  }
  
  recordMetric(_name: string, _value: number, _labels?: Record<string, string>): void {}
  setContext(_context: TelemetryContext): void {}
  getContext(): TelemetryContext | undefined { return undefined; }
  
  child(_context: TelemetryContext): TelemetryLogger {
    return this;
  }
}

class NoOpTelemetrySpan implements TelemetrySpan {
  end(): void {}
  setStatus(_status: SpanStatus, _message?: string): void {}
  addEvent(_name: string, _attributes?: Record<string, unknown>): void {}
  setAttribute(_key: string, _value: unknown): void {}
  setAttributes(_attributes: Record<string, unknown>): void {}
  recordException(_error: Error): void {}
  getSpanContext(): TelemetryContext { return {}; }
  updateName(_name: string): void {}
}

// Export factory functions
export function createTelemetryProvider(): TelemetryProvider {
  return new ClaudeTelemetryProvider();
}