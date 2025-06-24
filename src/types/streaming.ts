/**
 * Token-level streaming interfaces for enhanced real-time control
 */

import type { Message } from '../types.js';

// Token chunk structure
export interface TokenChunk {
  /** The token text */
  token: string;
  /** Timestamp when the token was emitted */
  timestamp: number;
  /** Optional metadata about the token */
  metadata?: TokenMetadata;
}

export interface TokenMetadata {
  /** Message ID this token belongs to */
  messageId?: string;
  /** Block index within the message */
  blockIndex?: number;
  /** Token probability (if available) */
  probability?: number;
  /** Alternative tokens that could have been generated */
  alternativeTokens?: string[];
  /** Token position in the stream */
  position?: number;
}

// Stream controller for pause/resume/abort
export interface StreamController {
  /** Pause the stream */
  pause(): void;
  /** Resume a paused stream */
  resume(): void;
  /** Abort the stream with optional reason */
  abort(reason?: string): void;
  /** Check if stream is paused */
  readonly isPaused: boolean;
  /** Check if stream is aborted */
  readonly isAborted: boolean;
  /** Get abort reason if aborted */
  readonly abortReason?: string;
}

// Stream state
export type StreamState = 'active' | 'paused' | 'aborted' | 'completed' | 'error';

// Stream metrics
export interface StreamMetrics {
  /** Total tokens emitted */
  tokensEmitted: number;
  /** Stream duration in milliseconds */
  duration: number;
  /** Current stream state */
  state: StreamState;
  /** Average tokens per second */
  averageTokensPerSecond: number;
  /** Bytes received (if available) */
  bytesReceived?: number;
  /** Last token timestamp */
  lastTokenTime?: number;
  /** Pause count */
  pauseCount?: number;
  /** Total pause duration */
  totalPauseDuration?: number;
}

// Stream options
export interface StreamOptions {
  /** Model being used (affects tokenization) */
  model?: string;
  /** Buffer size for token history */
  bufferSize?: number;
  /** Enable token probability metadata */
  includeTokenProbabilities?: boolean;
  /** Throttle token emission rate (ms between tokens) */
  throttleMs?: number;
  /** Auto-abort on specific patterns */
  abortPatterns?: RegExp[];
  /** Auto-pause on specific patterns */
  pausePatterns?: RegExp[];
}

// Main token stream interface
export interface TokenStream {
  /** Async iterator for tokens */
  tokens(): AsyncGenerator<TokenChunk>;
  /** Get the stream controller */
  getController(): StreamController;
  /** Get current snapshot of buffered tokens */
  getSnapshot(): TokenChunk[];
  /** Get stream metrics */
  getMetrics(): StreamMetrics;
  /** Wait for stream completion */
  waitForCompletion(): Promise<void>;
  /** Add event listener */
  on(event: StreamEvent, handler: StreamEventHandler): void;
  /** Remove event listener */
  off(event: StreamEvent, handler: StreamEventHandler): void;
}

// Stream events
export type StreamEvent = 
  | 'token'
  | 'pause'
  | 'resume'
  | 'abort'
  | 'complete'
  | 'error'
  | 'metrics';

// Event handlers
export type StreamEventHandler = 
  | TokenEventHandler
  | StateEventHandler
  | MetricsEventHandler
  | ErrorEventHandler;

export interface TokenEventHandler {
  (chunk: TokenChunk): void;
}

export interface StateEventHandler {
  (state: StreamState, reason?: string): void;
}

export interface MetricsEventHandler {
  (metrics: StreamMetrics): void;
}

export interface ErrorEventHandler {
  (error: Error): void;
}

// Enhanced stream control with advanced features
export interface EnhancedStreamController extends StreamController {
  /** Set stream speed multiplier (1.0 = normal, 2.0 = double speed) */
  setSpeed(multiplier: number): void;
  /** Skip to end (abort but mark as completed) */
  skipToEnd(): void;
  /** Rewind to a previous token position */
  rewind(position: number): void;
  /** Fast forward by N tokens */
  fastForward(tokens: number): void;
}

// Token stream with control wrapper for fluent API
export interface TokenStreamWithControl {
  /** The token stream */
  stream: TokenStream;
  /** The controller */
  controller: StreamController;
  /** Convenience method to iterate tokens */
  [Symbol.asyncIterator](): AsyncIterator<TokenChunk>;
}

// Tokenizer interface for different models
export interface Tokenizer {
  /** Tokenize text into chunks */
  tokenize(text: string): TokenChunk[];
  /** Estimate token count */
  estimateTokens(text: string): number;
  /** Model name this tokenizer is for */
  readonly model: string;
}

// Factory for creating token streams
export interface TokenStreamFactory {
  /** Create a token stream from a message generator */
  fromMessages(messages: AsyncGenerator<Message>, options?: StreamOptions): TokenStream;
  /** Create a token stream from text chunks */
  fromTextChunks(chunks: AsyncGenerator<string>, options?: StreamOptions): TokenStream;
  /** Create a replay stream from recorded tokens */
  fromRecording(tokens: TokenChunk[], options?: StreamOptions): TokenStream;
}