/**
 * Token-level streaming implementation for Claude SDK
 */

import type {
  TokenStream,
  TokenChunk,
  StreamController,
  StreamMetrics,
  StreamState,
  StreamEvent,
  StreamEventHandler
} from '../types/streaming.js';
import type { Message, AssistantMessage, TextBlock } from '../types.js';

export class TokenStreamImpl implements TokenStream {
  private controller: StreamControllerImpl;
  private snapshot: TokenChunk[] = [];
  private metrics: StreamMetrics;
  private messageGenerator: AsyncGenerator<Message>;
  private tokenGenerator?: AsyncGenerator<TokenChunk>;
  private completionPromise: Promise<void>;
  private completionResolve?: () => void;
  private completionReject?: (error: Error) => void;
  private eventHandlers = new Map<StreamEvent, Set<StreamEventHandler>>();
  private startTime: number;
  
  constructor(messageGenerator: AsyncGenerator<Message>) {
    this.messageGenerator = messageGenerator;
    this.controller = new StreamControllerImpl();
    this.startTime = Date.now();
    this.metrics = {
      tokensEmitted: 0,
      duration: 0,
      state: 'active',
      averageTokensPerSecond: 0,
      bytesReceived: 0,
      lastTokenTime: undefined,
      pauseCount: 0,
      totalPauseDuration: 0
    };
    
    this.completionPromise = new Promise((resolve, reject) => {
      this.completionResolve = resolve;
      this.completionReject = reject;
    });
  }
  
  async *tokens(): AsyncGenerator<TokenChunk> {
    if (this.tokenGenerator) {
      // Return existing generator if already created
      yield* this.tokenGenerator;
      return;
    }
    
    // Create new token generator
    this.tokenGenerator = this.createTokenGenerator();
    yield* this.tokenGenerator;
  }
  
  private async *createTokenGenerator(): AsyncGenerator<TokenChunk> {
    try {
      let currentTextBlock: string = '';
      
      for await (const message of this.messageGenerator) {
        // Check if paused or aborted
        await this.controller.checkPause();
        if (this.controller.isAborted) {
          throw new Error('Stream aborted');
        }
        
        // Process assistant messages for text content
        if (message.type === 'assistant') {
          const assistantMessage = message as AssistantMessage;
          
          for (const block of assistantMessage.content) {
            await this.controller.checkPause();
            if (this.controller.isAborted) {
              throw new Error('Stream aborted');
            }
            
            if (block.type === 'text') {
              const textBlock = block as TextBlock;
              const text = textBlock.text;
              
              // Split into tokens (simple word-based tokenization for now)
              // In production, this would use proper tokenization
              const tokens = this.tokenizeText(text, currentTextBlock);
              
              for (const token of tokens) {
                await this.controller.checkPause();
                if (this.controller.isAborted) {
                  throw new Error('Stream aborted');
                }
                
                const chunk: TokenChunk = {
                  token,
                  timestamp: Date.now(),
                  metadata: {
                    messageId: `msg-${Date.now()}`,
                    blockIndex: 0,
                    position: this.metrics.tokensEmitted
                  }
                };
                
                this.snapshot.push(chunk);
                this.metrics.tokensEmitted++;
                this.metrics.bytesReceived = (this.metrics.bytesReceived || 0) + new TextEncoder().encode(token).length;
                this.metrics.lastTokenTime = Date.now();
                
                // Update metrics
                this.updateMetrics();
                
                // Emit token event
                this.emit('token', chunk);
                
                yield chunk;
              }
              
              currentTextBlock = text;
            }
          }
        }
      }
      
      this.metrics.state = 'completed';
      this.updateMetrics();
      this.emit('complete', this.metrics.state);
      if (this.completionResolve) this.completionResolve();
    } catch (error) {
      this.metrics.state = 'error';
      this.updateMetrics();
      this.emit('error', error);
      if (this.completionReject) this.completionReject(error as Error);
      throw error;
    }
  }
  
  private tokenizeText(text: string, previousText: string): string[] {
    // Simple token extraction that preserves word boundaries and punctuation
    const tokens: string[] = [];
    
    // If we have previous text, find the difference
    if (previousText && text.startsWith(previousText)) {
      const newText = text.substring(previousText.length);
      if (newText) {
        // Split on word boundaries but keep delimiters
        const parts = newText.split(/(\s+|[.,!?;:])/);
        for (const part of parts) {
          if (part) {
            tokens.push(part);
          }
        }
      }
    } else {
      // Process entire text
      const parts = text.split(/(\s+|[.,!?;:])/);
      for (const part of parts) {
        if (part) {
          tokens.push(part);
        }
      }
    }
    
    return tokens;
  }
  
  private updateMetrics(): void {
    this.metrics.duration = Date.now() - this.startTime;
    if (this.metrics.tokensEmitted > 0 && this.metrics.duration > 0) {
      this.metrics.averageTokensPerSecond = this.metrics.tokensEmitted / (this.metrics.duration / 1000);
    }
    
    // Update pause metrics from controller
    this.metrics.pauseCount = this.controller.getPauseCount();
    this.metrics.totalPauseDuration = this.controller.getTotalPauseDuration();
  }
  
  getController(): StreamController {
    return this.controller;
  }
  
  getSnapshot(): TokenChunk[] {
    return [...this.snapshot];
  }
  
  getMetrics(): StreamMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }
  
  async waitForCompletion(): Promise<void> {
    return this.completionPromise;
  }
  
  on(event: StreamEvent, handler: StreamEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: StreamEvent, handler: StreamEventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  private emit(event: StreamEvent, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data as any);
        } catch (error) {
          // Error in ${event} handler - silently continue
        }
      }
    }
    
    // Also emit metrics event on certain events
    if (['token', 'pause', 'resume', 'complete', 'error'].includes(event)) {
      this.emit('metrics', this.getMetrics());
    }
  }
}

class StreamControllerImpl implements StreamController {
  private state: StreamState = 'active';
  private pausePromise?: Promise<void>;
  private pauseResolve?: () => void;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private pauseStartTime?: number;
  private _abortReason?: string;
  private pauseCount = 0;
  private totalPauseDuration = 0;
  
  pause(): void {
    if (this.state === 'active') {
      this.state = 'paused';
      this.pauseStartTime = Date.now();
      this.pauseCount++;
      this.pausePromise = new Promise(resolve => {
        this.pauseResolve = resolve;
      });
      this.emit('pause');
    }
  }
  
  resume(): void {
    if (this.state === 'paused' && this.pauseResolve) {
      this.state = 'active';
      this.pauseResolve();
      this.pausePromise = undefined;
      this.pauseResolve = undefined;
      
      if (this.pauseStartTime) {
        const pauseDuration = Date.now() - this.pauseStartTime;
        this.totalPauseDuration += pauseDuration;
        this.pauseStartTime = undefined;
        this.emit('resume', { pauseDuration });
      } else {
        this.emit('resume');
      }
    }
  }
  
  abort(reason?: string): void {
    this.state = 'aborted';
    this._abortReason = reason;
    if (this.pauseResolve) {
      this.pauseResolve();
    }
    this.emit('abort');
  }
  
  getState(): StreamState {
    return this.state;
  }
  
  get isPaused(): boolean {
    return this.state === 'paused';
  }
  
  get isAborted(): boolean {
    return this.state === 'aborted';
  }
  
  get abortReason(): string | undefined {
    return this._abortReason;
  }
  
  getPauseCount(): number {
    return this.pauseCount;
  }
  
  getTotalPauseDuration(): number {
    // Add current pause duration if paused
    if (this.state === 'paused' && this.pauseStartTime) {
      return this.totalPauseDuration + (Date.now() - this.pauseStartTime);
    }
    return this.totalPauseDuration;
  }
  
  async checkPause(): Promise<void> {
    if (this.pausePromise) {
      await this.pausePromise;
    }
  }
  
  on(event: 'pause' | 'resume' | 'abort', listener: () => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  off(event: 'pause' | 'resume' | 'abort', listener: () => void): void {
    this.listeners.get(event)?.delete(listener);
  }
  
  private emit(event: string, _data?: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener();
        } catch (error) {
          // Error in ${event} listener - silently continue
        }
      }
    }
  }
}

// Export factory function
export function createTokenStream(messageGenerator: AsyncGenerator<Message>): TokenStream {
  return new TokenStreamImpl(messageGenerator);
}