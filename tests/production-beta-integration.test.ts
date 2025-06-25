import { describe, it, expect, beforeEach, vi } from 'vitest';
import { claude } from '../src/fluent.js';
import * as baseModule from '../src/index.js';

// Mock the base query function for integration tests
vi.mock('../src/index.js', async () => {
  const actual = await vi.importActual('../src/index.js');
  return {
    ...actual,
    query: vi.fn()
  };
});

describe('Production Beta Features - Integration Tests', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(baseModule.query);
  });

  describe('Session Management', () => {
    it('should handle session creation and continuation', async () => {
      const sessionId = 'beta-session-' + Date.now();

      // Mock first query with session creation
      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: 'system',
          subtype: 'session',
          data: { session_id: sessionId },
          session_id: sessionId
        };
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'I will remember the number 42' }],
          session_id: sessionId
        };
        yield { type: 'result', content: 'done', session_id: sessionId };
      });

      // Mock second query with session continuation
      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'The number you told me was 42' }],
          session_id: sessionId
        };
        yield { type: 'result', content: 'done', session_id: sessionId };
      });

      // First query - establish context
      const parser1 = claude()
        .query('Remember the number 42');
      
      const extractedSessionId = await parser1.getSessionId();
      const result1 = await parser1.asText();

      expect(extractedSessionId).toBe(sessionId);
      expect(result1).toContain('42');

      // Second query - verify context retention
      const result2 = await claude()
        .withSessionId(sessionId)
        .query('What number did I tell you?')
        .asText();

      expect(result2).toContain('42');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sessionId })
      );
    });

    it('should extract session ID from messages', async () => {
      const sessionId = 'test-session-456';
      
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Hello from session' }],
          session_id: sessionId
        };
        yield { type: 'result', content: 'done', session_id: sessionId };
      });

      const parser = claude().query('Start session');
      const id = await parser.getSessionId();
      
      expect(id).toBe(sessionId);
    });
  });

  describe('Tool Permission Management', () => {
    it('should support read-only mode with allowTools()', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'I cannot access any tools in read-only mode' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .allowTools() // Empty = read-only mode
        .query('What tools can you use?')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          allowedTools: [],
          deniedTools: expect.arrayContaining(['Read', 'Write', 'Edit', 'Bash'])
        })
      );
    });

    it('should restrict specific tools', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'I can only read files' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .allowTools('Read', 'LS')
        .query('What can you do?')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          allowedTools: ['Read', 'LS']
        })
      );
    });

    it('should handle MCP server permissions', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'MCP permissions configured' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .withMCPServerPermission('file-system', 'whitelist')
        .withMCPServerPermission('database', 'blacklist')
        .withMCPServerPermissions({
          'api-gateway': 'ask',
          'cache-server': 'whitelist'
        })
        .query('Test MCP permissions')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          mcpServerPermissions: {
            'file-system': 'whitelist',
            'database': 'blacklist',
            'api-gateway': 'ask',
            'cache-server': 'whitelist'
          }
        })
      );
    });
  });

  describe('Response Parsing and Filtering', () => {
    it('should extract text content', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'First part. ' },
            { type: 'text', text: 'Second part.' }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      const text = await claude()
        .query('Get text')
        .asText();
      
      expect(text).toBe('First part. \nSecond part.');
    });

    it('should parse JSON from response', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{
            type: 'text',
            text: 'Here is the data:\n```json\n{"name": "test", "value": 42}\n```'
          }]
        };
        yield { type: 'result', content: 'done' };
      });

      const json = await claude()
        .query('Get JSON')
        .asJSON();
      
      expect(json).toEqual({ name: 'test', value: 42 });
    });

    it('should extract tool executions', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'read-1',
              name: 'Read',
              input: { file_path: '/config.json' }
            },
            {
              type: 'tool_result',
              tool_use_id: 'read-1',
              content: '{"setting": "value"}'
            },
            {
              type: 'tool_use',
              id: 'write-1',
              name: 'Write',
              input: { file_path: '/output.json', content: '{"result": true}' }
            },
            {
              type: 'tool_result',
              tool_use_id: 'write-1',
              content: 'File written'
            }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      const executions = await claude()
        .query('Process files')
        .asToolExecutions();
      
      expect(executions).toHaveLength(2);
      expect(executions[0]).toEqual({
        tool: 'Read',
        input: { file_path: '/config.json' },
        result: '{"setting": "value"}',
        isError: false
      });
      expect(executions[1]).toEqual({
        tool: 'Write',
        input: { file_path: '/output.json', content: '{"result": true}' },
        result: 'File written',
        isError: false
      });
    });

    it('should find specific tool results', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: 'grep-1', name: 'Grep', input: { pattern: 'test' } },
            { type: 'tool_result', tool_use_id: 'grep-1', content: 'Found 3 matches' },
            { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: '/test.txt' } },
            { type: 'tool_result', tool_use_id: 'read-1', content: 'File contents' },
            { type: 'tool_use', id: 'grep-2', name: 'Grep', input: { pattern: 'error' } },
            { type: 'tool_result', tool_use_id: 'grep-2', content: 'Found 0 matches' }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      const parser = claude().query('Search files');
      
      const grepResults = await parser.findToolResults('Grep');
      const readResult = await parser.findToolResult('Read');
      
      expect(grepResults).toHaveLength(2);
      expect(grepResults[0]).toBe('Found 3 matches');
      expect(grepResults[1]).toBe('Found 0 matches');
      expect(readResult).toBe('File contents');
    });

    it('should extract usage statistics', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: [{ type: 'text', text: 'Response' }] };
        yield {
          type: 'result',
          content: 'done',
          usage: {
            input_tokens: 150,
            output_tokens: 200,
            cache_read_input_tokens: 50,
            cache_creation_input_tokens: 100
          },
          cost: {
            total_cost: 0.0015
          }
        };
      });

      const parser = claude().query('Test usage');
      await parser.asText();
      
      const usage = await parser.getUsage();
      
      expect(usage).toEqual({
        inputTokens: 150,
        outputTokens: 200,
        cacheReadTokens: 50,
        cacheCreationTokens: 100,
        totalTokens: 350,
        totalCost: 0.0015
      });
    });

    it('should collect error messages', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'system',
          subtype: 'error',
          data: { message: 'Permission denied' }
        };
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Trying alternative...' },
            { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: '/secure.txt' } },
            { type: 'tool_result', tool_use_id: 'read-1', content: 'Access denied', is_error: true }
          ]
        };
        yield { type: 'result', content: 'partial' };
      });

      const parser = claude().query('Test errors');
      await parser.asArray();
      
      const errors = await parser.getErrors();
      
      expect(errors).toHaveLength(2);
      expect(errors[0]).toBe('Permission denied');
      expect(errors[1]).toContain('Tool Read failed');
    });
  });

  describe('Message Handlers and Streaming', () => {
    it('should handle message callbacks', async () => {
      const messages: any[] = [];
      const assistantTexts: string[] = [];

      mockQuery.mockImplementation(async function* () {
        yield { type: 'system', subtype: 'init' };
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'First message' }]
        };
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Second message' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .onMessage(msg => messages.push(msg))
        .onAssistant(content => {
          content.forEach(c => {
            if (c.type === 'text') assistantTexts.push(c.text);
          });
        })
        .query('Stream messages')
        .stream(async (msg) => {
          // Additional processing if needed
        });
      
      expect(messages).toHaveLength(4);
      expect(assistantTexts).toEqual(['First message', 'Second message']);
    });

    it('should handle tool use callbacks', async () => {
      const toolUses: any[] = [];

      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: '/test.txt' } },
            { type: 'tool_result', tool_use_id: 'read-1', content: 'Contents' },
            { type: 'tool_use', id: 'write-1', name: 'Write', input: { file_path: '/out.txt', content: 'Data' } },
            { type: 'tool_result', tool_use_id: 'write-1', content: 'Written' }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .onToolUse(tool => toolUses.push(tool))
        .query('Process files')
        .asResult();
      
      expect(toolUses).toHaveLength(2);
      expect(toolUses[0]).toEqual({ name: 'Read', input: { file_path: '/test.txt' } });
      expect(toolUses[1]).toEqual({ name: 'Write', input: { file_path: '/out.txt', content: 'Data' } });
    });
  });

  describe('Configuration and Roles', () => {
    it('should apply configuration object', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Config applied' }]
        };
        yield { type: 'result', content: 'done' };
      });

      const config = {
        version: '1.0',
        globalSettings: {
          model: 'sonnet',
          timeout: 30000
        },
        tools: {
          allowed: ['Read', 'Write'],
          denied: ['Bash']
        },
        mcpServers: {
          'file-system': { defaultPermission: 'allow' }
        }
      };

      await claude()
        .withConfig(config)
        .query('Test config')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'sonnet',
          timeout: 30000,
          allowedTools: ['Read', 'Write'],
          deniedTools: ['Bash'],
          mcpServerPermissions: {
            'file-system': 'whitelist'
          }
        })
      );
    });

    it('should apply role with template variables', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Analyzing data' }]
        };
        yield { type: 'result', content: 'done' };
      });

      const role = {
        name: 'analyst',
        model: 'opus',
        permissions: {
          mode: 'acceptEdits' as const,
          tools: {
            allowed: ['Read', 'Query']
          }
        },
        promptingTemplate: 'You are a ${specialty} analyst working on ${project}.',
        systemPrompt: 'Always provide data-driven insights.'
      };

      await claude()
        .withRole(role, { specialty: 'financial', project: 'Q4 report' })
        .query('Analyze revenue')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        'Always provide data-driven insights.\n\nYou are a financial analyst working on Q4 report.\n\nAnalyze revenue',
        expect.objectContaining({
          model: 'opus',
          permissionMode: 'acceptEdits',
          allowedTools: ['Read', 'Query'],
          systemPrompt: 'Always provide data-driven insights.'
        })
      );
    });
  });

  describe('Advanced Features', () => {
    it('should support model and permission settings', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{ type: 'text', text: 'Settings applied' }]
        };
        yield { type: 'result', content: 'done' };
      });

      await claude()
        .withModel('opus')
        .withTimeout(60000)
        .skipPermissions()
        .debug(true)
        .inDirectory('/project')
        .withEnv({ API_KEY: 'test-key' })
        .query('Test settings')
        .asText();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'opus',
          timeout: 60000,
          permissionMode: 'bypassPermissions',
          debug: true,
          cwd: '/project',
          env: expect.objectContaining({ API_KEY: 'test-key' })
        })
      );
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();
      let aborted = false;

      mockQuery.mockImplementation(async function* () {
        // Check for abort
        if (controller.signal.aborted) {
          aborted = true;
          throw new Error('Aborted');
        }
        yield { type: 'assistant', content: [{ type: 'text', text: 'Starting...' }] };
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (controller.signal.aborted) {
          aborted = true;
          throw new Error('Aborted');
        }
        yield { type: 'result', content: 'done' };
      });

      const promise = claude()
        .withSignal(controller.signal)
        .query('Long operation')
        .asText();
      
      // Abort after short delay
      setTimeout(() => controller.abort(), 50);
      
      await expect(promise).rejects.toThrow('Aborted');
      expect(aborted).toBe(true);
    });

    it('should check success status', async () => {
      // Success case
      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: '/test.txt' } },
            { type: 'tool_result', tool_use_id: 'read-1', content: 'Success' }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      const parser1 = claude().query('Successful operation');
      await parser1.asArray();
      expect(await parser1.succeeded()).toBe(true);

      // Failure case
      mockQuery.mockImplementationOnce(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: 'write-1', name: 'Write', input: { file_path: '/readonly.txt' } },
            { type: 'tool_result', tool_use_id: 'write-1', content: 'Permission denied', is_error: true }
          ]
        };
        yield { type: 'result', content: 'done' };
      });

      const parser2 = claude().query('Failed operation');
      await parser2.asArray();
      expect(await parser2.succeeded()).toBe(false);
    });

    it('should transform messages with custom transformer', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: [{ type: 'text', text: 'Message 1' }] };
        yield { type: 'assistant', content: [{ type: 'text', text: 'Message 2' }] };
        yield { type: 'result', content: 'done' };
      });

      const summary = await claude()
        .query('Generate messages')
        .transform(messages => ({
          totalMessages: messages.length,
          assistantMessages: messages.filter(m => m.type === 'assistant').length,
          hasResult: messages.some(m => m.type === 'result')
        }));
      
      expect(summary).toEqual({
        totalMessages: 3,
        assistantMessages: 2,
        hasResult: true
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow with session, permissions, and tools', async () => {
      const sessionId = 'workflow-session-' + Date.now();
      const events: any[] = [];

      // Mock complex workflow
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'system',
          subtype: 'session',
          data: { session_id: sessionId },
          session_id: sessionId
        };
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Starting analysis...' },
            { type: 'tool_use', id: 'read-1', name: 'Read', input: { file_path: '/data.csv' } }
          ]
        };
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_result', tool_use_id: 'read-1', content: 'CSV data loaded' }
          ]
        };
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Analysis complete: Revenue increased by 15%' }
          ]
        };
        yield {
          type: 'result',
          content: 'done',
          usage: {
            input_tokens: 500,
            output_tokens: 800,
            cache_read_input_tokens: 200
          },
          session_id: sessionId
        };
      });

      // Configure comprehensive setup
      const result = await claude()
        .withModel('opus')
        .withSessionId(sessionId)
        .allowTools('Read', 'Query')
        .withMCPServerPermission('database', 'whitelist')
        .onMessage(msg => events.push({ type: msg.type }))
        .onToolUse(tool => events.push({ type: 'tool_use', tool: tool.name }))
        .debug(true)
        .query('Analyze Q4 revenue data')
        .asText();

      // Verify results
      expect(result).toContain('Revenue increased by 15%');
      expect(events.some(e => e.type === 'tool_use' && e.tool === 'Read')).toBe(true);
      
      // Verify configuration was applied
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          model: 'opus',
          sessionId,
          allowedTools: ['Read', 'Query'],
          mcpServerPermissions: { database: 'whitelist' },
          debug: true
        })
      );
    });
  });
});