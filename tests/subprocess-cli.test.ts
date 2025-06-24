import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubprocessCLITransport } from '../src/_internal/transport/subprocess-cli.js';
import { CLIConnectionError, CLINotFoundError, CLIJSONDecodeError } from '../src/errors.js';
import { execa } from 'execa';
import which from 'which';
import { Readable, Writable } from 'node:stream';
import type { ExecaChildProcess } from 'execa';

vi.mock('execa');
vi.mock('which');
vi.mock('node:fs/promises', () => ({
  access: vi.fn().mockRejectedValue(new Error('Not found')),
  constants: { X_OK: 1 }
}));

describe('SubprocessCLITransport', () => {
  let mockProcess: Partial<ExecaChildProcess>;
  let stdoutStream: Readable;
  let stderrStream: Readable;
  let stdinStream: Writable;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create proper streams
    stdoutStream = new Readable({
      read() {}
    });
    
    stderrStream = new Readable({
      read() {}
    });
    
    // Create a proper writable stream for stdin with spies
    const writeData: any[] = [];
    stdinStream = new Writable({
      write(chunk, encoding, callback) {
        writeData.push(chunk);
        if (callback) callback();
      },
      final(callback) {
        if (callback) callback();
      }
    });
    
    // Add spies to the stream methods
    stdinStream.write = vi.fn((chunk: any, encoding?: any, callback?: any) => {
      writeData.push(chunk);
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = undefined;
      }
      if (callback) callback();
      return true;
    });
    stdinStream.end = vi.fn((chunk?: any, encoding?: any, callback?: any) => {
      if (chunk) writeData.push(chunk);
      if (typeof chunk === 'function') {
        callback = chunk;
        chunk = undefined;
      } else if (typeof encoding === 'function') {
        callback = encoding;
        encoding = undefined;
      }
      if (callback) callback();
      return stdinStream;
    });
    
    // Mock the process object
    mockProcess = {
      stdout: stdoutStream,
      stderr: stderrStream,
      stdin: stdinStream,
      cancel: vi.fn(),
      kill: vi.fn(),
      pid: 12345,
      exitCode: null,
      then: vi.fn((onfulfilled) => {
        // Simulate successful process completion
        if (onfulfilled) onfulfilled({ exitCode: 0 });
        return Promise.resolve({ exitCode: 0 });
      }),
      catch: vi.fn()
    } as any;
    
    // Set up default mock behavior
    vi.mocked(which as any).mockResolvedValue('/usr/local/bin/claude-code');
    vi.mocked(execa).mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    stdoutStream.destroy();
    stderrStream.destroy();
    stdinStream.destroy();
  });

  describe('findCLI', () => {
    it('should find CLI in PATH', async () => {
      // Mock fs access to fail for local paths
      const { access } = await import('node:fs/promises');
      vi.mocked(access).mockRejectedValue(new Error('Not found'));
      
      // Mock which to find claude in PATH
      vi.mocked(which as any).mockResolvedValue('/usr/bin/claude');
      
      const transport = new SubprocessCLITransport('test prompt');
      await transport.connect();
      
      expect(which).toHaveBeenCalledWith('claude');
    });

    it('should try common paths when not in PATH', async () => {
      // Mock fs access to fail for local paths
      const { access } = await import('node:fs/promises');
      vi.mocked(access).mockRejectedValue(new Error('Not found'));
      
      // Mock which to fail
      vi.mocked(which).mockRejectedValue(new Error('not found'));
      
      // Mock successful version check for a specific path
      vi.mocked(execa).mockImplementation((cmd: string, args?: any, _options?: any) => {
        if (cmd === '/usr/local/bin/claude' && args?.[0] === '--version') {
          return Promise.resolve({ 
            exitCode: 0, 
            stdout: 'claude version 1.0.0',
            stderr: '',
            failed: false,
            timedOut: false,
            isCanceled: false,
            killed: false
          } as any);
        }
        if (cmd === '/usr/local/bin/claude' && args?.includes('--output-format')) {
          return mockProcess as any;
        }
        throw new Error('Command failed');
      }) as any;

      const transport = new SubprocessCLITransport('test prompt');
      await transport.connect();

      expect(execa).toHaveBeenCalledWith('/usr/local/bin/claude', ['--version']);
    });

    it('should throw CLINotFoundError when CLI not found anywhere', async () => {
      // Mock fs access to fail for local paths
      const { access } = await import('node:fs/promises');
      vi.mocked(access).mockRejectedValue(new Error('Not found'));
      
      vi.mocked(which).mockRejectedValue(new Error('not found'));
      vi.mocked(execa).mockRejectedValue(new Error('Command failed'));

      const transport = new SubprocessCLITransport('test prompt');

      await expect(transport.connect()).rejects.toThrow(CLINotFoundError);
    });
  });

  describe('buildCommand', () => {
    it('should build basic command with prompt', async () => {
      const transport = new SubprocessCLITransport('test prompt');
      await transport.connect();

      expect(execa).toHaveBeenLastCalledWith(
        expect.any(String),
        ['--output-format', 'stream-json', '--verbose', '--print'],
        expect.objectContaining({
          stdin: 'pipe',
          stdout: 'pipe',
          stderr: 'pipe',
          buffer: false
        })
      );
    });

    it('should include all options in command', async () => {
      const transport = new SubprocessCLITransport('test prompt', {
        model: 'claude-3',
        allowedTools: ['Bash'],
        deniedTools: ['WebSearch'],
        mcpServers: [
          { command: 'server1', args: ['--port', '3000'] },
          { command: 'server2' }
        ],
        context: ['file1.txt', 'file2.txt'],
        temperature: 0.7,
        maxTokens: 1000
      });

      await transport.connect();

      const lastCall = vi.mocked(execa).mock.lastCall;
      expect(lastCall?.[1]).toContain('--model');
      expect(lastCall?.[1]).toContain('claude-3');
      expect(lastCall?.[1]).toContain('--allowedTools');
      expect(lastCall?.[1]).toContain('Bash');
      expect(lastCall?.[1]).toContain('--disallowedTools');
      expect(lastCall?.[1]).toContain('WebSearch');
      expect(lastCall?.[1]).toContain('--mcp-config');
      expect(lastCall?.[1]).toContain('--context');
      expect(lastCall?.[1]).toContain('file1.txt');
      expect(lastCall?.[1]).toContain('file2.txt');
      expect(lastCall?.[1]).toContain('--temperature');
      expect(lastCall?.[1]).toContain('0.7');
      expect(lastCall?.[1]).toContain('--max-tokens');
      expect(lastCall?.[1]).toContain('1000');
    });

    it('should handle empty options', async () => {
      const transport = new SubprocessCLITransport('test prompt', {});
      await transport.connect();

      const lastCall = vi.mocked(execa).mock.lastCall;
      expect(lastCall?.[1]).toEqual(['--output-format', 'stream-json', '--verbose', '--print']);
    });

    it('should handle special characters in prompt', async () => {
      const specialPrompt = 'Test with "quotes" and \'apostrophes\' and \n newlines';
      const transport = new SubprocessCLITransport(specialPrompt);
      await transport.connect();

      expect(stdinStream.write).toHaveBeenCalledWith(specialPrompt);
      expect(stdinStream.end).toHaveBeenCalled();
    });
  });

  describe('receiveMessages', () => {
    it('should receive and parse messages', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      const messages: any[] = [];
      const receiverPromise = (async () => {
        for await (const msg of transport.receiveMessages()) {
          messages.push(msg);
        }
      })();

      // Emit test data
      stdoutStream.push('{"type":"assistant","content":"Hello"}\n');
      stdoutStream.push('{"type":"result","content":"Done"}\n');
      stdoutStream.push(null); // End stream

      await receiverPromise;

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({ type: 'assistant', content: 'Hello' });
      expect(messages[1]).toEqual({ type: 'result', content: 'Done' });
    });

    it('should handle CLI errors', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      const messages: any[] = [];
      const receiverPromise = (async () => {
        for await (const msg of transport.receiveMessages()) {
          messages.push(msg);
        }
      })();

      // Emit error message
      stdoutStream.push('{"type":"error","error":{"message":"Something went wrong"}}\n');
      stdoutStream.push(null);

      await receiverPromise;

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'error',
        error: { message: 'Something went wrong' }
      });
    });

    it('should handle stderr messages', async () => {
      const transport = new SubprocessCLITransport('test', { debug: true });
      await transport.connect();

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Start receiving messages to set up stderr handler
      const messages: any[] = [];
      const receiverPromise = (async () => {
        for await (const msg of transport.receiveMessages()) {
          messages.push(msg);
        }
      })();

      // Now push stderr data
      stderrStream.push('Error: Something bad happened\n');
      stderrStream.push('Another error line\n');

      // Give time for event handlers to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // End the stdout stream to complete the test
      stdoutStream.push(null);
      await receiverPromise;

      expect(consoleErrorSpy).toHaveBeenCalledWith('DEBUG stderr:', 'Error: Something bad happened');
      expect(consoleErrorSpy).toHaveBeenCalledWith('DEBUG stderr:', 'Another error line');

      consoleErrorSpy.mockRestore();
    });

    it('should handle invalid JSON', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      const messages: any[] = [];
      const errors: any[] = [];
      const receiverPromise = (async () => {
        try {
          for await (const msg of transport.receiveMessages()) {
            messages.push(msg);
          }
        } catch (error) {
          errors.push(error);
        }
      })();

      // Emit non-JSON line (will be skipped)
      stdoutStream.push('Not valid JSON\n');
      // Emit valid JSON
      stdoutStream.push('{"valid":"json"}\n');
      // Emit invalid JSON that starts with '{' (will throw)
      stdoutStream.push('{invalid json}\n');
      stdoutStream.push(null);

      await receiverPromise;

      // Non-JSON lines are skipped, valid JSON is parsed
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ valid: 'json' });
      // Invalid JSON that looks like JSON throws an error
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBeInstanceOf(CLIJSONDecodeError);
    });

    it('should skip non-JSON lines', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      const messages: any[] = [];
      const receiverPromise = (async () => {
        for await (const msg of transport.receiveMessages()) {
          messages.push(msg);
        }
      })();

      // Emit non-JSON line that doesn't look like JSON
      stdoutStream.push('FATAL ERROR: Invalid JSON\n');
      // Emit valid JSON
      stdoutStream.push('{"type":"result","content":"Done"}\n');
      stdoutStream.push(null);

      await receiverPromise;

      // Non-JSON lines are skipped
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ type: 'result', content: 'Done' });
    });
  });

  describe('disconnect', () => {
    it('should disconnect properly', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      await transport.disconnect();

      expect(mockProcess.cancel).toHaveBeenCalled();
    });

    it('should handle process exit', async () => {
      const transport = new SubprocessCLITransport('test');
      await transport.connect();

      // Simulate process exit
      const messages: any[] = [];
      const receiverPromise = (async () => {
        for await (const msg of transport.receiveMessages()) {
          messages.push(msg);
        }
      })();

      stdoutStream.push(null); // End stream
      await receiverPromise;

      // Should complete without error
      expect(messages).toHaveLength(0);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      const transport = new SubprocessCLITransport('test prompt');
      await expect(transport.connect()).resolves.not.toThrow();
      
      expect(execa).toHaveBeenCalled();
      expect(stdinStream.write).toHaveBeenCalledWith('test prompt');
      expect(stdinStream.end).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      vi.mocked(execa).mockImplementation(() => {
        throw new Error('Failed to start process');
      });

      const transport = new SubprocessCLITransport('test');
      await expect(transport.connect()).rejects.toThrow(CLIConnectionError);
    });
  });
});