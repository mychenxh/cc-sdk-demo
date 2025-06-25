import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claude } from '../src/fluent.js';
import { query } from '../src/index.js';
import * as baseModule from '../src/index.js';
import { ConsoleLogger, JSONLogger, LogLevel } from '../src/logger.js';

// Mock the base query function
vi.mock('../src/index.js', async () => {
  const actual = await vi.importActual('../src/index.js');
  return {
    ...actual,
    query: vi.fn()
  };
});

describe('Production Features', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(baseModule.query);
  });

  describe('AbortSignal Support', () => {
    it('should pass AbortSignal to options', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Response' }]
        };
        yield { type: 'result', content: 'done' };
      });

      const controller = new AbortController();
      
      await claude()
        .withModel('sonnet')
        .withSignal(controller.signal)
        .query('Test with signal')
        .asText();

      expect(mockQuery).toHaveBeenCalledWith(
        'Test with signal',
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });

    it('should handle abort during streaming', async () => {
      const controller = new AbortController();
      let messageCount = 0;
      
      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: [{ type: 'text', text: 'Part 1' }] };
        messageCount++;
        
        // Simulate abort during streaming
        if (controller.signal.aborted) {
          throw new Error('Aborted');
        }
        
        yield { type: 'assistant', content: [{ type: 'text', text: 'Part 2' }] };
        messageCount++;
        yield { type: 'result', content: 'done' };
      });

      const parser = claude()
        .withSignal(controller.signal)
        .query('Test abort');
      
      // Start streaming
      const streamPromise = parser.stream(async (message) => {
        if (messageCount === 1) {
          controller.abort();
        }
      });
      
      // The stream promise doesn't throw, it just completes
      try {
        await streamPromise;
      } catch (e) {
        // Expected - aborted
      }
      expect(controller.signal.aborted).toBe(true);
      // Message count might be 1 or 2 depending on timing
      expect(messageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Read-Only Mode with allowTools([])', () => {
    it('should deny all tools when allowTools() is called with no arguments', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .allowTools() // No tools = read-only mode
        .query('Try to use tools')
        .asText();

      expect(mockQuery).toHaveBeenCalledWith(
        'Try to use tools',
        expect.objectContaining({
          allowedTools: [],
          deniedTools: [
            'Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'LS',
            'MultiEdit', 'NotebookRead', 'NotebookEdit', 'WebFetch',
            'TodoRead', 'TodoWrite', 'WebSearch', 'Task', 'MCPTool'
          ]
        })
      );
    });

    it('should allow specific tools when provided', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .allowTools('Read', 'LS')
        .query('Read files only')
        .asText();

      expect(mockQuery).toHaveBeenCalledWith(
        'Read files only',
        expect.objectContaining({
          allowedTools: ['Read', 'LS']
        })
      );
    });
  });

  describe('Logger Nested Object Handling', () => {
    it('should properly serialize nested objects in ConsoleLogger', () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation();
      const logger = new ConsoleLogger(LogLevel.INFO);

      logger.info('Test message', {
        user: {
          id: 123,
          preferences: {
            theme: 'dark',
            notifications: {
              email: true,
              push: false
            }
          }
        }
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.stringContaining('"theme": "dark"')
      );
      
      consoleInfoSpy.mockRestore();
    });

    it('should preserve nested objects in JSONLogger', () => {
      let output = '';
      const logger = new JSONLogger(LogLevel.INFO, (json) => { output = json; });

      logger.info('Test message', {
        nested: {
          deeply: {
            structured: {
              data: 'value'
            }
          }
        }
      });

      const parsed = JSON.parse(output);
      expect(parsed.context).toEqual({
        nested: {
          deeply: {
            structured: {
              data: 'value'
            }
          }
        }
      });
      expect(parsed.message).toBe('Test message');
      expect(parsed.level).toBe('INFO');
    });

    it('should handle context with error objects', () => {
      let output = '';
      const logger = new JSONLogger(LogLevel.ERROR, (json) => { output = json; });
      const error = new Error('Test error');

      logger.error('Error occurred', { error, userId: 123 });

      const parsed = JSON.parse(output);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.message).toBe('Test error');
      expect(parsed.error.stack).toBeDefined();
      expect(parsed.context).toBeDefined();
      expect(parsed.context.userId).toBe(123);
    });
  });

  describe('Stream Cancellation Edge Cases', () => {
    it('should handle immediate cancellation', async () => {
      const controller = new AbortController();
      controller.abort();

      mockQuery.mockImplementation(async function* () {
        if (controller.signal.aborted) {
          throw new Error('Aborted');
        }
        yield { type: 'assistant', content: [{ type: 'text', text: 'Should not see this' }] };
      });

      const parser = claude()
        .withSignal(controller.signal)
        .query('Test immediate abort');

      await expect(parser.asText()).rejects.toThrow('Aborted');
    });

    it('should cleanup on abort', async () => {
      const controller = new AbortController();
      let cleanupCalled = false;

      mockQuery.mockImplementation(async function* () {
        try {
          yield { type: 'assistant', content: [{ type: 'text', text: 'Start' }] };
          yield { type: 'assistant', content: [{ type: 'text', text: 'Middle' }] };
        } finally {
          cleanupCalled = true;
        }
      });

      const parser = claude()
        .withSignal(controller.signal)
        .query('Test cleanup');

      const messages: any[] = [];
      try {
        await parser.stream(async (msg) => {
          messages.push(msg);
          if (messages.length === 1) {
            controller.abort();
            throw new Error('Aborted by user');
          }
        });
      } catch (e) {
        // Expected abort
      }

      expect(cleanupCalled).toBe(true);
      expect(messages).toHaveLength(1);
    });
  });

  describe('Message vs Token Streaming Clarification', () => {
    it('should stream complete messages, not individual tokens', async () => {
      const messages: any[] = [];
      
      mockQuery.mockImplementation(async function* () {
        // Simulate how the CLI sends complete messages
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'This is a complete message, not token by token.' }]
        };
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'This is another complete message.' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .query('Long response')
        .stream(async (msg) => {
          messages.push(msg);
        });

      // Verify we get complete messages, not token chunks
      expect(messages).toHaveLength(3);
      expect(messages[0].content[0].text).toBe('This is a complete message, not token by token.');
      expect(messages[1].content[0].text).toBe('This is another complete message.');
    });
  });
});