import { describe, it, expect } from 'vitest';
import { query } from '../src/index.js';
import * as errors from '../src/errors.js';
import * as types from '../src/types.js';

describe('query function exports', () => {
  it('should export query function', () => {
    expect(query).toBeDefined();
    expect(typeof query).toBe('function');
  });

  it('should return an async generator', () => {
    const result = query('test prompt');
    expect(result).toBeDefined();
    expect(result.next).toBeDefined();
    expect(typeof result.next).toBe('function');
    expect(result[Symbol.asyncIterator]).toBeDefined();
  });

  it('should accept optional parameters', () => {
    const result1 = query('test prompt');
    const result2 = query('test prompt', {});
    const result3 = query('test prompt', { model: 'claude-3' });
    
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result3).toBeDefined();
  });
});

describe('exports', () => {
  it('should export all error classes', () => {
    expect(errors.ClaudeSDKError).toBeDefined();
    expect(errors.CLIConnectionError).toBeDefined();
    expect(errors.CLINotFoundError).toBeDefined();
    expect(errors.ProcessError).toBeDefined();
    expect(errors.CLIJSONDecodeError).toBeDefined();
  });

  it('should export all type definitions', () => {
    // Check that types namespace is exported
    expect(types).toBeDefined();
    
    // The actual type checking is done by TypeScript
    // This test ensures the module structure is correct
  });
});