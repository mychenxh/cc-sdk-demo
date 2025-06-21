import { execa, type ExecaChildProcess } from 'execa';
import which from 'which';
import { createInterface } from 'node:readline';
import { platform } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { CLIConnectionError, CLINotFoundError, ProcessError, CLIJSONDecodeError } from '../../errors.js';
import type { ClaudeCodeOptions, CLIOutput } from '../../types.js';

export class SubprocessCLITransport {
  private process?: ExecaChildProcess;
  private options: ClaudeCodeOptions;
  private prompt: string;

  constructor(prompt: string, options: ClaudeCodeOptions = {}) {
    this.prompt = prompt;
    this.options = options;
  }

  private async findCLI(): Promise<string> {
    // First, try to find in PATH
    try {
      return await which('claude-code');
    } catch {
      // Not found in PATH, continue to check other locations
    }

    // Common installation paths to check
    const paths: string[] = [];
    const isWindows = platform() === 'win32';
    const home = homedir();

    if (isWindows) {
      paths.push(
        join(home, 'AppData', 'Local', 'Programs', 'claude-code', 'claude-code.exe'),
        'C:\\Program Files\\claude-code\\claude-code.exe'
      );
    } else {
      paths.push(
        '/usr/local/bin/claude-code',
        '/usr/bin/claude-code',
        '/opt/homebrew/bin/claude-code',
        join(home, '.local', 'bin', 'claude-code'),
        join(home, 'bin', 'claude-code')
      );
    }

    // Try global npm/yarn paths
    try {
      const { stdout: npmPrefix } = await execa('npm', ['config', 'get', 'prefix']);
      if (npmPrefix) {
        paths.push(join(npmPrefix.trim(), 'bin', 'claude-code'));
      }
    } catch {
      // Ignore error and continue
    }

    // Check each path
    for (const path of paths) {
      try {
        await execa(path, ['--version']);
        return path;
      } catch {
      // Ignore error and continue
    }
    }

    throw new CLINotFoundError();
  }

  private buildCommand(): string[] {
    const args: string[] = [this.prompt, '--output-format', 'json'];

    if (this.options.model) args.push('--model', this.options.model);
    if (this.options.apiKey) args.push('--api-key', this.options.apiKey);
    if (this.options.baseUrl) args.push('--base-url', this.options.baseUrl);
    if (this.options.maxTokens) args.push('--max-tokens', this.options.maxTokens.toString());
    if (this.options.temperature) args.push('--temperature', this.options.temperature.toString());
    if (this.options.timeout) args.push('--timeout', this.options.timeout.toString());
    if (this.options.debug) args.push('--debug');

    // Handle tools
    if (this.options.tools && this.options.tools.length > 0) {
      args.push('--tools', this.options.tools.join(','));
    }
    if (this.options.allowedTools && this.options.allowedTools.length > 0) {
      args.push('--allowed-tools', this.options.allowedTools.join(','));
    }
    if (this.options.deniedTools && this.options.deniedTools.length > 0) {
      args.push('--denied-tools', this.options.deniedTools.join(','));
    }

    // Handle permission mode
    if (this.options.permissionMode) {
      args.push('--permission-mode', this.options.permissionMode);
    }

    // Handle context files
    if (this.options.context && this.options.context.length > 0) {
      for (const ctx of this.options.context) {
        args.push('--context', ctx);
      }
    }

    // Handle MCP servers
    if (this.options.mcpServers && this.options.mcpServers.length > 0) {
      for (const server of this.options.mcpServers) {
        const serverStr = server.args 
          ? `${server.command} ${server.args.join(' ')}`
          : server.command;
        args.push('--mcp-server', serverStr);
      }
    }

    return args;
  }

  async connect(): Promise<void> {
    const cliPath = await this.findCLI();
    const args = this.buildCommand();

    const env = {
      ...process.env,
      ...this.options.env,
      CLAUDE_CODE_ENTRYPOINT: 'sdk-ts'
    };

    try {
      this.process = execa(cliPath, args, {
        env,
        cwd: this.options.cwd,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        buffer: false
      });
    } catch (error) {
      throw new CLIConnectionError(`Failed to start Claude Code CLI: ${error}`);
    }
  }

  async *receiveMessages(): AsyncGenerator<CLIOutput> {
    if (!this.process || !this.process.stdout) {
      throw new CLIConnectionError('Not connected to CLI');
    }

    const rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    try {
      for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as CLIOutput;
          yield parsed;
          
          if (parsed.type === 'end') {
            break;
          }
        } catch (error) {
          throw new CLIJSONDecodeError(
            `Failed to parse CLI output: ${error}`,
            trimmed
          );
        }
      }
    } finally {
      rl.close();
    }

    // Wait for process to exit
    try {
      await this.process;
    } catch (error) {
      if (error.exitCode !== 0) {
        throw new ProcessError(
          `Claude Code CLI exited with code ${error.exitCode}`,
          error.exitCode,
          error.signal
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.cancel();
      this.process = undefined;
    }
  }
}