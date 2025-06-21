import { describe, it, expect } from 'vitest';
import {
  ClaudeSDKError,
  CLIConnectionError,
  CLINotFoundError,
  ProcessError,
  CLIJSONDecodeError
} from '../src/errors.js';

describe('Error Classes', () => {
  describe('ClaudeSDKError', () => {
    it('should create error with message', () => {
      const error = new ClaudeSDKError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ClaudeSDKError);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ClaudeSDKError');
    });

    it('should have proper prototype chain', () => {
      const error = new ClaudeSDKError('Test error');
      expect(error instanceof ClaudeSDKError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('CLIConnectionError', () => {
    it('should create error with message', () => {
      const error = new CLIConnectionError('Connection failed');
      expect(error).toBeInstanceOf(ClaudeSDKError);
      expect(error).toBeInstanceOf(CLIConnectionError);
      expect(error.message).toBe('Connection failed');
      expect(error.name).toBe('CLIConnectionError');
    });
  });

  describe('CLINotFoundError', () => {
    it('should create error with default message', () => {
      const error = new CLINotFoundError();
      expect(error).toBeInstanceOf(ClaudeSDKError);
      expect(error).toBeInstanceOf(CLINotFoundError);
      expect(error.message).toBe('Claude Code CLI not found. Please install it from https://github.com/anthropics/claude-code');
      expect(error.name).toBe('CLINotFoundError');
    });

    it('should create error with custom message', () => {
      const error = new CLINotFoundError('Custom not found message');
      expect(error.message).toBe('Custom not found message');
    });
  });

  describe('ProcessError', () => {
    it('should create error with exit code and signal', () => {
      const error = new ProcessError('Process failed', 1, 'SIGTERM');
      expect(error).toBeInstanceOf(ClaudeSDKError);
      expect(error).toBeInstanceOf(ProcessError);
      expect(error.message).toBe('Process failed');
      expect(error.name).toBe('ProcessError');
      expect(error.exitCode).toBe(1);
      expect(error.signal).toBe('SIGTERM');
    });

    it('should handle null exit code and signal', () => {
      const error = new ProcessError('Process failed', null, null);
      expect(error.exitCode).toBeNull();
      expect(error.signal).toBeNull();
    });

    it('should handle undefined exit code and signal', () => {
      const error = new ProcessError('Process failed');
      expect(error.exitCode).toBeUndefined();
      expect(error.signal).toBeUndefined();
    });
  });

  describe('CLIJSONDecodeError', () => {
    it('should create error with raw output', () => {
      const rawOutput = '{"invalid": json}';
      const error = new CLIJSONDecodeError('JSON parse failed', rawOutput);
      expect(error).toBeInstanceOf(ClaudeSDKError);
      expect(error).toBeInstanceOf(CLIJSONDecodeError);
      expect(error.message).toBe('JSON parse failed');
      expect(error.name).toBe('CLIJSONDecodeError');
      expect(error.rawOutput).toBe(rawOutput);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper instanceof checks', () => {
      const connectionError = new CLIConnectionError('test');
      const notFoundError = new CLINotFoundError();
      const processError = new ProcessError('test', 1);
      const jsonError = new CLIJSONDecodeError('test', 'raw');

      // All should be instances of base error
      expect(connectionError).toBeInstanceOf(ClaudeSDKError);
      expect(notFoundError).toBeInstanceOf(ClaudeSDKError);
      expect(processError).toBeInstanceOf(ClaudeSDKError);
      expect(jsonError).toBeInstanceOf(ClaudeSDKError);

      // Should not be instances of each other
      expect(connectionError).not.toBeInstanceOf(CLINotFoundError);
      expect(notFoundError).not.toBeInstanceOf(CLIConnectionError);
      expect(processError).not.toBeInstanceOf(CLIJSONDecodeError);
      expect(jsonError).not.toBeInstanceOf(ProcessError);
    });
  });
});