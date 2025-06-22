import { describe, it, expect } from 'vitest';
import { query, claude, QueryBuilder, ResponseParser, Logger, ConsoleLogger } from '../src/index.js';
import type { Message, ClaudeCodeOptions } from '../src/types.js';

describe('Backward Compatibility', () => {
  it('should export the original query function', () => {
    expect(query).toBeDefined();
    expect(typeof query).toBe('function');
  });

  it('should export all new features without breaking existing exports', () => {
    // New exports
    expect(claude).toBeDefined();
    expect(QueryBuilder).toBeDefined();
    expect(ResponseParser).toBeDefined();
    expect(ConsoleLogger).toBeDefined();
    
    // Ensure they are the correct types
    expect(typeof claude).toBe('function');
    expect(typeof QueryBuilder).toBe('function');
    expect(typeof ResponseParser).toBe('function');
    expect(typeof ConsoleLogger).toBe('function');
  });

  it('should maintain original query function signature', () => {
    // The query function should accept prompt and optional options
    const generator = query('test prompt');
    expect(generator).toBeDefined();
    expect(generator[Symbol.asyncIterator]).toBeDefined();
    
    const generatorWithOptions = query('test', { model: 'sonnet' });
    expect(generatorWithOptions).toBeDefined();
    expect(generatorWithOptions[Symbol.asyncIterator]).toBeDefined();
  });

  it('should allow using both APIs in the same file', async () => {
    // This should compile and run without issues
    const oldStyleGen = query('test');
    const newStyleBuilder = claude();
    const newStyleGen = newStyleBuilder.queryRaw('test');
    
    // Both should be async generators
    expect(oldStyleGen[Symbol.asyncIterator]).toBeDefined();
    expect(newStyleGen[Symbol.asyncIterator]).toBeDefined();
  });

  it('should maintain all type exports', () => {
    // These are type-only tests that ensure imports work
    const testTypes = () => {
      // Original types should still work
      const msg: Message = { type: 'user', content: 'test' };
      const opts: ClaudeCodeOptions = { model: 'sonnet' };
      
      // New types should also be available
      const logger: Logger | null = null;
      
      return { msg, opts, logger };
    };
    
    expect(testTypes).toBeDefined();
  });
});