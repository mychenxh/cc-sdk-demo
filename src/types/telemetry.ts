/**
 * OpenTelemetry integration interfaces for observability
 */

import type { Logger } from '../logger.js';
import type { ClaudeCodeOptions } from '../types.js';

// Telemetry context for distributed tracing
export interface TelemetryContext {
  /** Trace ID for distributed tracing */
  traceId?: string;
  /** Span ID for the current operation */
  spanId?: string;
  /** Parent span ID */
  parentSpanId?: string;
  /** User ID for attribution */
  userId?: string;
  /** Session ID for grouping */
  sessionId?: string;
  /** Additional baggage */
  baggage?: Record<string, string>;
}

// Span status
export type SpanStatus = 'unset' | 'ok' | 'error';

// Span kind
export type SpanKind = 'internal' | 'server' | 'client' | 'producer' | 'consumer';

// Telemetry span interface
export interface TelemetrySpan {
  /** End the span */
  end(): void;
  /** Set span status */
  setStatus(status: SpanStatus, message?: string): void;
  /** Add an event to the span */
  addEvent(name: string, attributes?: Record<string, any>): void;
  /** Set an attribute on the span */
  setAttribute(key: string, value: unknown): void;
  /** Set multiple attributes */
  setAttributes(attributes: Record<string, any>): void;
  /** Record an exception */
  recordException(error: Error): void;
  /** Get span context */
  getSpanContext(): TelemetryContext;
  /** Update span name */
  updateName(name: string): void;
}

// Enhanced logger interface with telemetry support
export interface TelemetryLogger extends Logger {
  /** Start a new span */
  startSpan(name: string, options?: SpanOptions): TelemetrySpan;
  /** Record a metric */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
  /** Set telemetry context */
  setContext(context: TelemetryContext): void;
  /** Get current context */
  getContext(): TelemetryContext | undefined;
  /** Create a child logger with context */
  child(context: TelemetryContext): TelemetryLogger;
}

// Span options
export interface SpanOptions {
  /** Parent context */
  parent?: TelemetryContext;
  /** Span kind */
  kind?: SpanKind;
  /** Initial attributes */
  attributes?: Record<string, any>;
  /** Start time (if not now) */
  startTime?: number;
  /** Links to other spans */
  links?: SpanLink[];
}

// Link to another span
export interface SpanLink {
  /** Context of the linked span */
  context: TelemetryContext;
  /** Attributes for the link */
  attributes?: Record<string, any>;
}

// Metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// Metric definition
export interface MetricDefinition {
  /** Metric name */
  name: string;
  /** Metric type */
  type: MetricType;
  /** Description */
  description?: string;
  /** Unit of measurement */
  unit?: string;
  /** Value boundaries for histogram */
  boundaries?: number[];
}

// Query metrics
export interface QueryMetrics {
  /** Total number of queries */
  totalQueries: number;
  /** Successful queries */
  successfulQueries: number;
  /** Failed queries */
  failedQueries: number;
  /** Total tokens used */
  totalTokens: number;
  /** Input tokens */
  inputTokens: number;
  /** Output tokens */
  outputTokens: number;
  /** Cache hits */
  cacheHits: number;
  /** Cache misses */
  cacheMisses: number;
  /** Average query duration in ms */
  averageQueryDuration: number;
  /** P95 query duration in ms */
  p95QueryDuration: number;
  /** P99 query duration in ms */
  p99QueryDuration: number;
}

// Tool execution metrics
export interface ToolMetrics {
  /** Tool name */
  tool: string;
  /** Number of executions */
  executionCount: number;
  /** Number of failures */
  failureCount: number;
  /** Average execution time in ms */
  averageExecutionTime: number;
  /** Total execution time in ms */
  totalExecutionTime: number;
  /** Error rate */
  errorRate: number;
}

// Telemetry provider interface
export interface TelemetryProvider {
  /** Initialize the provider */
  initialize(config: TelemetryConfig): Promise<void>;
  /** Get a logger instance */
  getLogger(name?: string): TelemetryLogger;
  /** Shutdown the provider */
  shutdown(): Promise<void>;
  /** Force flush all pending data */
  forceFlush(): Promise<void>;
  /** Get query metrics */
  getQueryMetrics(): QueryMetrics;
  /** Get tool metrics */
  getToolMetrics(): Map<string, ToolMetrics>;
}

// Telemetry configuration
export interface TelemetryConfig {
  /** Service name */
  serviceName: string;
  /** Service version */
  serviceVersion?: string;
  /** Environment */
  environment?: string;
  /** General endpoint (can be used for both traces and metrics) */
  endpoint?: string;
  /** Endpoint for traces */
  traceEndpoint?: string;
  /** Endpoint for metrics */
  metricsEndpoint?: string;
  /** Headers for authentication */
  headers?: Record<string, string>;
  /** Export interval in ms */
  exportInterval?: number;
  /** Batch size for export */
  batchSize?: number;
  /** Additional resource attributes */
  resourceAttributes?: Record<string, any>;
  /** Sampling configuration */
  sampling?: SamplingConfig;
  /** Enable auto-instrumentation */
  autoInstrumentation?: boolean;
}

// Sampling configuration
export interface SamplingConfig {
  /** Sampling strategy */
  strategy: 'always' | 'never' | 'probability' | 'adaptive';
  /** Probability for probability sampling (0-1) */
  probability?: number;
  /** Rate limit for adaptive sampling */
  rateLimit?: number;
  /** Rules for specific operations */
  rules?: SamplingRule[];
}

// Sampling rule
export interface SamplingRule {
  /** Operation name pattern */
  operation: string | RegExp;
  /** Sampling probability for this operation */
  probability: number;
}

// Telemetry events
export interface TelemetryEvents {
  /** Query lifecycle events */
  query: {
    start: QueryStartEvent;
    end: QueryEndEvent;
    error: QueryErrorEvent;
  };
  /** Tool execution events */
  tool: {
    start: ToolStartEvent;
    end: ToolEndEvent;
    error: ToolErrorEvent;
  };
  /** Stream events */
  stream: {
    start: StreamStartEvent;
    chunk: StreamChunkEvent;
    end: StreamEndEvent;
    abort: StreamAbortEvent;
  };
}

// Query start event
export interface QueryStartEvent {
  /** Unique query ID */
  queryId: string;
  /** Prompt */
  prompt: string;
  /** Options */
  options: ClaudeCodeOptions;
  /** Timestamp */
  timestamp: number;
  /** Parent context */
  parentContext?: TelemetryContext;
}

// Query end event
export interface QueryEndEvent {
  /** Query ID */
  queryId: string;
  /** Duration in ms */
  duration: number;
  /** Token usage */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  /** Success status */
  success: boolean;
  /** Result summary */
  resultSummary?: string;
  /** Error if failed */
  error?: Error;
}

// Query error event
export interface QueryErrorEvent {
  /** Query ID */
  queryId: string;
  /** Error */
  error: Error;
  /** Error type */
  errorType: string;
  /** Retry attempt */
  retryAttempt?: number;
}

// Tool start event
export interface ToolStartEvent {
  /** Tool use ID */
  toolUseId: string;
  /** Tool name */
  tool: string;
  /** Tool input */
  input: unknown;
  /** Parent query ID */
  queryId: string;
  /** Timestamp */
  timestamp: number;
}

// Tool end event
export interface ToolEndEvent {
  /** Tool use ID */
  toolUseId: string;
  /** Tool name */
  tool: string;
  /** Duration in ms */
  duration: number;
  /** Success status */
  success: boolean;
  /** Result size in bytes */
  resultSize?: number;
  /** Error if failed */
  error?: Error;
}

// Tool error event
export interface ToolErrorEvent {
  /** Tool use ID */
  toolUseId: string;
  /** Error */
  error: Error;
  /** Error type */
  errorType: string;
}

// Stream start event
export interface StreamStartEvent {
  /** Stream ID */
  streamId: string;
  /** Parent query ID */
  queryId: string;
  /** Expected chunks */
  expectedChunks?: number;
  /** Timestamp */
  timestamp: number;
}

// Stream chunk event
export interface StreamChunkEvent {
  /** Stream ID */
  streamId: string;
  /** Chunk index */
  chunkIndex: number;
  /** Chunk size in bytes */
  chunkSize: number;
  /** Chunk type */
  chunkType: 'text' | 'tool_use' | 'tool_result';
}

// Stream end event
export interface StreamEndEvent {
  /** Stream ID */
  streamId: string;
  /** Total chunks */
  totalChunks: number;
  /** Total bytes */
  totalBytes: number;
  /** Duration in ms */
  duration: number;
}

// Stream abort event
export interface StreamAbortEvent {
  /** Stream ID */
  streamId: string;
  /** Abort reason */
  reason: string;
  /** Chunks received before abort */
  chunksReceived: number;
}

// Built-in metric definitions
export const BUILTIN_METRICS: Record<string, MetricDefinition> = {
  queries: {
    name: 'claude_sdk_queries_total',
    type: 'counter',
    description: 'Total number of queries',
    unit: 'query'
  },
  queryDuration: {
    name: 'claude_sdk_query_duration',
    type: 'histogram',
    description: 'Query duration',
    unit: 'ms',
    boundaries: [10, 50, 100, 500, 1000, 5000, 10000, 30000, 60000]
  },
  tokens: {
    name: 'claude_sdk_tokens_total',
    type: 'counter',
    description: 'Total tokens used',
    unit: 'token'
  },
  toolExecutions: {
    name: 'claude_sdk_tool_executions_total',
    type: 'counter',
    description: 'Total tool executions',
    unit: 'execution'
  },
  toolDuration: {
    name: 'claude_sdk_tool_duration',
    type: 'histogram',
    description: 'Tool execution duration',
    unit: 'ms',
    boundaries: [1, 5, 10, 50, 100, 500, 1000, 5000]
  },
  errors: {
    name: 'claude_sdk_errors_total',
    type: 'counter',
    description: 'Total errors',
    unit: 'error'
  },
  retries: {
    name: 'claude_sdk_retries_total',
    type: 'counter',
    description: 'Total retry attempts',
    unit: 'retry'
  },
  activeStreams: {
    name: 'claude_sdk_active_streams',
    type: 'gauge',
    description: 'Number of active streams',
    unit: 'stream'
  }
};

// Telemetry utilities
export class TelemetryUtils {
  /** Extract trace context from headers */
  static extractTraceContext(headers: Record<string, string>): TelemetryContext | undefined {
    const traceId = headers['x-trace-id'] || headers['traceparent']?.split('-')[1];
    const spanId = headers['x-span-id'] || headers['traceparent']?.split('-')[2];
    
    if (!traceId) return undefined;
    
    return {
      traceId,
      spanId,
      baggage: this.extractBaggage(headers)
    };
  }
  
  /** Inject trace context into headers */
  static injectTraceContext(context: TelemetryContext, headers: Record<string, string>): void {
    if (context.traceId) {
      headers['x-trace-id'] = context.traceId;
      if (context.spanId) {
        headers['x-span-id'] = context.spanId;
        headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
      }
    }
    
    if (context.baggage) {
      headers['baggage'] = Object.entries(context.baggage)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
    }
  }
  
  /** Extract baggage from headers */
  private static extractBaggage(headers: Record<string, string>): Record<string, string> | undefined {
    const baggage = headers['baggage'];
    if (!baggage) return undefined;
    
    const result: Record<string, string> = {};
    baggage.split(',').forEach(item => {
      const [key, value] = item.split('=');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    });
    
    return Object.keys(result).length > 0 ? result : undefined;
  }
}