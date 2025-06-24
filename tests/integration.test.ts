import { describe, it, expect, vi, beforeEach } from 'vitest';
import { query } from '../src/index.js';
import { InternalClient } from '../src/_internal/client.js';
import type { Message, ClaudeCodeOptions } from '../src/types.js';

vi.mock('../src/_internal/client.js');

describe('Integration Tests', () => {
  let mockProcessQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessQuery = vi.fn();
    vi.mocked(InternalClient).mockImplementation(() => ({
      processQuery: mockProcessQuery
    } as any));
  });

  describe('query function', () => {
    it('should handle simple text conversation', async () => {
      const messages: Message[] = [
        { type: 'user', content: 'Hello, Claude!' },
        { type: 'assistant', content: [{ type: 'text', text: 'Hello! How can I help you today?' }] },
        { type: 'result', content: 'Conversation completed' }
      ];

      mockProcessQuery.mockImplementation(async function* () {
        for (const msg of messages) {
          yield msg;
        }
      });

      const results: Message[] = [];
      for await (const message of query('Hello, Claude!')) {
        results.push(message);
      }

      expect(results).toEqual(messages);
      expect(InternalClient).toHaveBeenCalledWith('Hello, Claude!', undefined);
    });

    it('should handle tool use', async () => {
      const messages: Message[] = [
        { type: 'user', content: 'Create a file called hello.txt' },
        {
          type: 'assistant',
          content: [
            { type: 'text', text: "I'll create a file called hello.txt for you." },
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'Write',
              input: { file_path: 'hello.txt', content: 'Hello, World!' }
            }
          ]
        },
        {
          type: 'assistant',
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tool-1',
              content: 'File created successfully'
            }
          ]
        },
        { type: 'result', content: 'Created hello.txt' }
      ];

      mockProcessQuery.mockImplementation(async function* () {
        for (const msg of messages) {
          yield msg;
        }
      });

      const results: Message[] = [];
      for await (const message of query('Create a file called hello.txt')) {
        results.push(message);
      }

      expect(results).toHaveLength(4);
      expect(results[1]?.type).toBe('assistant');
      const assistantMsg = results[1] as any;
      expect(assistantMsg?.content?.[1]?.type).toBe('tool_use');
      expect(assistantMsg?.content?.[1]?.name).toBe('Write');
    });

    it('should pass options to InternalClient', async () => {
      const options: ClaudeCodeOptions = {
        model: 'claude-4-opus',
        maxTokens: 2000,
        temperature: 0.5,
        allowedTools: ['Read', 'Write'],
        permissionMode: 'acceptEdits',
        context: ['README.md'],
        cwd: '/home/user/project',
        debug: true
      };

      mockProcessQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'Done' };
      });

      const results: Message[] = [];
      for await (const message of query('Test with options', options)) {
        results.push(message);
      }

      expect(InternalClient).toHaveBeenCalledWith('Test with options', options);
    });

    it('should handle errors during iteration', async () => {
      mockProcessQuery.mockImplementation(async function* () {
        yield { type: 'user', content: 'Start task' };
        throw new Error('Something went wrong');
      });

      const results: Message[] = [];
      await expect(async () => {
        for await (const message of query('Start task')) {
          results.push(message);
        }
      }).rejects.toThrow('Something went wrong');

      expect(results).toHaveLength(1);
    });

    it('should handle result messages with usage stats', async () => {
      const resultMessage: Message = {
        type: 'result',
        content: 'Analysis complete',
        usage: {
          input_tokens: 150,
          output_tokens: 300,
          cache_creation_input_tokens: 50,
          cache_read_input_tokens: 25
        },
        cost: {
          input_cost: 0.0015,
          output_cost: 0.006,
          cache_creation_cost: 0.0005,
          cache_read_cost: 0.00025,
          total_cost: 0.00825
        }
      };

      mockProcessQuery.mockImplementation(async function* () {
        yield resultMessage;
      });

      const results: Message[] = [];
      for await (const message of query('Analyze this code')) {
        results.push(message);
      }

      expect(results).toHaveLength(1);
      const result = results[0] as any;
      expect(result.usage?.input_tokens).toBe(150);
      expect(result.cost?.total_cost).toBe(0.00825);
    });

    it('should handle MCP server configuration', async () => {
      const options: ClaudeCodeOptions = {
        mcpServers: [
          {
            command: 'mcp-server-filesystem',
            args: ['--path', '/home/user'],
            env: { DEBUG: 'true' }
          },
          {
            command: 'mcp-server-git'
          }
        ]
      };

      mockProcessQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'MCP servers configured' };
      });

      for await (const _message of query('Setup MCP', options)) {
        // Process messages
      }

      expect(InternalClient).toHaveBeenCalledWith('Setup MCP', options);
    });

    it('should handle empty response', async () => {
      mockProcessQuery.mockImplementation(async function* () {
        // No messages yielded
      });

      const results: Message[] = [];
      for await (const message of query('Empty query')) {
        results.push(message);
      }

      expect(results).toHaveLength(0);
    });

    it('should handle system messages', async () => {
      const messages: Message[] = [
        { type: 'system', subtype: 'info', data: { message: 'Starting analysis...' } },
        { type: 'user', content: 'Analyze the code' },
        { type: 'assistant', content: [{ type: 'text', text: 'Analyzing...' }] },
        { type: 'system', subtype: 'info', data: { message: 'Analysis complete' } },
        { type: 'result', content: 'Code analysis finished' }
      ];

      mockProcessQuery.mockImplementation(async function* () {
        for (const msg of messages) {
          yield msg;
        }
      });

      const results: Message[] = [];
      for await (const message of query('Analyze the code')) {
        results.push(message);
      }

      expect(results).toHaveLength(5);
      expect(results.filter(m => m.type === 'system')).toHaveLength(2);
    });
  });
});