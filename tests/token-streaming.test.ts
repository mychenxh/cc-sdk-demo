import { describe, it, expect } from 'vitest';
import type {
  TokenChunk,
  TokenStream,
  StreamController,
  StreamMetrics,
  StreamOptions,
  StreamState
} from '../src/types.js';

// Mock implementation for testing
class MockTokenStream implements TokenStream {
  private controller: MockStreamController;
  private buffer: TokenChunk[] = [];
  private metrics: StreamMetrics;
  private eventHandlers = new Map<string, Set<(...args: unknown[]) => void>>();
  private startTime = Date.now();
  
  constructor(private tokenList: string[], private options?: StreamOptions) {
    this.controller = new MockStreamController(this);
    this.metrics = {
      tokensEmitted: 0,
      duration: 0,
      state: 'active',
      averageTokensPerSecond: 0
    };
  }
  
  async *tokens(): AsyncGenerator<TokenChunk> {
    for (let i = 0; i < this.tokenList.length; i++) {
      // Check if aborted
      if (this.controller.isAborted) {
        this.metrics.state = 'aborted';
        throw new Error(`Stream aborted: ${this.controller.abortReason}`);
      }
      
      // Handle pause
      while (this.controller.isPaused && !this.controller.isAborted) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Create token chunk
      const chunk: TokenChunk = {
        token: this.tokenList[i],
        timestamp: Date.now(),
        metadata: {
          position: i,
          messageId: 'test-message',
          blockIndex: 0
        }
      };
      
      // Apply throttling if specified
      if (this.options?.throttleMs) {
        await new Promise(resolve => setTimeout(resolve, this.options.throttleMs));
      }
      
      // Update metrics
      this.metrics.tokensEmitted++;
      this.metrics.duration = Date.now() - this.startTime;
      this.metrics.averageTokensPerSecond = 
        this.metrics.tokensEmitted / (Math.max(this.metrics.duration, 1) / 1000);
      
      // Buffer management
      if (this.options?.bufferSize) {
        if (this.buffer.length >= this.options.bufferSize) {
          this.buffer.shift();
        }
      }
      this.buffer.push(chunk);
      
      // Emit events
      this.emit('token', chunk);
      this.emit('metrics', this.metrics);
      
      yield chunk;
    }
    
    this.metrics.state = 'completed';
    this.metrics.duration = Date.now() - this.startTime;
    this.emit('complete', 'completed');
  }
  
  getController(): StreamController {
    return this.controller;
  }
  
  getSnapshot(): TokenChunk[] {
    return [...this.buffer];
  }
  
  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }
  
  async waitForCompletion(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkComplete = setInterval(() => {
        if (this.metrics.state === 'completed') {
          clearInterval(checkComplete);
          resolve();
        } else if (this.metrics.state === 'error' || this.metrics.state === 'aborted') {
          clearInterval(checkComplete);
          reject(new Error(`Stream ended with state: ${this.metrics.state}`));
        }
      }, 10);
    });
  }
  
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }
  
  off(event: string, handler: (...args: unknown[]) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }
  
  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }
  
  // Test helper
  updateState(state: StreamState): void {
    this.metrics.state = state;
  }
}

class MockStreamController implements StreamController {
  isPaused = false;
  isAborted = false;
  abortReason?: string;
  
  constructor(private stream: MockTokenStream) {}
  
  pause(): void {
    this.isPaused = true;
    this.stream.updateState('paused');
  }
  
  resume(): void {
    this.isPaused = false;
    this.stream.updateState('active');
  }
  
  abort(reason?: string): void {
    this.isAborted = true;
    this.abortReason = reason;
    this.stream.updateState('aborted');
  }
}

describe('Token Streaming', () => {
  describe('Basic Token Streaming', () => {
    it('should stream tokens one by one', async () => {
      const tokens = ['Hello', ' ', 'world', '!'];
      const stream = new MockTokenStream(tokens);
      const received: TokenChunk[] = [];
      
      for await (const _chunk of stream.tokens()) {
        received.push(chunk);
      }
      
      expect(received).toHaveLength(4);
      expect(received.map(c => c.token)).toEqual(tokens);
      expect(received[0].metadata?.position).toBe(0);
      expect(received[3].metadata?.position).toBe(3);
    });
    
    it('should include timestamps', async () => {
      const stream = new MockTokenStream(['token1', 'token2']);
      const chunks: TokenChunk[] = [];
      
      for await (const _chunk of stream.tokens()) {
        chunks.push(chunk);
      }
      
      expect(chunks[0].timestamp).toBeLessThanOrEqual(chunks[1].timestamp);
      expect(chunks[0].timestamp).toBeGreaterThan(0);
    });
    
    it('should include metadata', async () => {
      const stream = new MockTokenStream(['test']);
      const chunks: TokenChunk[] = [];
      
      for await (const _chunk of stream.tokens()) {
        chunks.push(chunk);
      }
      
      expect(chunks[0].metadata).toBeDefined();
      expect(chunks[0].metadata?.messageId).toBe('test-message');
      expect(chunks[0].metadata?.blockIndex).toBe(0);
      expect(chunks[0].metadata?.position).toBe(0);
    });
  });
  
  describe('Stream Control', () => {
    it('should pause and resume streaming', async () => {
      const tokens = ['1', '2', '3', '4', '5'];
      const stream = new MockTokenStream(tokens);
      const controller = stream.getController();
      const received: string[] = [];
      
      setTimeout(() => {
        controller.pause();
        expect(controller.isPaused).toBe(true);
        
        setTimeout(() => {
          controller.resume();
          expect(controller.isPaused).toBe(false);
        }, 50);
      }, 20);
      
      for await (const _chunk of stream.tokens()) {
        received.push(chunk.token);
      }
      
      expect(received).toEqual(tokens);
    });
    
    it('should abort streaming', async () => {
      const tokens = ['1', '2', '3', '4', '5'];
      const stream = new MockTokenStream(tokens);
      const controller = stream.getController();
      const received: string[] = [];
      
      let errorThrown = false;
      let errorMessage = '';
      
      // Start consuming tokens
      const consumePromise = (async () => {
        try {
          for await (const _chunk of stream.tokens()) {
            received.push(chunk.token);
            // Abort after first token
            if (received.length === 1) {
              controller.abort('User cancelled');
            }
          }
        } catch (error) {
          errorThrown = true;
          errorMessage = (error as Error).message;
          throw error;
        }
      })();
      
      await expect(consumePromise).rejects.toThrow('Stream aborted: User cancelled');
      
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe('Stream aborted: User cancelled');
      expect(controller.isAborted).toBe(true);
      expect(controller.abortReason).toBe('User cancelled');
      expect(received.length).toBeLessThan(tokens.length);
    });
    
    it('should not resume after abort', async () => {
      const stream = new MockTokenStream(['1', '2', '3']);
      const controller = stream.getController();
      
      controller.abort('Cancelled');
      expect(controller.isAborted).toBe(true);
      
      // Resume should not change abort state
      controller.resume();
      expect(controller.isAborted).toBe(true);
    });
  });
  
  describe('Stream Buffering', () => {
    it('should maintain buffer with size limit', async () => {
      const tokens = ['1', '2', '3', '4', '5'];
      const stream = new MockTokenStream(tokens, { bufferSize: 3 });
      
      for await (const _chunk of stream.tokens()) {
        const snapshot = stream.getSnapshot();
        expect(snapshot.length).toBeLessThanOrEqual(3);
      }
      
      const finalSnapshot = stream.getSnapshot();
      expect(finalSnapshot.length).toBe(3);
      expect(finalSnapshot.map(c => c.token)).toEqual(['3', '4', '5']);
    });
    
    it('should provide snapshot of current buffer', async () => {
      const stream = new MockTokenStream(['a', 'b', 'c']);
      const snapshots: TokenChunk[][] = [];
      
      for await (const _chunk of stream.tokens()) {
        snapshots.push(stream.getSnapshot());
      }
      
      expect(snapshots[0]).toHaveLength(1);
      expect(snapshots[1]).toHaveLength(2);
      expect(snapshots[2]).toHaveLength(3);
    });
  });
  
  describe('Stream Metrics', () => {
    it('should track token count and duration', async () => {
      const stream = new MockTokenStream(['1', '2', '3']);
      
      for await (const _chunk of stream.tokens()) {
        // Consume tokens with tiny delay to ensure duration > 0
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      const metrics = stream.getMetrics();
      expect(metrics.tokensEmitted).toBe(3);
      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.state).toBe('completed');
    });
    
    it('should calculate tokens per second', async () => {
      const stream = new MockTokenStream(['1', '2', '3', '4', '5'], { throttleMs: 10 });
      
      for await (const _chunk of stream.tokens()) {
        // Consume tokens
      }
      
      const metrics = stream.getMetrics();
      expect(metrics.averageTokensPerSecond).toBeGreaterThan(0);
      expect(metrics.averageTokensPerSecond).toBeLessThan(200); // With 10ms throttle
    });
    
    it('should update state in metrics', async () => {
      const stream = new MockTokenStream(['1', '2', '3']);
      const controller = stream.getController();
      
      expect(stream.getMetrics().state).toBe('active');
      
      controller.pause();
      expect(stream.getMetrics().state).toBe('paused');
      
      controller.resume();
      expect(stream.getMetrics().state).toBe('active');
      
      controller.abort();
      expect(stream.getMetrics().state).toBe('aborted');
    });
  });
  
  describe('Stream Events', () => {
    it('should emit token events', async () => {
      const stream = new MockTokenStream(['a', 'b', 'c']);
      const emittedTokens: TokenChunk[] = [];
      
      stream.on('token', (chunk: TokenChunk) => {
        emittedTokens.push(chunk);
      });
      
      for await (const _chunk of stream.tokens()) {
        // Consume
      }
      
      expect(emittedTokens).toHaveLength(3);
      expect(emittedTokens.map(c => c.token)).toEqual(['a', 'b', 'c']);
    });
    
    it('should emit metrics events', async () => {
      const stream = new MockTokenStream(['1', '2']);
      const metricsUpdates: StreamMetrics[] = [];
      
      stream.on('metrics', (metrics: StreamMetrics) => {
        metricsUpdates.push({ ...metrics });
      });
      
      for await (const _chunk of stream.tokens()) {
        // Consume
      }
      
      expect(metricsUpdates.length).toBeGreaterThanOrEqual(2);
      expect(metricsUpdates[0].tokensEmitted).toBe(1);
      expect(metricsUpdates[metricsUpdates.length - 1].tokensEmitted).toBe(2);
    });
    
    it('should emit complete event', async () => {
      const stream = new MockTokenStream(['done']);
      let completed = false;
      
      stream.on('complete', () => {
        completed = true;
      });
      
      for await (const _chunk of stream.tokens()) {
        // Consume
      }
      
      expect(completed).toBe(true);
    });
    
    it('should support removing event handlers', async () => {
      const stream = new MockTokenStream(['test']);
      let callCount = 0;
      
      const handler = () => callCount++;
      stream.on('token', handler);
      stream.off('token', handler);
      
      for await (const _chunk of stream.tokens()) {
        // Consume
      }
      
      expect(callCount).toBe(0);
    });
  });
  
  describe('Stream Options', () => {
    it('should apply throttling', async () => {
      const stream = new MockTokenStream(['1', '2', '3'], { throttleMs: 20 });
      const start = Date.now();
      
      for await (const _chunk of stream.tokens()) {
        // Consume
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(60); // 3 tokens * 20ms
    });
    
    it('should wait for completion', async () => {
      const stream = new MockTokenStream(['a', 'b']);
      
      const consumePromise = (async () => {
        for await (const _chunk of stream.tokens()) {
          // Consume slowly
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();
      
      await Promise.all([
        consumePromise,
        stream.waitForCompletion()
      ]);
      
      expect(stream.getMetrics().state).toBe('completed');
    });
    
    it('should reject waitForCompletion on abort', async () => {
      const stream = new MockTokenStream(['1', '2', '3']);
      const controller = stream.getController();
      
      setTimeout(() => controller.abort('Test abort'), 10);
      
      await expect(stream.waitForCompletion()).rejects.toThrow('Stream ended with state: aborted');
    });
  });
});