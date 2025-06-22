import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claude, query, ConsoleLogger, JSONLogger, LogLevel } from '../src/index.js';
import type { Message } from '../src/types.js';
import * as baseModule from '../src/index.js';

// Mock the base query function
vi.mock('../src/index.js', async () => {
  const actual = await vi.importActual('../src/index.js');
  return {
    ...actual,
    query: vi.fn()
  };
});

describe('Fluent API Integration Tests', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery = vi.mocked(baseModule.query);
  });

  describe('End-to-End Scenarios', () => {
    it('should handle complete file operation workflow', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'I\'ll create the config file for you.' },
            {
              type: 'tool_use',
              id: 'write-1',
              name: 'Write',
              input: { path: 'config.json', content: '{"version": "1.0.0"}' }
            },
            {
              type: 'tool_result',
              tool_use_id: 'write-1',
              content: 'File created successfully'
            }
          ]
        };
        yield {
          type: 'result',
          content: 'Created config.json with version 1.0.0',
          usage: { input_tokens: 50, output_tokens: 100 },
          cost: { total_cost: 0.0015 }
        };
      });

      const result = await claude()
        .allowTools('Write')
        .skipPermissions()
        .inDirectory('/project')
        .query('Create a config.json file')
        .asResult();

      expect(result).toBe('Created config.json with version 1.0.0');
      expect(mockQuery).toHaveBeenCalledWith(
        'Create a config.json file',
        expect.objectContaining({
          allowedTools: ['Write'],
          permissionMode: 'bypassPermissions',
          cwd: '/project'
        })
      );
    });

    it('should handle streaming with real-time processing', async () => {
      const messages: Message[] = [
        { type: 'assistant', content: [{ type: 'text', text: 'First...' }] },
        { type: 'assistant', content: [{ type: 'text', text: 'Second...' }] },
        { type: 'assistant', content: [{ type: 'text', text: 'Third!' }] },
        { type: 'result', content: 'Streamed successfully' }
      ];

      mockQuery.mockImplementation(async function* () {
        for (const msg of messages) {
          yield msg;
        }
      });

      const streamedText: string[] = [];
      const messageTypes: string[] = [];

      await claude()
        .onMessage(msg => messageTypes.push(msg.type))
        .query('Stream some text')
        .stream(async (msg) => {
          if (msg.type === 'assistant') {
            const text = msg.content
              .filter(b => b.type === 'text')
              .map(b => (b as any).text)
              .join('');
            streamedText.push(text);
          }
        });

      expect(streamedText).toEqual(['First...', 'Second...', 'Third!']);
      expect(messageTypes).toEqual(['assistant', 'assistant', 'assistant', 'result']);
    });

    it('should extract and transform JSON data', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [{
            type: 'text',
            text: `Here's the user data:
\`\`\`json
{
  "users": [
    {"id": 1, "name": "Alice", "role": "admin"},
    {"id": 2, "name": "Bob", "role": "user"}
  ],
  "total": 2
}
\`\`\``
          }]
        };
      });

      const data = await claude()
        .skipPermissions()
        .query('Generate user data')
        .asJSON<{ users: Array<{ id: number; name: string; role: string }>; total: number }>();

      expect(data).toEqual({
        users: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' }
        ],
        total: 2
      });
    });

    it('should handle complex tool execution analysis', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'text', text: 'Searching for files...' },
            { type: 'tool_use', id: '1', name: 'Glob', input: { pattern: '*.ts' } },
            { type: 'tool_result', tool_use_id: '1', content: ['file1.ts', 'file2.ts'] },
            { type: 'tool_use', id: '2', name: 'Read', input: { path: 'file1.ts' } },
            { type: 'tool_result', tool_use_id: '2', content: 'const x = 1;' },
            { type: 'tool_use', id: '3', name: 'Read', input: { path: 'file2.ts' } },
            { type: 'tool_result', tool_use_id: '3', content: 'const y = 2;' }
          ]
        };
      });

      const executions = await claude()
        .allowTools('Glob', 'Read')
        .query('Read all TypeScript files')
        .asToolExecutions();

      expect(executions).toHaveLength(3);
      expect(executions[0]).toEqual({
        tool: 'Glob',
        input: { pattern: '*.ts' },
        result: ['file1.ts', 'file2.ts'],
        isError: false
      });

      // Extract just Read results
      const parser = claude()
        .allowTools('Glob', 'Read')
        .query('Read all TypeScript files');

      const fileContents = await parser.findToolResults('Read');
      expect(fileContents).toEqual(['const x = 1;', 'const y = 2;']);
    });

    it('should integrate logging throughout the flow', async () => {
      const logs: any[] = [];
      const customLogger = new JSONLogger(LogLevel.DEBUG, (json) => {
        logs.push(JSON.parse(json));
      });

      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: [{ type: 'text', text: 'Hello' }] };
        yield { type: 'result', content: 'Done' };
      });

      await claude()
        .withLogger(customLogger)
        .debug(true)
        .query('Test with logging')
        .asText();

      // Should have logged: start, messages, completion
      expect(logs.some(log => log.message === 'Starting query')).toBe(true);
      expect(logs.some(log => log.message === 'Consuming message generator')).toBe(true);
      expect(logs.some(log => log.message === 'Query completed')).toBe(true);
    });

    it('should handle error scenarios gracefully', async () => {
      mockQuery.mockImplementation(async function* () {
        yield {
          type: 'assistant',
          content: [
            { type: 'tool_use', id: '1', name: 'Write', input: { path: '/root/file' } },
            { type: 'tool_result', tool_use_id: '1', content: 'Permission denied', is_error: true }
          ]
        };
        yield { type: 'system', subtype: 'error', data: { message: 'Operation failed' } };
        yield { type: 'result', content: 'Failed to complete' };
      });

      const parser = claude()
        .allowTools('Write')
        .query('Try to write to system file');

      const success = await parser.succeeded();
      const errors = await parser.getErrors();

      expect(success).toBe(false);
      expect(errors).toContain('Tool Write failed: Permission denied');
      expect(errors).toContain('Operation failed');
    });

    it('should chain multiple queries', async () => {
      let callCount = 0;
      mockQuery.mockImplementation(async function* () {
        callCount++;
        if (callCount === 1) {
          yield { type: 'assistant', content: [{ type: 'text', text: 'Analysis: 3 files found' }] };
        } else {
          yield { type: 'assistant', content: [{ type: 'text', text: 'Summary: All files processed' }] };
        }
        yield { type: 'result', content: 'Done' };
      });

      // First query
      const analysis = await claude()
        .skipPermissions()
        .query('Analyze project')
        .asText();

      // Second query based on first
      const summary = await claude()
        .skipPermissions()
        .query(`Based on this analysis: "${analysis}", create a summary`)
        .asText();

      expect(analysis).toBe('Analysis: 3 files found');
      expect(summary).toBe('Summary: All files processed');
      expect(callCount).toBe(2);
    });

    it('should handle custom transformations', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'user', content: 'List programming languages' };
        yield {
          type: 'assistant',
          content: [{
            type: 'text',
            text: '1. Python: Web development and data science\n2. JavaScript: Frontend and backend\n3. Rust: Systems programming'
          }]
        };
        yield { type: 'result', content: 'Listed 3 languages' };
      });

      const summary = await claude()
        .query('List programming languages')
        .transform(messages => {
          const assistantMsg = messages.find(m => m.type === 'assistant');
          if (!assistantMsg || assistantMsg.type !== 'assistant') return { languages: [] };

          const text = assistantMsg.content
            .filter(b => b.type === 'text')
            .map(b => (b as any).text)
            .join('');

          const languages = text.split('\n')
            .filter(line => line.match(/^\d+\./))
            .map(line => {
              const match = line.match(/^\d+\.\s*(\w+):\s*(.+)$/);
              return match ? { name: match[1], use: match[2] } : null;
            })
            .filter(Boolean);

          return {
            languages,
            count: languages.length,
            timestamp: new Date().toISOString()
          };
        });

      expect(summary.languages).toHaveLength(3);
      expect(summary.languages[0]).toEqual({
        name: 'Python',
        use: 'Web development and data science'
      });
    });

    it('should support all builder methods in complex chains', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'result', content: 'Complex query executed' };
      });

      const messageHandler = vi.fn();
      const assistantHandler = vi.fn();
      const toolHandler = vi.fn();
      const logger = new ConsoleLogger(LogLevel.INFO);

      const result = await claude()
        // Model configuration
        .withModel('opus')
        .withTimeout(30000)
        .debug(false)
        // Tool configuration
        .allowTools('Read', 'Write')
        .denyTools('Bash')
        // Permissions
        .acceptEdits()
        // Environment
        .inDirectory('/workspace')
        .withEnv({ NODE_ENV: 'production' })
        // MCP
        .withMCP({ command: 'mcp-test' })
        // Logging
        .withLogger(logger)
        // Event handlers
        .onMessage(messageHandler)
        .onAssistant(assistantHandler)
        .onToolUse(toolHandler)
        // Execute
        .query('Complex operation')
        .asResult();

      expect(result).toBe('Complex query executed');
      expect(mockQuery).toHaveBeenCalledWith('Complex operation', {
        model: 'opus',
        timeout: 30000,
        debug: false,
        allowedTools: ['Read', 'Write'],
        deniedTools: ['Bash'],
        permissionMode: 'acceptEdits',
        cwd: '/workspace',
        env: { NODE_ENV: 'production' },
        mcpServers: [{ command: 'mcp-test' }]
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support original query function', async () => {
      // Restore original query for this test
      // const originalQuery = (await vi.importActual('../src/index.js') as any).query;
      
      // The original query function should still be exported
      expect(query).toBeDefined();
      expect(typeof query).toBe('function');
    });

    it('should allow mixing old and new APIs', async () => {
      mockQuery.mockImplementation(async function* () {
        yield { type: 'assistant', content: [{ type: 'text', text: 'Response' }] };
      });

      // Use old API to get generator
      const generator = query('Test prompt', { model: 'sonnet' });

      // Can still iterate manually
      const messages: Message[] = [];
      for await (const msg of generator) {
        messages.push(msg);
      }

      expect(messages).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith('Test prompt', { model: 'sonnet' });
    });

    it('should maintain type compatibility', () => {
      // These should all compile without errors
      const testTypeCompat = async () => {
        // Old style
        const gen1: AsyncGenerator<Message> = query('test');
        
        // New style returning generator
        const builder = claude();
        const gen2: AsyncGenerator<Message> = builder.queryRaw('test');
        
        // Both should be assignable to same type
        void [gen1, gen2]; // Both assignable to same type
      };

      expect(testTypeCompat).toBeDefined();
    });
  });

  describe('Performance Considerations', () => {
    it('should not consume generator until needed', async () => {
      let generatorCalled = false;
      
      mockQuery.mockImplementation(async function* () {
        generatorCalled = true;
        yield { type: 'result', content: 'Done' };
      });

      // Create parser but don't consume
      const parser = claude().query('Test');
      
      expect(generatorCalled).toBe(false);
      
      // Now consume
      await parser.asText();
      
      expect(generatorCalled).toBe(true);
    });

    it('should handle large message streams efficiently', async () => {
      const messageCount = 1000;
      mockQuery.mockImplementation(async function* () {
        for (let i = 0; i < messageCount; i++) {
          yield {
            type: 'assistant',
            content: [{ type: 'text', text: `Message ${i}` }]
          };
        }
      });

      let processedCount = 0;
      await claude()
        .query('Generate many messages')
        .stream(async (msg) => {
          if (msg.type === 'assistant') {
            processedCount++;
          }
        });

      expect(processedCount).toBe(messageCount);
    });
  });
});