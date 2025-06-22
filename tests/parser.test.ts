import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResponseParser } from '../src/parser.js';
import type { Message } from '../src/types.js';
import { ConsoleLogger } from '../src/logger.js';

describe('ResponseParser', () => {
  let mockGenerator: any;
  let messages: Message[];

  beforeEach(() => {
    vi.clearAllMocks();
    messages = [];
    mockGenerator = async function* () {
      for (const msg of messages) {
        yield msg;
      }
    };
  });

  describe('Basic Parsing', () => {
    it('should extract all messages as array', async () => {
      messages = [
        { type: 'user', content: 'Hello' },
        { type: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
        { type: 'result', content: 'Done' }
      ];

      const parser = new ResponseParser(mockGenerator());
      const result = await parser.asArray();

      expect(result).toHaveLength(3);
      expect(result[0]?.type).toBe('user');
      expect(result[1]?.type).toBe('assistant');
      expect(result[2]?.type).toBe('result');
    });

    it('should extract text from assistant messages', async () => {
      messages = [
        { type: 'assistant', content: [{ type: 'text', text: 'First part' }] },
        { type: 'assistant', content: [{ type: 'text', text: 'Second part' }] },
        { type: 'user', content: 'Ignored' },
        { type: 'assistant', content: [
          { type: 'text', text: 'Third part' },
          { type: 'tool_use', id: '1', name: 'Test', input: {} },
          { type: 'text', text: 'Fourth part' }
        ]}
      ];

      const parser = new ResponseParser(mockGenerator());
      const text = await parser.asText();

      expect(text).toBe('First part\nSecond part\nThird part\nFourth part');
    });

    it('should extract final result message', async () => {
      messages = [
        { type: 'user', content: 'Do something' },
        { type: 'result', content: 'First result' },
        { type: 'assistant', content: [{ type: 'text', text: 'Working...' }] },
        { type: 'result', content: 'Final result' }
      ];

      const parser = new ResponseParser(mockGenerator());
      const result = await parser.asResult();

      expect(result).toBe('Final result');
    });

    it('should return null if no result message', async () => {
      messages = [
        { type: 'user', content: 'Hello' },
        { type: 'assistant', content: [{ type: 'text', text: 'Hi!' }] }
      ];

      const parser = new ResponseParser(mockGenerator());
      const result = await parser.asResult();

      expect(result).toBeNull();
    });
  });

  describe('Tool Execution Parsing', () => {
    it('should extract tool executions', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Let me read that file' },
            { type: 'tool_use', id: 'tool-1', name: 'Read', input: { path: 'test.txt' } },
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'File contents' }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const executions = await parser.asToolExecutions();

      expect(executions).toHaveLength(1);
      expect(executions[0]).toEqual({
        tool: 'Read',
        input: { path: 'test.txt' },
        result: 'File contents',
        isError: false
      });
    });

    it('should handle tool errors', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: 'tool-1', name: 'Write', input: { path: '/invalid' } },
            { type: 'tool_result', tool_use_id: 'tool-1', content: 'Permission denied', is_error: true }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const executions = await parser.asToolExecutions();

      expect(executions[0]?.isError).toBe(true);
      expect(executions[0]?.result).toBe('Permission denied');
    });

    it('should find specific tool results', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Read', input: { path: 'a.txt' } },
            { type: 'tool_result', tool_use_id: '1', content: 'Content A' },
            { type: 'tool_use', id: '2', name: 'Write', input: { path: 'b.txt' } },
            { type: 'tool_result', tool_use_id: '2', content: 'Written' },
            { type: 'tool_use', id: '3', name: 'Read', input: { path: 'c.txt' } },
            { type: 'tool_result', tool_use_id: '3', content: 'Content C' }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const readResults = await parser.findToolResults('Read');

      expect(readResults).toHaveLength(2);
      expect(readResults).toEqual(['Content A', 'Content C']);
    });

    it('should find first tool result', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Read', input: { path: 'a.txt' } },
            { type: 'tool_result', tool_use_id: '1', content: 'First' },
            { type: 'tool_use', id: '2', name: 'Read', input: { path: 'b.txt' } },
            { type: 'tool_result', tool_use_id: '2', content: 'Second' }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const result = await parser.findToolResult('Read');

      expect(result).toBe('First');
    });

    it('should exclude error results from findToolResults', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Read', input: { path: 'a.txt' } },
            { type: 'tool_result', tool_use_id: '1', content: 'Success' },
            { type: 'tool_use', id: '2', name: 'Read', input: { path: 'b.txt' } },
            { type: 'tool_result', tool_use_id: '2', content: 'Error', is_error: true }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const results = await parser.findToolResults('Read');

      expect(results).toHaveLength(1);
      expect(results[0]).toBe('Success');
    });
  });

  describe('JSON Parsing', () => {
    it('should extract JSON from code blocks', async () => {
      messages = [
        {
          type: 'assistant',
          content: [{
            type: 'text',
            text: 'Here is the data:\n```json\n{"name": "Test", "value": 42}\n```'
          }]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const json = await parser.asJSON();

      expect(json).toEqual({ name: 'Test', value: 42 });
    });

    it('should parse plain JSON text', async () => {
      messages = [
        {
          type: 'assistant',
          content: [{ type: 'text', text: '{"key": "value", "num": 123}' }]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const json = await parser.asJSON();

      expect(json).toEqual({ key: 'value', num: 123 });
    });

    it('should extract JSON from mixed content', async () => {
      messages = [
        {
          type: 'assistant',
          content: [{
            type: 'text',
            text: 'The result is {"status": "ok", "data": [1,2,3]} as requested.'
          }]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const json = await parser.asJSON();

      expect(json).toEqual({ status: 'ok', data: [1, 2, 3] });
    });

    it('should return null for invalid JSON', async () => {
      messages = [
        {
          type: 'assistant',
          content: [{ type: 'text', text: 'This is not JSON at all' }]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const json = await parser.asJSON();

      expect(json).toBeNull();
    });

    it('should handle arrays', async () => {
      messages = [
        {
          type: 'assistant',
          content: [{ type: 'text', text: '[1, 2, 3, 4, 5]' }]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const json = await parser.asJSON();

      expect(json).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Usage Statistics', () => {
    it('should extract usage stats from result message', async () => {
      messages = [
        {
          type: 'result',
          content: 'Done',
          usage: {
            input_tokens: 100,
            output_tokens: 200,
            cache_creation_input_tokens: 50,
            cache_read_input_tokens: 25
          },
          cost: {
            total_cost: 0.005
          }
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const usage = await parser.getUsage();

      expect(usage).toEqual({
        inputTokens: 100,
        outputTokens: 200,
        cacheCreationTokens: 50,
        cacheReadTokens: 25,
        totalTokens: 300,
        totalCost: 0.005
      });
    });

    it('should handle missing usage data', async () => {
      messages = [
        { type: 'result', content: 'Done' }
      ];

      const parser = new ResponseParser(mockGenerator());
      const usage = await parser.getUsage();

      expect(usage).toBeNull();
    });

    it('should handle partial usage data', async () => {
      messages = [
        {
          type: 'result',
          content: 'Done',
          usage: {
            input_tokens: 50
          }
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const usage = await parser.getUsage();

      expect(usage).toEqual({
        inputTokens: 50,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        totalTokens: 50,
        totalCost: 0
      });
    });
  });

  describe('Streaming', () => {
    it('should stream messages with callback', async () => {
      messages = [
        { type: 'user', content: 'Start' },
        { type: 'assistant', content: [{ type: 'text', text: 'Processing' }] },
        { type: 'result', content: 'Done' }
      ];

      const received: Message[] = [];
      const parser = new ResponseParser(mockGenerator());
      
      await parser.stream(async (msg) => {
        received.push(msg);
      });

      expect(received).toHaveLength(3);
      expect(received.map(m => m.type)).toEqual(['user', 'assistant', 'result']);
    });

    it('should allow async callbacks', async () => {
      messages = [
        { type: 'assistant', content: [{ type: 'text', text: 'Test' }] }
      ];

      const delays: number[] = [];
      const parser = new ResponseParser(mockGenerator());
      
      await parser.stream(async (_msg) => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 10));
        delays.push(Date.now() - start);
      });

      expect(delays[0] ?? 0).toBeGreaterThanOrEqual(10);
    });

    it('should run handlers during streaming', async () => {
      const handler = vi.fn();
      messages = [
        { type: 'assistant', content: [{ type: 'text', text: 'Test' }] }
      ];

      const parser = new ResponseParser(mockGenerator(), [handler]);
      
      await parser.stream(async () => {});

      expect(handler).toHaveBeenCalledWith(messages[0]);
    });
  });

  describe('Error Handling', () => {
    it('should check success status', async () => {
      messages = [
        { type: 'result', content: 'Success' }
      ];

      const parser = new ResponseParser(mockGenerator());
      const success = await parser.succeeded();

      expect(success).toBe(true);
    });

    it('should detect failure from tool errors', async () => {
      messages = [
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Write', input: {} },
            { type: 'tool_result', tool_use_id: '1', content: 'Error', is_error: true }
          ]
        },
        { type: 'result', content: 'Done' }
      ];

      const parser = new ResponseParser(mockGenerator());
      const success = await parser.succeeded();

      expect(success).toBe(false);
    });

    it('should extract error messages', async () => {
      messages = [
        { type: 'system', subtype: 'error', data: { message: 'System error occurred' } },
        {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Read', input: {} },
            { type: 'tool_result', tool_use_id: '1', content: 'File not found', is_error: true }
          ]
        }
      ];

      const parser = new ResponseParser(mockGenerator());
      const errors = await parser.getErrors();

      expect(errors).toHaveLength(2);
      expect(errors).toContain('System error occurred');
      expect(errors).toContain('Tool Read failed: File not found');
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn(() => { throw new Error('Handler failed'); });
      const logger = new ConsoleLogger();
      const errorSpy = vi.spyOn(logger, 'error');
      
      messages = [{ type: 'user', content: 'Test' }];

      const parser = new ResponseParser(mockGenerator(), [errorHandler], logger);
      await parser.asArray();

      expect(errorSpy).toHaveBeenCalledWith('Message handler error', expect.any(Object));
    });
  });

  describe('Custom Transformations', () => {
    it('should apply custom transformer', async () => {
      messages = [
        { type: 'user', content: 'Question' },
        { type: 'assistant', content: [{ type: 'text', text: 'Answer' }] }
      ];

      const parser = new ResponseParser(mockGenerator());
      const result = await parser.transform(msgs => ({
        questionCount: msgs.filter(m => m.type === 'user').length,
        answerCount: msgs.filter(m => m.type === 'assistant').length,
        totalMessages: msgs.length
      }));

      expect(result).toEqual({
        questionCount: 1,
        answerCount: 1,
        totalMessages: 2
      });
    });
  });

  describe('Consumption State', () => {
    it('should only consume generator once', async () => {
      let callCount = 0;
      const countingGenerator = async function* () {
        callCount++;
        yield { type: 'result', content: 'Done' } as Message;
      };

      const parser = new ResponseParser(countingGenerator());
      
      // Multiple calls should reuse cached messages
      await parser.asText();
      await parser.asResult();
      await parser.asArray();

      expect(callCount).toBe(1);
    });

    it('should return same results on multiple calls', async () => {
      messages = [
        { type: 'assistant', content: [{ type: 'text', text: 'Test message' }] }
      ];

      const parser = new ResponseParser(mockGenerator());
      
      const text1 = await parser.asText();
      const text2 = await parser.asText();

      expect(text1).toBe(text2);
    });
  });

  describe('Logger Integration', () => {
    it('should log consumption process', async () => {
      const logger = new ConsoleLogger();
      const debugSpy = vi.spyOn(logger, 'debug');
      
      messages = [
        { type: 'user', content: 'Test' },
        { type: 'result', content: 'Done' }
      ];

      const parser = new ResponseParser(mockGenerator(), [], logger);
      await parser.asArray();

      expect(debugSpy).toHaveBeenCalledWith('Consuming message generator');
      expect(debugSpy).toHaveBeenCalledWith('Received message', { type: 'user' });
      expect(debugSpy).toHaveBeenCalledWith('Received message', { type: 'result' });
      expect(debugSpy).toHaveBeenCalledWith('Message generator consumed', { messageCount: 2 });
    });
  });
});