import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalClient } from '../src/_internal/client.js';
import { SubprocessCLITransport } from '../src/_internal/transport/subprocess-cli.js';
import type { Message, CLIOutput } from '../src/types.js';

vi.mock('../src/_internal/transport/subprocess-cli.js');

describe('InternalClient', () => {
  let mockTransport: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransport = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      receiveMessages: vi.fn()
    };
    vi.mocked(SubprocessCLITransport).mockImplementation(() => mockTransport);
  });

  describe('constructor', () => {
    it('should create client with prompt and default options', () => {
      const client = new InternalClient('test prompt');
      expect(client).toBeDefined();
    });

    it('should create client with custom options', () => {
      const options = { model: 'claude-3', maxTokens: 1000 };
      const client = new InternalClient('test prompt', options);
      expect(client).toBeDefined();
    });
  });

  describe('processQuery', () => {
    it('should connect to transport and yield messages', async () => {
      const messages: CLIOutput[] = [
        { type: 'user', message: { content: 'Hello' } },
        { type: 'assistant', message: { content: [{ type: 'text', text: 'Hi there!' }] } }
      ];

      mockTransport.receiveMessages.mockImplementation(async function* () {
        for (const msg of messages) {
          yield msg;
        }
      });

      const client = new InternalClient('test prompt');
      const results: Message[] = [];

      for await (const message of client.processQuery()) {
        results.push(message);
      }

      expect(mockTransport.connect).toHaveBeenCalledTimes(1);
      expect(mockTransport.disconnect).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ type: 'user', content: 'Hello' });
      expect(results[1]).toEqual({ type: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] });
    });

    it('should handle errors from transport', async () => {
      const errorOutput: CLIOutput = {
        type: 'error',
        error: { message: 'API error occurred' }
      };

      mockTransport.receiveMessages.mockImplementation(async function* () {
        yield errorOutput;
      });

      const client = new InternalClient('test prompt');

      await expect(async () => {
        for await (const _message of client.processQuery()) {
          // Should throw before yielding
        }
      }).rejects.toThrow();
      
      expect(mockTransport.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect transport on error', async () => {
      mockTransport.connect.mockRejectedValue(new Error('Connection failed'));

      const client = new InternalClient('test prompt');

      await expect(async () => {
        for await (const _message of client.processQuery()) {
          // Should throw before yielding
        }
      }).rejects.toThrow('Connection failed');

      expect(mockTransport.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle result messages with usage and cost', async () => {
      const resultMessage: CLIOutput = {
        type: 'result',
        subtype: 'task_complete',
        result: 'Task completed',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        },
        total_cost_usd: 0.001
      };

      mockTransport.receiveMessages.mockImplementation(async function* () {
        yield resultMessage;
      });

      const client = new InternalClient('test prompt');
      const results: Message[] = [];

      for await (const message of client.processQuery()) {
        results.push(message);
      }

      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe('result');
      const resultMsg = results[0] as any;
      expect(resultMsg.usage?.input_tokens).toBe(100);
      expect(resultMsg.usage?.output_tokens).toBe(50);
      expect(resultMsg.cost?.total_cost).toBe(0.001);
    });

    it('should handle unknown message types gracefully', async () => {
      const unknownMessage = { type: 'unknown', data: 'some data' } as any;

      mockTransport.receiveMessages.mockImplementation(async function* () {
        yield unknownMessage;
        yield { type: 'user', message: { content: 'Hello' } };
      });

      const client = new InternalClient('test prompt');
      const results: Message[] = [];
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      for await (const message of client.processQuery()) {
        results.push(message);
      }

      // Unknown messages are silently skipped (return null from parseMessage)
      expect(warnSpy).not.toHaveBeenCalled();
      // Only the known message type should be yielded
      expect(results).toHaveLength(1);
      expect(results[0]?.type).toBe('user');

      warnSpy.mockRestore();
    });
  });
});