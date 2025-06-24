/**
 * Retry executor implementation with exponential backoff
 */

import type {
  RetryExecutor,
  RetryOptions,
  RetryResult,
  RetryExecutorStats,
  RetryStrategy
} from '../types/retry.js';
import {
  ExponentialBackoffStrategy,
  LinearBackoffStrategy,
  FibonacciBackoffStrategy,
  RetryUtils
} from '../types/retry.js';

export class ClaudeRetryExecutor implements RetryExecutor {
  private defaults: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    multiplier: 2,
    jitter: true,
    jitterFactor: 0.1
  };
  
  private stats: RetryExecutorStats = {
    totalExecutions: 0,
    successfulFirstAttempts: 0,
    successfulRetries: 0,
    totalFailures: 0,
    totalRetryAttempts: 0,
    averageAttempts: 0,
    maxAttempts: 0
  };
  
  private strategy: RetryStrategy;
  
  constructor(options?: RetryOptions, strategy?: RetryStrategy) {
    if (options) {
      this.defaults = { ...this.defaults, ...options };
    }
    
    this.strategy = strategy || new ExponentialBackoffStrategy({
      multiplier: this.defaults.multiplier,
      maxDelay: this.defaults.maxDelay,
      jitter: this.defaults.jitter,
      jitterFactor: this.defaults.jitterFactor
    });
  }
  
  async execute<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
    const result = await this.executeWithResult(fn, options);
    return result.value;
  }
  
  async executeWithResult<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaults, ...options };
    const errors: Error[] = [];
    const startTime = Date.now();
    
    // Update stats
    this.stats.totalExecutions++;
    
    // Check for abort signal
    if (opts.signal?.aborted) {
      throw new Error('Operation aborted before execution');
    }
    
    // Set up total timeout if specified
    let totalTimeoutId: NodeJS.Timeout | undefined;
    let totalTimeoutPromise: Promise<never> | undefined;
    
    if (opts.totalTimeout) {
      totalTimeoutPromise = new Promise((_, reject) => {
        totalTimeoutId = setTimeout(() => {
          reject(new Error(`Total timeout of ${opts.totalTimeout}ms exceeded`));
        }, opts.totalTimeout);
      });
    }
    
    try {
      for (let attempt = 1; attempt <= (opts.maxAttempts || 3); attempt++) {
        try {
          // Check abort signal
          if (opts.signal?.aborted) {
            throw new Error('Operation aborted');
          }
          
          // Create attempt with timeout
          let attemptPromise = fn();
          
          if (opts.attemptTimeout) {
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(`Attempt timeout of ${opts.attemptTimeout}ms exceeded`));
              }, opts.attemptTimeout);
            });
            
            attemptPromise = Promise.race([attemptPromise, timeoutPromise]);
          }
          
          // Race against total timeout if set
          const value = await (totalTimeoutPromise 
            ? Promise.race([attemptPromise, totalTimeoutPromise])
            : attemptPromise);
          
          // Success!
          if (attempt === 1) {
            this.stats.successfulFirstAttempts++;
          } else {
            this.stats.successfulRetries++;
          }
          
          this.updateStats(attempt);
          
          return {
            value,
            attempts: attempt,
            totalDuration: Date.now() - startTime,
            errors
          };
          
        } catch (error) {
          errors.push(error as Error);
          
          // Check if should retry
          const shouldRetry = await this.shouldRetry(error as Error, attempt, opts);
          
          if (!shouldRetry || attempt === opts.maxAttempts) {
            this.stats.totalFailures++;
            this.updateStats(attempt);
            throw error;
          }
          
          // Calculate delay
          const delay = this.strategy.calculateDelay(attempt, opts.initialDelay || 1000);
          
          // Call retry callback
          if (opts.onRetry) {
            await opts.onRetry(attempt, error as Error, delay);
          }
          
          // Wait before retry
          await this.sleep(delay, opts.signal);
          this.stats.totalRetryAttempts++;
        }
      }
      
      // Should never reach here
      throw errors[errors.length - 1];
      
    } finally {
      if (totalTimeoutId) {
        clearTimeout(totalTimeoutId);
      }
    }
  }
  
  setDefaults(options: RetryOptions): void {
    this.defaults = { ...this.defaults, ...options };
    
    // Update strategy if needed
    if (options.multiplier || options.maxDelay || options.jitter || options.jitterFactor) {
      this.strategy = new ExponentialBackoffStrategy({
        multiplier: options.multiplier || this.defaults.multiplier,
        maxDelay: options.maxDelay || this.defaults.maxDelay,
        jitter: options.jitter ?? this.defaults.jitter,
        jitterFactor: options.jitterFactor || this.defaults.jitterFactor
      });
    }
  }
  
  getStats(): RetryExecutorStats {
    return { ...this.stats };
  }
  
  resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      successfulFirstAttempts: 0,
      successfulRetries: 0,
      totalFailures: 0,
      totalRetryAttempts: 0,
      averageAttempts: 0,
      maxAttempts: 0
    };
  }
  
  private async shouldRetry(error: Error, attempt: number, options: RetryOptions): Promise<boolean> {
    // Check custom retry predicate
    if (options.shouldRetry) {
      return options.shouldRetry(error, attempt);
    }
    
    // Check strategy
    if (!this.strategy.shouldRetry(error, attempt)) {
      return false;
    }
    
    // Check retryable error types
    if (options.retryableErrors) {
      return options.retryableErrors.some(ErrorClass => error instanceof ErrorClass);
    }
    
    // Default to RetryUtils check
    return RetryUtils.isRetryableError(error);
  }
  
  private async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);
      
      const cleanup = () => {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      };
      
      const onAbort = () => {
        cleanup();
        reject(new Error('Sleep aborted'));
      };
      
      if (signal?.aborted) {
        reject(new Error('Sleep aborted'));
        return;
      }
      
      signal?.addEventListener('abort', onAbort);
    });
  }
  
  private updateStats(attempts: number): void {
    this.stats.maxAttempts = Math.max(this.stats.maxAttempts, attempts);
    
    const totalAttempts = 
      this.stats.successfulFirstAttempts +
      (this.stats.successfulRetries * 2) + // At least 2 attempts for retries
      (this.stats.totalFailures * (this.defaults.maxAttempts || 3));
    
    this.stats.averageAttempts = totalAttempts / this.stats.totalExecutions;
  }
}

// Factory functions for creating retry executors with different strategies
export function createRetryExecutor(options?: RetryOptions): RetryExecutor {
  return new ClaudeRetryExecutor(options);
}

export function createExponentialRetryExecutor(options?: RetryOptions): RetryExecutor {
  return new ClaudeRetryExecutor(options, new ExponentialBackoffStrategy({
    multiplier: options?.multiplier,
    maxDelay: options?.maxDelay,
    jitter: options?.jitter,
    jitterFactor: options?.jitterFactor
  }));
}

export function createLinearRetryExecutor(options?: RetryOptions & { increment?: number }): RetryExecutor {
  return new ClaudeRetryExecutor(options, new LinearBackoffStrategy({
    increment: options?.increment,
    maxDelay: options?.maxDelay,
    jitter: options?.jitter
  }));
}

export function createFibonacciRetryExecutor(options?: RetryOptions): RetryExecutor {
  return new ClaudeRetryExecutor(options, new FibonacciBackoffStrategy({
    maxDelay: options?.maxDelay,
    jitter: options?.jitter
  }));
}

// Convenience function for wrapping any async function with retry
export function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): () => Promise<T> {
  const executor = createRetryExecutor(options);
  return () => executor.execute(fn);
}